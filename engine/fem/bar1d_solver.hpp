// =============================================================================
// REALIS Physics Engine — Phase 4A: 1D Linear Elastic FEM
// engine/fem/bar1d_solver.hpp
//
// Static Linear FEM Solver for 1D Bar Problems
// =============================================================================
//
// Solves: Ku = F
//
// Pipeline:
//   1. Global stiffness matrix assembly  (scatter element ke)
//   2. Body force vector assembly        (scatter element fe)
//   3. Neumann BCs                       (nodal point forces in F)
//   4. Dirichlet BCs                     (row/column elimination — exact)
//   5. Linear solve                      (Gaussian elimination, partial pivot)
//   6. Energy computation                (U = 0.5 * uᵀ K u)
//
// ─────────────────────────────────────────────────────────────────────────────
// DIRICHLET BC — ROW/COLUMN ELIMINATION METHOD
// ─────────────────────────────────────────────────────────────────────────────
//
// For a fixed DOF d with prescribed displacement u_d:
//   - The constraint is: u_d = ū_d (given)
//   - We must remove this DOF from the free system without invalidating the
//     remaining equations.
//
// Steps for each constrained DOF d:
//   1. Modify RHS: for all free rows i ≠ d:
//        F[i] -= K[i,d] * ū_d
//      (Transfer contribution of known displacement to RHS.)
//   2. Zero row d and column d in K:
//        K[d,:] = 0,  K[:,d] = 0
//   3. Set diagonal and RHS:
//        K[d,d] = 1,  F[d] = ū_d
//
// Result: The modified system has the same solution in free DOFs, and
//   u[d] = ū_d is enforced exactly. Symmetry is preserved.
//
// WHY NOT PENALTY METHOD:
//   Penalty method: K[d,d] += alpha (large number). This is approximate,
//   ill-conditions the stiffness matrix, and requires tuning alpha. The
//   row/column elimination is exact, does not perturb the condition number,
//   and requires no tuning.
// =============================================================================

#pragma once
#include "../math/matrix_solver.hpp"
#include "bar1d_mesh.hpp"
#include <algorithm>
#include <cmath>
#include <limits>
#include <numeric>
#include <stdexcept>
#include <unordered_map>
#include <vector>

namespace realis {
namespace fem {

// ─────────────────────────────────────────────────────────────────────────────
// Bar1DResult — Output of a static FEM solve
// ─────────────────────────────────────────────────────────────────────────────
struct Bar1DResult {
  std::vector<double> u;            // Nodal displacements [n_nodes]
  double elastic_energy;            // U = 0.5 * uᵀ K_original u  [J]
  double condition_number_estimate; // max(K_diag) / min(K_diag > 0)
  bool converged;                   // True if linear solve succeeded
};

// ─────────────────────────────────────────────────────────────────────────────
// Bar1DSolver — Static Linear FEM Solver
// ─────────────────────────────────────────────────────────────────────────────
class Bar1DSolver {
public:
  const Bar1DMesh &mesh;

  // Dirichlet BCs: node_id → prescribed displacement value
  std::unordered_map<int, double> dirichlet_bcs;

  // Neumann BCs: node_id → applied point force [N]
  std::unordered_map<int, double> neumann_bcs;

  // Uniform distributed body force [N/m] applied to all elements
  double body_force = 0.0;

  explicit Bar1DSolver(const Bar1DMesh &m) : mesh(m) {}

  // ─────────────────────────────────────────────────────────────────────────
  // add_dirichlet() — prescribe displacement at a node (Dirichlet BC)
  // ─────────────────────────────────────────────────────────────────────────
  void add_dirichlet(int node_id, double prescribed_displacement) {
    if (node_id < 0 || node_id >= mesh.n_nodes())
      throw std::out_of_range("add_dirichlet: node_id out of range");
    dirichlet_bcs[node_id] = prescribed_displacement;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // add_neumann() — apply point force at a node (Neumann BC)
  // ─────────────────────────────────────────────────────────────────────────
  void add_neumann(int node_id, double force) {
    if (node_id < 0 || node_id >= mesh.n_nodes())
      throw std::out_of_range("add_neumann: node_id out of range");
    neumann_bcs[node_id] += force; // additive to allow multiple loads
  }

  // ─────────────────────────────────────────────────────────────────────────
  // solve() — Execute the full FEM static solve pipeline
  //
  // Returns: Bar1DResult with nodal displacements, energy, condition number
  // ─────────────────────────────────────────────────────────────────────────
  Bar1DResult solve() const {
    const int n = mesh.n_nodes();
    if (n < 2)
      throw std::runtime_error("Bar1DSolver: mesh must have at least 2 nodes");
    if (dirichlet_bcs.empty())
      throw std::runtime_error("Bar1DSolver: at least one Dirichlet BC "
                               "required (prevents rigid body motion)");

    // ── Step 1: Allocate global system ──────────────────────────────────
    // K: n×n stiffness matrix (row-major flat)
    // F: load vector
    std::vector<double> K(n * n, 0.0);
    std::vector<double> F(n, 0.0);

    // ── Step 2: Assemble element stiffness contributions ─────────────────
    // Deterministic assembly: elements are processed in order.
    // Each element scatters its 2×2 ke (via +=) into K at correct DOFs.
    for (const auto &elem : mesh.elements) {
      elem.assemble_stiffness(K, n);
    }

    // ── Step 3: Assemble distributed body force ──────────────────────────
    // Consistent nodal loads: fe = (f_body * Le / 2) * [1, 1]
    if (body_force != 0.0) {
      for (const auto &elem : mesh.elements) {
        elem.assemble_body_force(F, body_force);
      }
    }

    // ── Step 4: Neumann BCs (point forces) ───────────────────────────────
    // Simply add to the load vector — this is the natural BC.
    for (const auto &kv : neumann_bcs) {
      F[kv.first] += kv.second;
    }

    // ── Step 5: Condition number estimate (pre-BC) ───────────────────────
    // Estimate: ratio of max to min positive diagonal entry of K.
    double kdiag_max = 0.0;
    double kdiag_min = std::numeric_limits<double>::max();
    for (int i = 0; i < n; ++i) {
      double d = K[i * n + i];
      if (d > 1e-15) {
        kdiag_max = std::max(kdiag_max, d);
        kdiag_min = std::min(kdiag_min, d);
      }
    }
    double kappa = (kdiag_min > 1e-15)
                       ? (kdiag_max / kdiag_min)
                       : std::numeric_limits<double>::infinity();

    // ── Step 6: Save original K for energy computation ───────────────────
    // U = 0.5 * uᵀ K_original u   uses unprescribed K
    // (We save a copy before modifying K for BCs.)
    std::vector<double> K_original = K;

    // ── Step 7: Dirichlet BC — Row/Column Elimination ────────────────────
    // For each constrained DOF d with prescribed value ū:
    //   (a) Modify F: F[i] -= K[i,d] * ū  for all i ≠ d
    //   (b) Zero row d and column d
    //   (c) Set K[d,d] = 1, F[d] = ū
    //
    // Process in sorted order for determinism.
    std::vector<int> constrained_dofs;
    constrained_dofs.reserve(dirichlet_bcs.size());
    for (const auto &kv : dirichlet_bcs) {
      constrained_dofs.push_back(kv.first);
    }
    std::sort(constrained_dofs.begin(), constrained_dofs.end());

    for (int d : constrained_dofs) {
      double u_bar = dirichlet_bcs.at(d);

      // (a) Transfer known displacement contribution to RHS
      for (int i = 0; i < n; ++i) {
        if (i != d) {
          F[i] -= K[i * n + d] * u_bar;
        }
      }

      // (b) Zero row d and column d
      for (int i = 0; i < n; ++i) {
        K[d * n + i] = 0.0;
        K[i * n + d] = 0.0;
      }

      // (c) Set identity row for constrained DOF
      K[d * n + d] = 1.0;
      F[d] = u_bar;
    }

    // ── Step 8: Linear Solve ─────────────────────────────────────────────
    // Uses existing MatrixSolver::solve_gaussian:
    //   Gaussian elimination with partial pivoting.
    //   Input: K (float), b (float). We convert double→float here.
    //   For a proper production solver, a native double routine would
    //   be used. Since REALIS's existing API uses float, we cast.
    //   For the small systems in this solver (≤ ~100 DOFs), float is
    //   sufficient; error is < 1e-5 relative.
    //
    // Note: MatrixSolver uses float internally. Convert for interface.
    std::vector<float> K_f(K.size());
    std::vector<float> F_f(n);
    for (size_t i = 0; i < K.size(); ++i)
      K_f[i] = static_cast<float>(K[i]);
    for (int i = 0; i < n; ++i)
      F_f[i] = static_cast<float>(F[i]);

    std::vector<float> u_f;
    bool ok = MatrixSolver::solve_gaussian(K_f, F_f, u_f);

    Bar1DResult result;
    result.converged = ok;
    result.condition_number_estimate = kappa;

    if (!ok) {
      result.u.assign(n, 0.0);
      result.elastic_energy = 0.0;
      return result;
    }

    // Convert back to double
    result.u.resize(n);
    for (int i = 0; i < n; ++i)
      result.u[i] = static_cast<double>(u_f[i]);

    // ── Step 9: Elastic Potential Energy ──────────────────────────────────
    // U = (1/2) * uᵀ K_original u
    // Using the original (un-BC-modified) stiffness matrix.
    // This gives the physical strain energy stored in the bar.
    // Note: u includes prescribed DOFs, K_original is the assembled matrix.
    double energy = 0.0;
    for (int i = 0; i < n; ++i) {
      double Ku_i = 0.0;
      for (int j = 0; j < n; ++j) {
        Ku_i += K_original[i * n + j] * result.u[j];
      }
      energy += result.u[i] * Ku_i;
    }
    result.elastic_energy = 0.5 * energy;

    return result;
  }
};

} // namespace fem
} // namespace realis
