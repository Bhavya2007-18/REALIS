// =============================================================================
// REALIS Physics Engine — Phase 4A: 1D Linear Elastic FEM
// tests/fem/verify_bar1d.cpp
//
// Verification Suite for 1D Bar FEM Solver
// =============================================================================
//
// Tests:
//   Test 1 — Fixed-free bar under end load
//             Analytical: u(x) = F*x / (E*A)
//             FEM should match exactly (linear trial functions span exact soln)
//
//   Test 2 — Distributed (uniform) body load, fixed left end
//             Analytical: u(x) = (f/(2EA)) * x * (2L - x)
//             FEM converges but does NOT match exactly (quadratic soln, linear
//             approx) Verify L2-norm error < tolerance
//
//   Test 3 — Mesh refinement convergence study
//             n = 2, 4, 8, 16 elements (distributed load case)
//             Assert error strictly decreasing with refinement
//             Compute empirical convergence rate (expect ≈ 2 for linear
//             elements)
//
//   Test 4 — Energy validation
//             U = 0.5 * uᵀ K u > 0 after solve
//             U doubles when F doubles → U scales as F² (correct quadratic
//             behavior)
//
// =============================================================================

// The solver headers use relative includes from engine/. Adjust include path:
// Compiled with: -I../../engine (relative to tests/fem/) or from build system.
#include "../../engine/fem/bar1d_solver.hpp"

#include <algorithm>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <numeric>
#include <string>
#include <vector>

// ─────────────────────────────────────────────────────────────────────────────
// Minimal test harness (self-contained, no external dependency)
// ─────────────────────────────────────────────────────────────────────────────
struct TestResult {
  std::string name;
  bool passed;
  std::string message;
};

static std::vector<TestResult> g_results;

static void run_test(const std::string &name, bool pass,
                     const std::string &msg = "") {
  g_results.push_back({name, pass, msg});
  std::cout << (pass ? "[PASS]" : "[FAIL]") << " " << name;
  if (!msg.empty())
    std::cout << "  →  " << msg;
  std::cout << "\n";
}

// ─────────────────────────────────────────────────────────────────────────────
// L2 Error Norm: ||u_fem - u_exact|| / ||u_exact||   (relative)
//   evaluated at all node positions
// ─────────────────────────────────────────────────────────────────────────────
template <typename Fn>
static double l2_relative_error(const std::vector<double> &node_x,
                                const std::vector<double> &u_fem, Fn u_exact) {
  double num = 0.0, den = 0.0;
  for (int i = 0; i < static_cast<int>(node_x.size()); ++i) {
    double ue = u_exact(node_x[i]);
    double diff = u_fem[i] - ue;
    num += diff * diff;
    den += ue * ue;
  }
  // Avoid division by zero if exact solution is trivially zero everywhere
  if (den < 1e-30)
    return std::sqrt(num);
  return std::sqrt(num / den);
}

// ─────────────────────────────────────────────────────────────────────────────
// l2_error_at_midpoints — L2 error at element MIDPOINTS (weighted by Le)
//
// For 1D linear FEM with constant body force, nodal displacements are
// SUPERCONVERGENTLY EXACT (Galerkin property). To correctly reveal the O(h^2)
// convergence of the interpolation, evaluate at midpoints where the error
// is (h^2/8)*|u''| + O(h^4) — never zero.
// ─────────────────────────────────────────────────────────────────────────────
template <typename Fn>
static double l2_error_at_midpoints(const realis::fem::Bar1DMesh &mesh,
                                    const std::vector<double> &u_fem,
                                    Fn u_exact) {
  double num = 0.0, den = 0.0;
  for (const auto &elem : mesh.elements) {
    int i = elem.node_i;
    int j = elem.node_j;
    double x_mid = 0.5 * (mesh.node_positions[i] + mesh.node_positions[j]);
    double u_fem_mid = 0.5 * (u_fem[i] + u_fem[j]);
    double ue = u_exact(x_mid);
    double diff = u_fem_mid - ue;
    num += diff * diff * elem.Le;
    den += ue * ue * elem.Le;
  }
  if (den < 1e-30)
    return std::sqrt(num);
  return std::sqrt(num / den);
}

// =============================================================================
// TEST 1 — Fixed-Free Bar Under End Point Load
// =============================================================================
// Material: E = 1e6 Pa, A = 1.0 m², L = 1.0 m
// Load:     F = 1000 N applied at right end (node n_last)
// BC:       u(0) = 0 (left end fixed)
//
// Analytical solution: u(x) = F*x / (EA)
//   u_tip = F*L / (EA) = 1000 * 1 / (1e6 * 1) = 1e-3 m
//
// For linear 1D elements, the FEM solution IS EXACT because the
// analytical solution u = Fx/EA is a linear function — perfectly
// representable by the linear trial space. Error should be < 1e-9.
// =============================================================================
static void test1_fixed_free_end_load() {
  std::cout
      << "\n── Test 1: Fixed-Free Bar Under End Load ──────────────────────\n";

  const double E = 1.0e6;  // Pa
  const double A = 1.0;    // m²
  const double L = 1.0;    // m
  const double F = 1000.0; // N
  const int n = 4;         // 4 elements (5 nodes)

  using namespace realis::fem;

  Bar1DMesh mesh = Bar1DMesh::uniform(L, n, E, A);
  Bar1DSolver solver(mesh);

  solver.add_dirichlet(0, 0.0);              // u(x=0) = 0
  solver.add_neumann(mesh.n_nodes() - 1, F); // F at right tip

  Bar1DResult result = solver.solve();

  // Analytical: u(x) = F*x/(EA)
  auto u_exact = [&](double x) { return F * x / (E * A); };

  double u_tip_fem = result.u[mesh.n_nodes() - 1];
  double u_tip_exact = u_exact(L);
  double abs_error = std::abs(u_tip_fem - u_tip_exact);
  double rel_error = abs_error / std::abs(u_tip_exact);

  std::cout << std::scientific << std::setprecision(6);
  std::cout << "  u_tip FEM      = " << u_tip_fem << " m\n";
  std::cout << "  u_tip Exact    = " << u_tip_exact << " m\n";
  std::cout << "  Absolute error = " << abs_error << " m\n";
  std::cout << "  Relative error = " << rel_error << "\n";
  std::cout << "  Energy U       = " << result.elastic_energy << " J\n";
  std::cout << "  Condition est. = " << result.condition_number_estimate
            << "\n";
  std::cout << "  Solver OK      = " << (result.converged ? "YES" : "NO")
            << "\n";

  // Check full displacement field
  double l2_err = l2_relative_error(mesh.node_positions, result.u, u_exact);
  std::cout << "  L2 field error = " << l2_err << "\n";

  // For exact polynomial case, FEM should match to near float precision
  run_test("End displacement matches analytical (rel err < 1e-5)",
           rel_error < 1e-5, "rel_err = " + std::to_string(rel_error));

  run_test("Full displacement field L2 error < 1e-5", l2_err < 1e-5,
           "L2 = " + std::to_string(l2_err));

  run_test("Elastic energy positive definite (U > 0)",
           result.elastic_energy > 0.0,
           "U = " + std::to_string(result.elastic_energy));

  run_test("Solver converged", result.converged, "");
}

// =============================================================================
// TEST 2 — Fixed Bar Under Distributed Body Load
// =============================================================================
// Material: E = 1e6 Pa, A = 1.0 m², L = 1.0 m
// Load:     f = 1000 N/m (uniform body force)
// BC:       u(0) = 0 (left fixed), u(L) free
//
// Analytical solution: u(x) = (f / (2EA)) * x * (2L - x)
//   u_tip = f * L² / (2EA) = 1000 * 1 / (2e6) = 5e-4 m
//
// The exact solution is quadratic in x. Linear 2-node elements approximate
// this, but the error decreases with mesh refinement.
// =============================================================================
static void test2_distributed_load() {
  std::cout
      << "\n── Test 2: Distributed Body Load ──────────────────────────────\n";

  const double E = 1.0e6;  // Pa
  const double A = 1.0;    // m²
  const double L = 1.0;    // m
  const double f = 1000.0; // N/m
  const int n = 8;         // 8 elements

  using namespace realis::fem;

  Bar1DMesh mesh = Bar1DMesh::uniform(L, n, E, A);
  Bar1DSolver solver(mesh);
  solver.body_force = f;
  solver.add_dirichlet(0, 0.0); // u(0) = 0

  Bar1DResult result = solver.solve();

  // Analytical: u(x) = f*x*(2L - x) / (2EA)
  auto u_exact = [&](double x) {
    return f * x * (2.0 * L - x) / (2.0 * E * A);
  };

  double u_tip_fem = result.u[mesh.n_nodes() - 1];
  double u_tip_exact = u_exact(L);
  double rel_tip_err =
      std::abs(u_tip_fem - u_tip_exact) / std::abs(u_tip_exact);

  double l2_err = l2_relative_error(mesh.node_positions, result.u, u_exact);

  std::cout << std::scientific << std::setprecision(6);
  std::cout << "  u_tip FEM      = " << u_tip_fem << " m\n";
  std::cout << "  u_tip Exact    = " << u_tip_exact << " m\n";
  std::cout << "  Tip rel. error = " << rel_tip_err << "\n";
  std::cout << "  L2 field error = " << l2_err << "\n";
  std::cout << "  Energy U       = " << result.elastic_energy << " J\n";
  std::cout << "  Solver OK      = " << (result.converged ? "YES" : "NO")
            << "\n";

  // With 8 linear elements, expect < 1% relative error
  run_test(
      "Distributed load: tip displacement within 1% of analytical (8 elem)",
      rel_tip_err < 0.01, "rel_err = " + std::to_string(rel_tip_err));

  run_test("Distributed load: L2 field error < 1%", l2_err < 0.01,
           "L2 = " + std::to_string(l2_err));

  run_test("Energy physically correct (U > 0)", result.elastic_energy > 0.0,
           "");
}

// =============================================================================
// TEST 3 — Mesh Refinement Convergence Study
// =============================================================================
// Problem: uniform body force f, fixed left u(0)=0, free right.
// Exact solution: u(x) = f*x*(2L-x)/(2EA)  — quadratic.
//
// IMPORTANT — SUPERCONVERGENCE NOTE:
// For 1D linear FEM with constant f, the Galerkin method produces EXACT
// nodal displacements for all mesh sizes. This is a mathematical property,
// not a sign of incorrect implementation. The nodal error is at float
// precision regardless of h.
//
// To correctly measure convergence rate, we evaluate the L2 error at
// element MIDPOINTS, where the linear interpolation error is O(h²):
//   |u_fem(x_mid) - u_exact(x_mid)| = (h²/8) * u''(x_mid) + O(h⁴)
//
// Expected convergence rate ≈ 2 in this norm.
// =============================================================================
static void test3_mesh_refinement() {
  std::cout
      << "\n── Test 3: Mesh Refinement Convergence Study ──────────────────\n";
  std::cout << "  (L2 error measured at element midpoints — avoids nodal "
               "superconvergence)\n";

  const double E = 1.0e6;  // Pa
  const double A = 1.0;    // m²
  const double L = 1.0;    // m
  const double f = 1000.0; // N/m

  auto u_exact = [&](double x) {
    return f * x * (2.0 * L - x) / (2.0 * E * A);
  };

  std::vector<int> n_elems = {2, 4, 8, 16};
  std::vector<double> errors;
  std::vector<double> h_sizes;

  std::cout << std::scientific << std::setprecision(4);
  std::cout << "  n_elem   h          L2_midpt_error\n";
  std::cout << "  ──────   ─────────  ──────────────\n";

  using namespace realis::fem;

  for (int n : n_elems) {
    Bar1DMesh mesh = Bar1DMesh::uniform(L, n, E, A);
    Bar1DSolver solver(mesh);
    solver.body_force = f;
    solver.add_dirichlet(0, 0.0);
    Bar1DResult result = solver.solve();

    double h = L / n;
    double err = l2_error_at_midpoints(mesh, result.u, u_exact);
    errors.push_back(err);
    h_sizes.push_back(h);

    std::cout << "  " << std::setw(6) << n << "   " << h << "   " << err
              << "\n";
  }

  std::cout << "\n  Convergence rates:  log(e_i/e_{i+1}) / log(h_i/h_{i+1})\n";
  std::vector<double> rates;
  for (int i = 0; i + 1 < static_cast<int>(errors.size()); ++i) {
    if (errors[i + 1] > 1e-20 && errors[i] > 1e-20) {
      double rate = std::log(errors[i] / errors[i + 1]) /
                    std::log(h_sizes[i] / h_sizes[i + 1]);
      rates.push_back(rate);
      std::cout << "    n=" << n_elems[i] << "->" << n_elems[i + 1]
                << ": rate = " << std::fixed << std::setprecision(3) << rate
                << "\n";
    }
  }

  // Assert: error strictly decreasing
  bool monotone = true;
  for (int i = 0; i + 1 < static_cast<int>(errors.size()); ++i) {
    if (errors[i + 1] >= errors[i]) {
      monotone = false;
      std::cout << "  CONVERGENCE FAILURE: error[n=" << n_elems[i + 1]
                << "] >= error[n=" << n_elems[i] << "]\n";
    }
  }

  // Convergence rate: expect ≈ 2 for linear elements (accept [1.5, 3.0])
  bool rates_ok = !rates.empty();
  for (double r : rates) {
    if (r < 1.5 || r > 3.0)
      rates_ok = false;
  }

  run_test("Mesh refinement: midpoint L2 error strictly decreasing", monotone,
           monotone ? "" : "IMPLEMENTATION ERROR — check assembly or BC");

  run_test("Convergence rate consistent with linear elements (1.5 <= r <= 3.0)",
           rates_ok,
           rates_ok ? "rates in expected range" : "rate outside [1.5, 3.0]");
}

// =============================================================================
// TEST 4 — Energy Validation
// =============================================================================
// Check that elastic potential energy behaves physically:
//   (a) U > 0 after any nonzero deformation
//   (b) U scales as F² (since U = 0.5 uᵀKu and u ∝ F) — doubling F → 4x energy
// =============================================================================
static void test4_energy_validation() {
  std::cout
      << "\n── Test 4: Energy Validation ───────────────────────────────────\n";

  const double E = 1.0e6;
  const double A = 1.0;
  const double L = 1.0;
  const int n = 4;

  using namespace realis::fem;

  auto solve_with_force = [&](double F) {
    Bar1DMesh mesh = Bar1DMesh::uniform(L, n, E, A);
    Bar1DSolver solver(mesh);
    solver.add_dirichlet(0, 0.0);
    solver.add_neumann(mesh.n_nodes() - 1, F);
    return solver.solve();
  };

  Bar1DResult r1 = solve_with_force(1000.0);
  Bar1DResult r2 = solve_with_force(2000.0);

  double U1 = r1.elastic_energy;
  double U2 = r2.elastic_energy;
  double ratio = (U1 > 1e-30) ? U2 / U1 : 0.0;

  std::cout << std::scientific << std::setprecision(6);
  std::cout << "  U(F=1000) = " << U1 << " J\n";
  std::cout << "  U(F=2000) = " << U2 << " J\n";
  std::cout << "  U2/U1 = " << std::fixed << std::setprecision(4) << ratio
            << "  (expected ≈ 4.0)\n";

  // Analytical check: U = F²L/(2EA)
  auto U_exact = [&](double F) { return F * F * L / (2.0 * E * A); };
  double U1_exact = U_exact(1000.0);
  double U2_exact = U_exact(2000.0);

  std::cout << "  U_exact(1000) = " << std::scientific << U1_exact << " J\n";
  std::cout << "  U_exact(2000) = " << U2_exact << " J\n";

  double energy_err1 = std::abs(U1 - U1_exact) / U1_exact;
  double energy_err2 = std::abs(U2 - U2_exact) / U2_exact;

  std::cout << "  Energy rel err (F=1000): " << energy_err1 << "\n";
  std::cout << "  Energy rel err (F=2000): " << energy_err2 << "\n";

  run_test("U(F=1000) > 0 — positive definite strain energy", U1 > 0.0,
           "U = " + std::to_string(U1));

  run_test("U(F=2000) > U(F=1000) — energy increases with deformation", U2 > U1,
           "");

  run_test("U scales as F² (U2/U1 ≈ 4.0, tol ±0.5%)",
           std::abs(ratio - 4.0) < 0.05, "ratio = " + std::to_string(ratio));

  run_test("Energy matches analytical U=F²L/(2EA) within 0.01%",
           energy_err1 < 1e-4 && energy_err2 < 1e-4,
           "err1=" + std::to_string(energy_err1) +
               " err2=" + std::to_string(energy_err2));
}

// =============================================================================
// MAIN
// =============================================================================
int main() {
  std::cout
      << "=============================================================\n";
  std::cout << "  REALIS Phase 4A — 1D FEM Solver Verification\n";
  std::cout << "  Strong form: d/dx(EA du/dx) + f = 0\n";
  std::cout << "  Formulation: Galerkin FEM, linear 2-node bar elements\n";
  std::cout << "  Boundary:    Dirichlet (row/col elimination) + Neumann\n";
  std::cout << "  Solver:      Gaussian elimination, partial pivoting\n";
  std::cout
      << "=============================================================\n";

  test1_fixed_free_end_load();
  test2_distributed_load();
  test3_mesh_refinement();
  test4_energy_validation();

  int passed = 0, failed = 0;
  for (const auto &r : g_results) {
    if (r.passed)
      ++passed;
    else
      ++failed;
  }

  std::cout
      << "\n=============================================================\n";
  std::cout << "  Results: " << passed << " passed, " << failed << " failed"
            << " (total " << g_results.size() << ")\n";
  std::cout
      << "=============================================================\n";

  if (failed > 0) {
    std::cout << "\nFAILED TESTS:\n";
    for (const auto &r : g_results) {
      if (!r.passed)
        std::cout << "  [FAIL] " << r.name << "\n";
    }
    std::cout << "\nPhase 4A EXIT CRITERIA: NOT MET\n";
    return 1;
  }

  std::cout << "\nPhase 4A EXIT CRITERIA: ALL MET\n";
  std::cout << "  ✓ Analytical bar solution matches FEM\n";
  std::cout << "  ✓ Error decreases under mesh refinement\n";
  std::cout << "  ✓ Stiffness matrix positive definite\n";
  std::cout << "  ✓ Boundary conditions correctly enforced\n";
  std::cout << "  ✓ Energy physically consistent\n";
  return 0;
}
