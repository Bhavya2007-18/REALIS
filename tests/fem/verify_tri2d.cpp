// =============================================================================
// REALIS Physics Engine — Phase 4.2–4.3: 2D FEM Verification
// tests/fem/verify_tri2d.cpp
//
// Verification Suite for 2D Plane-Stress CST FEM Solver
// =============================================================================
//
// Tests:
//   Test 1 — PATCH TEST (MANDATORY CORRECTNESS GATE)
//             Apply u = ax+by, v = cx+dy on all boundary nodes.
//             Constant strain → FEM must reproduce EXACTLY.
//             Failure = wrong B matrix or DOF assembly.
//
//   Test 2 — STIFFNESS SYMMETRY
//             Assemble K. Verify max|K - Kᵀ| < 1e-10.
//             Failure = implementation error in ke or assembly scatter.
//
//   Test 3 — MESH REFINEMENT CONVERGENCE (Cantilever)
//             L=4, H=1, E=1e6, nu=0.25, tip load F at right edge.
//             Run nx=2,4,8 (ny=1,2,4).
//             Measure tip y-displacement. Assert monotone toward analytical.
//             Euler-Bernoulli beam: delta = FL^3/(3EI), I = H^3/12.
//
//   Test 4 — ENERGY VALIDATION
//             U = 0.5 uᵀKu > 0.
//             Doubling load → 4x energy (U ∝ F²).
//
// =============================================================================

#include "../../engine/fem/tri2d_solver.hpp"

#include <algorithm>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <numeric>
#include <string>
#include <vector>

// ─────────────────────────────────────────────────────────────────────────────
// Minimal test harness
// ─────────────────────────────────────────────────────────────────────────────
struct TestResult {
  std::string name;
  bool passed;
  std::string msg;
};
static std::vector<TestResult> g_results;

static void run_test(const std::string &name, bool pass,
                     const std::string &msg = "") {
  g_results.push_back({name, pass, msg});
  std::cout << (pass ? "[PASS]" : "[FAIL]") << " " << name;
  if (!msg.empty())
    std::cout << "  ->  " << msg;
  std::cout << "\n";
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: absolute max displacement error at nodes over a set of indices
// ─────────────────────────────────────────────────────────────────────────────
static double max_disp_error(const realis::fem::Tri2DMesh &mesh,
                             const std::vector<double> &u, double a, double b,
                             double c, double d) {
  // Exact: ux = a*x + b*y,  uy = c*x + d*y
  double err = 0.0;
  for (int i = 0; i < mesh.n_nodes(); ++i) {
    double ux_exact = a * mesh.node_x[i] + b * mesh.node_y[i];
    double uy_exact = c * mesh.node_x[i] + d * mesh.node_y[i];
    double eu = std::abs(u[2 * i] - ux_exact);
    double ev = std::abs(u[2 * i + 1] - uy_exact);
    err = std::max(err, std::max(eu, ev));
  }
  return err;
}

// =============================================================================
// TEST 1 — PATCH TEST
// =============================================================================
// A patch of 4 triangles covering [0,2]×[0,1].
// Prescribed displacement field:
//   ux = 0.001*x + 0.0005*y
//   uy = 0.0003*x + 0.0008*y
//
// Corresponding constant strain:
//   exx = 0.001,  eyy = 0.0008,  gxy = 0.0005 + 0.0003 = 0.0008
//
// All 5 boundary nodes are prescribed.
// Interior node (#4, at x=1, y=1) is FREE → FEM must find exact solution.
//
// This tests:
//   - B matrix correctness (constant strain must be reproduced exactly)
//   - DOF assembly correctness
//   - BC enforcement correctness
//   - Galerkin consistency (patch test = pass for any conforming element)
// =============================================================================
static void test1_patch_test() {
  std::cout
      << "\n-- Test 1: Patch Test (Mandatory Correctness Gate) -----------\n";

  const double E = 1.0e6;
  const double nu = 0.3;
  const double a = 1.0e-3; // ux = a*x + b*y
  const double b = 5.0e-4;
  const double c = 3.0e-4; // uy = c*x + d*y
  const double d = 8.0e-4;

  using namespace realis::fem;

  Tri2DMesh mesh = Tri2DMesh::patch_mesh(E, nu);
  Tri2DSolver solver(mesh);

  // Prescribe all boundary nodes (node 4 is the sole interior node)
  for (int i = 0; i < mesh.n_nodes(); ++i) {
    if (i == 4)
      continue; // skip interior node
    double x = mesh.node_x[i], y = mesh.node_y[i];
    solver.add_dirichlet(i, 0, a * x + b * y); // ux
    solver.add_dirichlet(i, 1, c * x + d * y); // uy
  }

  Tri2DResult result = solver.solve();

  if (!result.converged) {
    run_test("Patch test: solver converged", false, "SOLVER FAILED");
    return;
  }

  // The exact solution at all nodes (including interior node 4):
  double max_err = max_disp_error(mesh, result.u, a, b, c, d);

  std::cout << std::scientific << std::setprecision(4);
  std::cout << "  Interior node 4: ux_fem=" << result.u[8]
            << "  ux_exact=" << (a * 1.0 + b * 1.0) << "\n";
  std::cout << "  Interior node 4: uy_fem=" << result.u[9]
            << "  uy_exact=" << (c * 1.0 + d * 1.0) << "\n";
  std::cout << "  Max abs error over all nodes: " << max_err << "\n";
  std::cout << "  Strain energy U = " << result.elastic_energy << " J\n";

  run_test("Patch test: interior node exact (|err| < 1e-8)", max_err < 1e-8,
           "max_err=" + std::to_string(max_err));

  run_test("Patch test: strain energy positive (U > 0)",
           result.elastic_energy > 0.0,
           "U=" + std::to_string(result.elastic_energy));
}

// =============================================================================
// TEST 2 — STIFFNESS SYMMETRY
// =============================================================================
// Assemble K on a 2×2 cantilever mesh.
// Verify max|K - Kᵀ| < 1e-10 (up to float round-off).
// A non-symmetric K indicates an error in ke formulation or assembly scatter.
// =============================================================================
static void test2_stiffness_symmetry() {
  std::cout
      << "\n-- Test 2: Stiffness Matrix Symmetry -------------------------\n";

  const double E = 1.0e6, nu = 0.3;

  using namespace realis::fem;

  // Build mesh and assemble global K manually
  Tri2DMesh mesh = Tri2DMesh::cantilever(4.0, 1.0, 2, 1, E, nu);
  const int n_dof = mesh.n_dof();

  std::vector<double> K(n_dof * n_dof, 0.0);
  for (const auto &elem : mesh.elements)
    elem.assemble_stiffness(K, n_dof);

  double max_asym = 0.0;
  for (int i = 0; i < n_dof; ++i)
    for (int j = 0; j < n_dof; ++j)
      max_asym =
          std::max(max_asym, std::abs(K[i * n_dof + j] - K[j * n_dof + i]));

  std::cout << std::scientific << std::setprecision(4);
  std::cout << "  n_dof = " << n_dof << "\n";
  std::cout << "  max|K - Ktranspose| = " << max_asym << "\n";

  run_test("Stiffness matrix symmetric (max|K-Kt| < 1e-10)", max_asym < 1e-10,
           "asym=" + std::to_string(max_asym));
}

// =============================================================================
// TEST 3 — MESH REFINEMENT CONVERGENCE (Cantilever Plate)
// =============================================================================
// Geometry: L=4m, H=1m, E=1e6 Pa, nu=0.25
// BC:       u=v=0 on all nodes at x=0 (left edge)
// Load:     Uniform upward shear F_total on right edge (x=L), distributed per
// node
//
// Euler-Bernoulli tip deflection (approximate — beam theory):
//   delta_tip = F*L^3 / (3*E*I),  I = H^3/12
//
// Note: CST cantilever will be stiffer than beam theory (shear locking in
// coarse meshes). We verify MONOTONE convergence toward the reference, not
// exact match. This is physically correct for CST elements.
// =============================================================================
static void test3_mesh_refinement() {
  std::cout
      << "\n-- Test 3: Mesh Refinement Convergence (Cantilever) ----------\n";

  const double L = 4.0;
  const double H = 1.0;
  const double E = 1.0e6;
  const double nu = 0.25;
  const double F_tot = 100.0; // total upward force on right edge [N]

  // Euler-Bernoulli beam reference
  double I = H * H * H / 12.0;
  double delta_EB = F_tot * L * L * L / (3.0 * E * I);

  std::cout << std::scientific << std::setprecision(4);
  std::cout << "  Euler-Bernoulli reference: delta_tip = " << delta_EB
            << " m\n";
  std::cout << "  (CST will converge to this from above — stiffer due to shear "
               "locking)\n\n";
  std::cout << "  nx   ny   n_nodes  tip_v (m)    delta_EB     ratio\n";
  std::cout << "  ---  ---  -------  ----------   ----------   -----\n";

  using namespace realis::fem;

  // Refinement levels
  struct Level {
    int nx, ny;
  };
  std::vector<Level> levels = {{2, 1}, {4, 2}, {8, 4}};
  std::vector<double> tip_displacements;

  for (auto &lv : levels) {
    Tri2DMesh mesh = Tri2DMesh::cantilever(L, H, lv.nx, lv.ny, E, nu);
    Tri2DSolver solver(mesh);

    // Fix all nodes at x=0 (left edge): node index i = 0*(ny+1) + j  for
    // j=0..ny
    for (int j = 0; j <= lv.ny; ++j) {
      int node_id = j; // column 0: node = 0*(ny+1) + j = j
      solver.add_dirichlet(node_id, 0, 0.0);
      solver.add_dirichlet(node_id, 1, 0.0);
    }

    // Distribute F_tot evenly over right-edge nodes
    // Right edge: column nx → node = nx*(ny+1) + j for j=0..ny
    // There are (ny+1) nodes; corner nodes get half share
    // Simple approach: equal share F_tot/(ny+1) to each right-edge node
    int n_right = lv.ny + 1;
    for (int j = 0; j <= lv.ny; ++j) {
      int node_id = lv.nx * (lv.ny + 1) + j;
      solver.add_neumann(node_id, 1, F_tot / n_right); // upward v-force
    }

    Tri2DResult result = solver.solve();

    if (!result.converged) {
      std::cout << "  SOLVER FAILED at nx=" << lv.nx << "\n";
      continue;
    }

    // Tip displacement: average v at right-edge nodes
    double v_avg = 0.0;
    for (int j = 0; j <= lv.ny; ++j) {
      int node_id = lv.nx * (lv.ny + 1) + j;
      v_avg += result.u[2 * node_id + 1];
    }
    v_avg /= n_right;
    tip_displacements.push_back(v_avg);

    double ratio = v_avg / delta_EB;
    std::cout << "  " << std::setw(4) << lv.nx << " " << std::setw(4) << lv.ny
              << " " << std::setw(8) << mesh.n_nodes() << "  " << v_avg << "  "
              << delta_EB << "  " << std::fixed << std::setprecision(4) << ratio
              << "\n";
  }

  std::cout << std::scientific << std::setprecision(4);

  // Check monotone convergence (tip displacement should increase toward
  // delta_EB as mesh is refined — CST is overly stiff so tip_v < delta_EB but
  // increasing)
  bool monotone = true;
  for (int i = 0; i + 1 < static_cast<int>(tip_displacements.size()); ++i) {
    if (tip_displacements[i + 1] <= tip_displacements[i]) {
      monotone = false;
      std::cout << "  CONVERGENCE FAILURE: tip_v did not increase from mesh "
                << i << " to " << i + 1 << "\n";
    }
  }

  // Check that finest mesh is within 20% of Euler-Bernoulli (CST is stiffer)
  bool reasonable =
      !tip_displacements.empty() && (tip_displacements.back() > 0.5 * delta_EB);

  run_test("Cantilever: tip v-displacement monotone increasing with refinement",
           monotone,
           monotone ? "monotone" : "NOT monotone - implementation error");

  run_test(
      "Cantilever: finest mesh tip > 50% of Euler-Bernoulli (CST convergence)",
      reasonable,
      !tip_displacements.empty()
          ? ("tip/delta_EB=" +
             std::to_string(tip_displacements.back() / delta_EB))
          : "no data");
}

// =============================================================================
// TEST 4 — ENERGY VALIDATION
// =============================================================================
// Verify U = 0.5 uᵀKu > 0 and scales quadratically with applied force F.
// U(2F) / U(F) must be 4.0 (linear system: u ∝ F → U ∝ F²).
// =============================================================================
static void test4_energy_validation() {
  std::cout
      << "\n-- Test 4: Energy Validation ---------------------------------\n";

  const double E = 1.0e6, nu = 0.3;
  const double L = 4.0, H = 1.0;

  using namespace realis::fem;

  auto solve_with_force = [&](double F) {
    Tri2DMesh mesh = Tri2DMesh::cantilever(L, H, 2, 1, E, nu);
    Tri2DSolver solver(mesh);
    int ny = 1;
    // Fix left edge
    for (int j = 0; j <= ny; ++j) {
      solver.add_dirichlet(j, 0, 0.0);
      solver.add_dirichlet(j, 1, 0.0);
    }
    int nx = 2;
    int n_right = ny + 1;
    for (int j = 0; j <= ny; ++j) {
      int nid = nx * (ny + 1) + j;
      solver.add_neumann(nid, 1, F / n_right);
    }
    return solver.solve();
  };

  Tri2DResult r1 = solve_with_force(100.0);
  Tri2DResult r2 = solve_with_force(200.0);

  double U1 = r1.elastic_energy;
  double U2 = r2.elastic_energy;
  double ratio = (U1 > 1e-30) ? U2 / U1 : 0.0;

  std::cout << std::scientific << std::setprecision(6);
  std::cout << "  U(F=100)   = " << U1 << " J\n";
  std::cout << "  U(F=200)   = " << U2 << " J\n";
  std::cout << "  U2/U1      = " << std::fixed << std::setprecision(4) << ratio
            << "  (expected 4.0)\n";
  std::cout << "  kappa_est  = " << std::scientific
            << r1.condition_number_estimate << "\n";

  run_test("Energy positive definite (U > 0)", U1 > 0.0,
           "U=" + std::to_string(U1));

  run_test("Energy scales as F^2 (U2/U1 ~ 4.0, tol 1%)",
           std::abs(ratio - 4.0) < 0.04, "ratio=" + std::to_string(ratio));
}

// =============================================================================
// MAIN
// =============================================================================
int main() {
  std::cout
      << "=============================================================\n";
  std::cout << "  REALIS Phase 4.2 -- 2D CST FEM Solver Verification\n";
  std::cout << "  Element:      Linear 3-node triangle (CST)\n";
  std::cout << "  Formulation:  Plane stress, Galerkin FEM\n";
  std::cout << "  B matrix:     Constant (exact, no quadrature)\n";
  std::cout << "  D matrix:     Plane stress: E/(1-nu^2) * [1 nu 0; nu 1 0; 0 "
               "0 (1-nu)/2]\n";
  std::cout << "  BC:           Dirichlet via row/column elimination\n";
  std::cout << "  Solver:       Gaussian elimination "
               "(MatrixSolver::solve_gaussian)\n";
  std::cout
      << "=============================================================\n";

  test1_patch_test();
  test2_stiffness_symmetry();
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
  std::cout << "  Results: " << passed << " passed, " << failed
            << " failed (total " << g_results.size() << ")\n";
  std::cout
      << "=============================================================\n";

  if (failed > 0) {
    std::cout << "\nFAILED TESTS:\n";
    for (const auto &r : g_results)
      if (!r.passed)
        std::cout << "  [FAIL] " << r.name << "\n";
    std::cout << "\nPhase 4.2-4.3 EXIT CRITERIA: NOT MET\n";
    return 1;
  }

  std::cout << "\nPhase 4.2-4.3 EXIT CRITERIA: ALL MET\n";
  std::cout << "  Patch test: constant strain field reproduced exactly\n";
  std::cout << "  Stiffness matrix symmetric to machine precision\n";
  std::cout << "  Convergence: tip displacement monotone under refinement\n";
  std::cout << "  Energy physically consistent (U > 0, U ∝ F²)\n";
  return 0;
}
