// =============================================================================
// REALIS Physics Engine — Phase 4.2: 2D FEM
// engine/fem/tri2d_solver.hpp
//
// Static Linear FEM Solver for 2D Plane-Stress Elasticity
// =============================================================================
//
// Solves: K u = F
//
// Pipeline:
//   1. Global stiffness assembly    (scatter element ke via DOF map)
//   2. Body force vector assembly   (scatter element fe)
//   3. Neumann BCs                  (nodal point forces in F)
//   4. Dirichlet BCs                (row/column elimination — exact)
//   5. Linear solve                 (Gaussian elimination, partial pivot)
//   6. Energy computation           (U = 0.5 * uᵀ K_original u)
//
// ─────────────────────────────────────────────────────────────────────────────
// DIRICHLET BC — ROW/COLUMN ELIMINATION (same method as bar1d_solver)
// ─────────────────────────────────────────────────────────────────────────────
// For each constrained DOF d with prescribed value ū:
//   1. F[i] -= K[i,d] * ū   for all i ≠ d  (transfer contribution to RHS)
//   2. Zero row d and column d
//   3. K[d,d] = 1,  F[d] = ū
//
// Exact enforcement. Preserves symmetry. No penalty method approximation.
//
// ─────────────────────────────────────────────────────────────────────────────
// DOF CONVENTION
// ─────────────────────────────────────────────────────────────────────────────
// Node i  →  DOFs (2i, 2i+1) = (u_i, v_i)
//
// dirichlet_bcs key: (node_id, component)
//   component 0 = x-displacement (u)
//   component 1 = y-displacement (v)
//
// ─────────────────────────────────────────────────────────────────────────────

#pragma once
#include "tri2d_mesh.hpp"
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <limits>
#include <map>
#include <stdexcept>
#include <vector>

namespace realis {
namespace fem {

// ─────────────────────────────────────────────────────────────────────────────
// Tri2DResult — Output of a 2D static FEM solve
// ─────────────────────────────────────────────────────────────────────────────
struct Tri2DResult {
  std::vector<double>
      u; // Nodal displacements, interleaved [u0,v0,u1,v1,...] (2*n_nodes)
  double elastic_energy;            // U = 0.5 uᵀ K_original u  [J]
  double condition_number_estimate; // max(diag)/min(diag) of assembled K
  bool converged;
};

// ─────────────────────────────────────────────────────────────────────────────
// Tri2DSolver — 2D Static Plane-Stress FEM Solver
// ─────────────────────────────────────────────────────────────────────────────
class Tri2DSolver {
public:
  const Tri2DMesh &mesh;

  // Dirichlet BCs: (node_id, component) → prescribed displacement
  //   component: 0=u (x), 1=v (y)
  std::map<std::pair<int, int>, double> dirichlet_bcs;

  // Neumann BCs: (node_id, component) → applied point force [N]
  std::map<std::pair<int, int>, double> neumann_bcs;

  // Uniform body forces [N/m^2]
  double body_force_x = 0.0;
  double body_force_y = 0.0;

  explicit Tri2DSolver(const Tri2DMesh &m) : mesh(m) {}

  // ─────────────────────────────────────────────────────────────────────────
  // add_dirichlet() — fix a displacement component at a node
  //   component: 0 = u (horizontal), 1 = v (vertical)
  // ─────────────────────────────────────────────────────────────────────────
  void add_dirichlet(int node_id, int component, double value = 0.0) {
    if (node_id < 0 || node_id >= mesh.n_nodes())
      throw std::out_of_range("add_dirichlet: node_id out of range");
    if (component < 0 || component > 1)
      throw std::invalid_argument(
          "add_dirichlet: component must be 0 (u) or 1 (v)");
    dirichlet_bcs[{node_id, component}] = value;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // add_neumann() — apply point force component at a node
  // ─────────────────────────────────────────────────────────────────────────
  void add_neumann(int node_id, int component, double force) {
    if (node_id < 0 || node_id >= mesh.n_nodes())
      throw std::out_of_range("add_neumann: node_id out of range");
    if (component < 0 || component > 1)
      throw std::invalid_argument("add_neumann: component must be 0 or 1");
    neumann_bcs[{node_id, component}] += force;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // solve() — Execute the full 2D FEM static solve pipeline
  // ─────────────────────────────────────────────────────────────────────────
  Tri2DResult solve() const {
    const int n_dof = mesh.n_dof();
    if (n_dof < 4)
      throw std::runtime_error("Tri2DSolver: mesh must have at least 2 nodes");
    if (dirichlet_bcs.empty())
      throw std::runtime_error("Tri2DSolver: need at least one Dirichlet BC "
                               "(removes rigid body modes)");

    // ── Step 1: Allocate global system ─────────────────────────────────
    std::vector<double> K(n_dof * n_dof, 0.0);
    std::vector<double> F(n_dof, 0.0);

    // ── Step 2: Assemble element stiffness contributions ────────────────
    for (const auto &elem : mesh.elements)
      elem.assemble_stiffness(K, n_dof);

    // ── Step 3: Assemble body forces ────────────────────────────────────
    if (body_force_x != 0.0 || body_force_y != 0.0)
      for (const auto &elem : mesh.elements)
        elem.assemble_body_force(F, body_force_x, body_force_y);

    // ── Step 4: Neumann BCs ─────────────────────────────────────────────
    for (const auto &kv : neumann_bcs) {
      int dof = 2 * kv.first.first + kv.first.second;
      F[dof] += kv.second;
    }

    // ── Step 5: Condition number estimate (pre-BC, on diagonal) ─────────
    double kdiag_max = 0.0;
    double kdiag_min = std::numeric_limits<double>::max();
    for (int i = 0; i < n_dof; ++i) {
      double d = K[i * n_dof + i];
      if (d > 1e-15) {
        kdiag_max = std::max(kdiag_max, d);
        kdiag_min = std::min(kdiag_min, d);
      }
    }
    double kappa = (kdiag_min > 1e-15)
                       ? kdiag_max / kdiag_min
                       : std::numeric_limits<double>::infinity();

    // ── Step 6: Save original K for energy computation ──────────────────
    std::vector<double> K_orig = K;

    // ── Step 7: Dirichlet BCs — Row/Column Elimination ──────────────────
    // Collect and sort constrained DOFs for determinism
    std::vector<std::pair<int, double>> constrained; // (dof, value)
    for (const auto &kv : dirichlet_bcs) {
      int dof = 2 * kv.first.first + kv.first.second;
      constrained.emplace_back(dof, kv.second);
    }
    // Sort by DOF index for deterministic processing
    std::sort(
        constrained.begin(), constrained.end(),
        [](const std::pair<int, double> &a, const std::pair<int, double> &b) {
          return a.first < b.first;
        });

    for (const auto &cv : constrained) {
      int d = cv.first;
      double ubar = cv.second;

      // (a) Transfer known displacement contribution to RHS
      for (int i = 0; i < n_dof; ++i)
        if (i != d)
          F[i] -= K[i * n_dof + d] * ubar;

      // (b) Zero row d and column d
      for (int i = 0; i < n_dof; ++i) {
        K[d * n_dof + i] = 0.0;
        K[i * n_dof + d] = 0.0;
      }

      // (c) Identity diagonal and RHS
      K[d * n_dof + d] = 1.0;
      F[d] = ubar;
    }

    // ── Step 8: Linear Solve — native double-precision Gaussian elimination ─
    // We do NOT delegate to MatrixSolver::solve_gaussian because that API
    // converts to float, causing catastrophic cancellation in the patch test:
    // K entries ~1e6, u_bar ~1e-3 → F_eff terms ~1e3, float error ~1e-4,
    // relative error in u ~1e-4/K^{-1} ~ unacceptably large.
    //
    // Instead: in-place double Gaussian elimination with partial pivoting.
    // ─────────────────────────────────────────────────────────────────────
    // Augmented system [K | F] → row-reduce → back-substitute
    std::vector<double> A(K); // working copy of K (already BC-modified)
    std::vector<double> b(F); // working copy of F

    bool ok = true;
    for (int col = 0; col < n_dof; ++col) {
      // Partial pivot: find row with max |A[row,col]| in col >= col
      int pivot = col;
      double pivot_val = std::abs(A[col * n_dof + col]);
      for (int row = col + 1; row < n_dof; ++row) {
        double v = std::abs(A[row * n_dof + col]);
        if (v > pivot_val) {
          pivot_val = v;
          pivot = row;
        }
      }
      if (pivot_val < 1e-15) {
        ok = false;
        break;
      }

      // Swap rows pivot ↔ col
      if (pivot != col) {
        for (int j = 0; j < n_dof; ++j)
          std::swap(A[col * n_dof + j], A[pivot * n_dof + j]);
        std::swap(b[col], b[pivot]);
      }

      // Eliminate below
      double inv_diag = 1.0 / A[col * n_dof + col];
      for (int row = col + 1; row < n_dof; ++row) {
        double factor = A[row * n_dof + col] * inv_diag;
        if (std::abs(factor) < 1e-30)
          continue;
        for (int j = col; j < n_dof; ++j)
          A[row * n_dof + j] -= factor * A[col * n_dof + j];
        b[row] -= factor * b[col];
      }
    }

    // Back substitution
    std::vector<double> u_sol(n_dof, 0.0);
    if (ok) {
      for (int i = n_dof - 1; i >= 0; --i) {
        double sum = b[i];
        for (int j = i + 1; j < n_dof; ++j)
          sum -= A[i * n_dof + j] * u_sol[j];
        u_sol[i] = sum / A[i * n_dof + i];
      }
    }

    Tri2DResult result;
    result.converged = ok;
    result.condition_number_estimate = kappa;

    if (!ok) {
      result.u.assign(n_dof, 0.0);
      result.elastic_energy = 0.0;
      return result;
    }

    // u_sol is already double — copy directly
    result.u = u_sol;

    // ── Step 9: Elastic Potential Energy ─────────────────────────────────
    // U = 0.5 * uᵀ K_original u  (uses pre-BC stiffness)
    double energy = 0.0;
    for (int i = 0; i < n_dof; ++i) {
      double Ku_i = 0.0;
      for (int j = 0; j < n_dof; ++j)
        Ku_i += K_orig[i * n_dof + j] * result.u[j];
      energy += result.u[i] * Ku_i;
    }
    result.elastic_energy = 0.5 * energy;

    return result;
  }
};

} // namespace fem
} // namespace realis
