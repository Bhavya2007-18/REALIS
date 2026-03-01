// Phase 8: Formal Verification & Validation Master Suite
// Proves every solver with error quantification, regression detection, and
// stability mapping

#include "../engine/fluids/compressible_1d.hpp"
#include "../engine/verification/benchmark_library.hpp"
#include "../engine/verification/conservation_tracker.hpp"
#include "../engine/verification/error_norms.hpp"
#include "../engine/verification/regression_harness.hpp"
#include "../engine/verification/stability_mapper.hpp"
#include "../engine/verification/version_tracker.hpp"


#include <cmath>
#include <iomanip>
#include <iostream>
#include <vector>


using namespace realis;
using namespace realis::verification;
using namespace realis::fluids;

// ═══════════════════════════════════════════
// Test 1: Convergence Order Verification
// ═══════════════════════════════════════════
void test_convergence_order() {
  std::cout << "\n=== Test 1: Convergence Order Verification ===\n";

  // Problem: Integrate y'' = -g (free-fall) with explicit Euler at two timestep
  // sizes. Euler is O(dt^1). Observed convergence rate p should be ~1.0.
  double g = 9.81;
  double t_end = 1.0;
  double y_exact = 0.5 * g * t_end * t_end;

  // Coarse: dt = 0.1
  double dt_coarse = 0.1;
  int n_coarse = static_cast<int>(t_end / dt_coarse);
  double v_c = 0.0, y_c = 0.0;
  for (int i = 0; i < n_coarse; ++i) {
    v_c += g * dt_coarse;
    y_c += v_c * dt_coarse;
  }
  double err_coarse = std::abs(y_c - y_exact);

  // Fine: dt = 0.01
  double dt_fine = 0.01;
  int n_fine = static_cast<int>(t_end / dt_fine);
  double v_f = 0.0, y_f = 0.0;
  for (int i = 0; i < n_fine; ++i) {
    v_f += g * dt_fine;
    y_f += v_f * dt_fine;
  }
  double err_fine = std::abs(y_f - y_exact);

  double p = ErrorNorms::compute_convergence_rate(err_coarse, err_fine,
                                                  dt_coarse, dt_fine);

  std::cout << "  Coarse (dt=" << dt_coarse << "): y=" << y_c
            << " err=" << err_coarse << "\n";
  std::cout << "  Fine   (dt=" << dt_fine << "): y=" << y_f
            << " err=" << err_fine << "\n";
  std::cout << "  Observed convergence order p = " << std::fixed
            << std::setprecision(3) << p << "\n";

  // Symplectic Euler for constant acceleration is exactly O(1) in position
  if (std::abs(p - 1.0) < 0.15) {
    std::cout << "  [PASS] Convergence order matches theoretical prediction "
                 "(p~1 for Euler).\n";
  } else {
    std::cout << "  [FAIL] Unexpected convergence order.\n";
  }
}

// ═══════════════════════════════════════════
// Test 2: Regression Failure Detection
// ═══════════════════════════════════════════
void test_regression_detection() {
  std::cout << "\n=== Test 2: Regression Failure Detection ===\n";

  RegressionHarness harness;
  double g_correct = 9.81;

  // Register correct baseline
  harness.register_test(
      "Free-Fall y(1s)",
      [g_correct]() {
        double v = 0, y = 0, dt = 0.001;
        for (int i = 0; i < 1000; ++i) {
          v += g_correct * dt;
          y += v * dt;
        }
        return y;
      },
      4.91405, 1e-3);

  // Register WITH intentional perturbation (1% gravity change)
  double g_perturbed = 9.81 * 1.01;
  harness.register_test(
      "Free-Fall PERTURBED (should FAIL)",
      [g_perturbed]() {
        double v = 0, y = 0, dt = 0.001;
        for (int i = 0; i < 1000; ++i) {
          v += g_perturbed * dt;
          y += v * dt;
        }
        return y;
      },
      4.91405, 1e-3); // Same baseline, but perturbed physics

  auto results = harness.run_all();

  // Verify: first should pass, second should fail
  if (results[0].passed && !results[1].passed) {
    std::cout << "\n  [PASS] Regression harness correctly detected intentional "
                 "perturbation.\n";
  } else {
    std::cout << "\n  [FAIL] Regression harness did not behave as expected.\n";
  }
}

// ═══════════════════════════════════════════
// Test 3: Conservation Residual Reporting
// ═══════════════════════════════════════════
void test_conservation_reporting() {
  std::cout << "\n=== Test 3: Conservation Residual Reporting ===\n";

  // Run Sod shock tube with PERIODIC boundaries (closed system)
  FluidDomain1D fluid(50, 1.0);
  FVMSolver1D solver;
  solver.boundary_condition = FVMSolver1D::BoundaryCondition::PERIODIC;

  for (int i = 0; i < fluid.num_cells; ++i) {
    double rho = (i < 25) ? 1.0 : 0.125;
    double p = (i < 25) ? 1.0 : 0.1;
    double E = p / (solver.gamma - 1.0);
    fluid.cells[i] = FluidState1D(rho, 0.0, E);
  }

  double init_mass = 0, init_energy = 0, init_momentum = 0;
  for (int i = 0; i < fluid.num_cells; ++i) {
    init_mass += fluid.cells[i].rho * fluid.dx;
    init_energy += fluid.cells[i].E * fluid.dx;
    init_momentum += fluid.cells[i].rho_u * fluid.dx;
  }

  double t = 0;
  while (t < 0.1) {
    double dt = solver.compute_timestep(fluid, 0.5);
    if (t + dt > 0.1)
      dt = 0.1 - t;
    solver.step(fluid, dt);
    t += dt;
  }

  double final_mass = 0, final_energy = 0, final_momentum = 0;
  for (int i = 0; i < fluid.num_cells; ++i) {
    final_mass += fluid.cells[i].rho * fluid.dx;
    final_energy += fluid.cells[i].E * fluid.dx;
    final_momentum += fluid.cells[i].rho_u * fluid.dx;
  }

  ConservationResiduals residuals;
  residuals.compute(init_mass, final_mass, init_energy, final_energy,
                    init_momentum, final_momentum);
  residuals.report("Sod Shock Tube (Periodic)");

  if (residuals.check_thresholds(1e-6)) {
    std::cout
        << "  [PASS] All conservation residuals within formal tolerance.\n";
  } else {
    std::cout << "  [FAIL] Conservation violation detected.\n";
  }
}

// ═══════════════════════════════════════════
// Test 4: Timestep Stability Map
// ═══════════════════════════════════════════
void test_stability_map() {
  std::cout << "\n=== Test 4: Timestep Stability Map ===\n";

  auto fluid_runner = [](double dt) -> std::pair<double, double> {
    FluidDomain1D fluid(20, 1.0);
    FVMSolver1D solver;
    solver.boundary_condition = FVMSolver1D::BoundaryCondition::PERIODIC;

    for (int i = 0; i < fluid.num_cells; ++i) {
      double rho = 1.0;
      double p = 1.0;
      double E = p / (solver.gamma - 1.0);
      fluid.cells[i] = FluidState1D(rho, 0.0, E);
    }

    double init_energy = 0;
    for (int i = 0; i < fluid.num_cells; ++i)
      init_energy += fluid.cells[i].E * fluid.dx;

    // Run 50 steps at this dt
    for (int step = 0; step < 50; ++step) {
      try {
        solver.step(fluid, dt);
      } catch (...) {
        return {1e10, 1e10};
      }
    }

    double final_energy = 0;
    for (int i = 0; i < fluid.num_cells; ++i)
      final_energy += fluid.cells[i].E * fluid.dx;

    double drift = std::abs(final_energy - init_energy) / init_energy;
    return {drift, drift}; // Use drift as both metrics for uniform flow
  };

  // CFL-safe dt for this setup is about 0.03 (dx=0.05, c~1.3)
  std::vector<StabilityPoint> map = StabilityMapper::sweep(fluid_runner, 0.005, 0.05, 8, 1e-4);
  StabilityMapper::print_table(map, "Compressible Fluid Solver");

  double critical = StabilityMapper::find_critical_dt(map);
  std::cout << "  Critical dt (stability boundary): " << critical << "\n";
}

// ═══════════════════════════════════════════
// Test 5: Versioned Result Tracking
// ═══════════════════════════════════════════
void test_version_tracking() {
  std::cout << "\n=== Test 5: Versioned Result Tracking ===\n";

  // Simulate V1 result
  std::vector<double> state_v1 = {4.905, 9.81, 0.0, 1.0};
  SimulationFingerprint fp_v1;
  fp_v1.solver_version = "REALIS v0.8.0";
  fp_v1.timestep = 0.001;
  fp_v1.mesh_size = 100;
  fp_v1.material_params = "g=9.81,rho=1.0";
  fp_v1.state_hash = SimulationFingerprint::compute_state_hash(state_v1);

  // V2: identical run (should match)
  SimulationFingerprint fp_v2 = fp_v1;
  auto cmp1 = VersionTracker::compare(fp_v1, fp_v2);
  std::cout << "  [Identical Run]\n";
  cmp1.report();

  // V3: solver version bumped, slight numerical change
  SimulationFingerprint fp_v3 = fp_v1;
  fp_v3.solver_version = "REALIS v0.8.1";
  std::vector<double> state_v3 = {4.905001, 9.81, 0.0, 1.0}; // Tiny drift
  fp_v3.state_hash = SimulationFingerprint::compute_state_hash(state_v3);

  auto cmp2 = VersionTracker::compare(fp_v1, fp_v3);
  std::cout << "\n  [Version Bump + Drift]\n";
  cmp2.report();

  if (cmp1.state_matched && !cmp2.state_matched) {
    std::cout << "\n  [PASS] Version tracker correctly identified drift on "
                 "solver update.\n";
  } else {
    std::cout << "\n  [FAIL] Version tracking misbehaved.\n";
  }
}

int main() {
  std::cout << "══════════════════════════════════════════════\n";
  std::cout << " REALIS Engine — Formal V&V Framework\n";
  std::cout << " Every solver must prove itself.\n";
  std::cout << "══════════════════════════════════════════════\n";

  try {
    test_convergence_order();
    test_regression_detection();
    test_conservation_reporting();
    test_stability_map();
    test_version_tracking();
  } catch (const std::exception &e) {
    std::cerr << "FATAL V&V ERROR: " << e.what() << "\n";
    return 1;
  }

  std::cout << "\n══════════════════════════════════════════════\n";
  std::cout << " V&V Suite Complete.\n";
  std::cout << "══════════════════════════════════════════════\n";
  return 0;
}
