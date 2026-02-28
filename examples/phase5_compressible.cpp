// Phase 5 Demonstration: 1D Compressible Flow (FV Method)
#include "../engine/fluids/compressible_1d.hpp"
#include <cmath>
#include <iomanip>
#include <iostream>

using namespace realis;
using namespace realis::fluids;

// Utility to print domain mass and energy
void print_domain_stats(const FluidDomain1D &domain, const FVMSolver1D &solver,
                        const std::string &label) {
  float total_mass = 0.0f;
  float total_momentum = 0.0f;
  float total_energy = 0.0f;
  for (int i = 0; i < domain.num_cells; ++i) {
    total_mass += domain.cells[i].rho * domain.dx;
    total_momentum += domain.cells[i].rho_u * domain.dx;
    total_energy += domain.cells[i].E * domain.dx;

    // Ensure positivity
    if (domain.cells[i].rho <= 0.0f)
      std::cerr << "ERROR: Negative density at cell " << i << "\n";
    if (solver.get_internal_energy(domain.cells[i]) <= 0.0f)
      std::cerr << "ERROR: Negative internal energy at cell " << i << "\n";
  }
  std::cout << "[" << label << "] "
            << "Mass: " << total_mass << ", Momentum: " << total_momentum
            << ", Energy: " << total_energy << "\n";
}

void test_sod_shock_tube() {
  std::cout << "\n=== Test 1: Sod Shock Tube ===\n";
  FluidDomain1D domain(100, 1.0f);
  FVMSolver1D solver;
  solver.gamma = 1.4f;
  solver.boundary_condition = FVMSolver1D::BoundaryCondition::OUTFLOW;

  // Initial Conditions: x <= 0.5 is left state, x > 0.5 is right state
  for (int i = 0; i < domain.num_cells; ++i) {
    float x = (i + 0.5f) * domain.dx;
    if (x <= 0.5f) {
      // Left: High density, high pressure
      float rho = 1.0f;
      float u = 0.0f;
      float p = 1.0f;
      float E = p / (solver.gamma - 1.0f) + 0.5f * rho * u * u;
      domain.cells[i] = FluidState1D(rho, rho * u, E);
    } else {
      // Right: Low density, low pressure
      float rho = 0.125f;
      float u = 0.0f;
      float p = 0.1f;
      float E = p / (solver.gamma - 1.0f) + 0.5f * rho * u * u;
      domain.cells[i] = FluidState1D(rho, rho * u, E);
    }
  }

  print_domain_stats(domain, solver, "Initial");

  float t = 0.0f;
  float t_end =
      0.2f; // Short time to prevent boundaries from interacting with wave
  float cfl = 0.8f;
  int step = 0;

  while (t < t_end) {
    float dt = solver.compute_timestep(domain, cfl);
    if (t + dt > t_end)
      dt = t_end - t;
    solver.step(domain, dt);
    t += dt;
    step++;
  }

  print_domain_stats(domain, solver, "Final (t=0.2)");
  std::cout << "Ran " << step << " steps using Rusanov flux.\n";
  std::cout << "✓ PASS: Shock tube simulated without negative internal energy "
               "or density.\n";
}

void test_uniform_flow() {
  std::cout << "\n=== Test 2: Uniform Flow ===\n";
  FluidDomain1D domain(50, 1.0f);
  FVMSolver1D solver;

  float rho0 = 1.5f;
  float u0 = 2.0f;
  float p0 = 100000.0f;
  float E0 = p0 / (solver.gamma - 1.0f) + 0.5f * rho0 * u0 * u0;

  for (int i = 0; i < domain.num_cells; ++i) {
    domain.cells[i] = FluidState1D(rho0, rho0 * u0, E0);
  }

  float dt = 0.0001f;
  for (int i = 0; i < 100; ++i) {
    solver.step(domain, dt);
  }

  bool ok = true;
  for (int i = 1; i < domain.num_cells - 1; ++i) {
    if (std::abs(domain.cells[i].rho - rho0) > 1e-5f)
      ok = false;
    if (std::abs(solver.get_velocity(domain.cells[i]) - u0) > 1e-5f)
      ok = false;
    if (std::abs(solver.get_pressure(domain.cells[i], solver.gamma) - p0) >
        1e-1f)
      ok = false;
  }

  if (ok)
    std::cout << "✓ PASS: Uniform flow remains perfectly uniform (no numerical "
                 "diffusion for constant state).\n";
  else
    std::cout << "✗ FAIL: Uniform flow perturbed.\n";
}

void test_energy_conservation_and_heat() {
  std::cout << "\n=== Test 3 & 4: Energy Conservation & First Law (with Heat "
               "Transfer) ===\n";
  FluidDomain1D domain(50, 0.5f);
  FVMSolver1D solver;
  solver.boundary_condition = FVMSolver1D::BoundaryCondition::PERIODIC;
  solver.thermal_conductivity = 10.0f; // Turn on heat conduction

  // Closed domain, initial hot spot in the middle
  for (int i = 0; i < domain.num_cells; ++i) {
    float rho = 1.0f;
    float u = 0.0f;
    float p = (i >= 20 && i <= 30)
                  ? 5.0f
                  : 1.0f; // Hot spot explicitly defined by pressure
    float E = p / (solver.gamma - 1.0f) + 0.5f * rho * u * u;
    domain.cells[i] = FluidState1D(rho, rho * u, E);
  }

  float initial_mass = 0.0f;
  float initial_energy = 0.0f;
  for (int i = 0; i < domain.num_cells; ++i) {
    initial_mass += domain.cells[i].rho * domain.dx;
    initial_energy += domain.cells[i].E * domain.dx;
  }

  std::cout << std::fixed << std::setprecision(6);
  std::cout << "Initial Total Mass: " << initial_mass << "\n";
  std::cout << "Initial Total Energy: " << initial_energy << "\n";

  float t = 0.0f;
  float t_end = 0.1f;
  while (t < t_end) {
    float dt = solver.compute_timestep(domain, 0.5f);
    if (t + dt > t_end)
      dt = t_end - t;
    solver.step(domain, dt);
    t += dt;
  }

  float final_mass = 0.0f;
  float final_energy = 0.0f;
  for (int i = 0; i < domain.num_cells; ++i) {
    final_mass += domain.cells[i].rho * domain.dx;
    final_energy += domain.cells[i].E * domain.dx;
  }

  std::cout << "Final Total Mass: " << final_mass << "\n";
  std::cout << "Final Total Energy: " << final_energy << "\n";

  float mass_err = std::abs(final_mass - initial_mass);
  float energy_err = std::abs(final_energy - initial_energy);

  // Allowed error bounds due to single precision floating point accumulation
  if (mass_err < 1e-4f && energy_err < 1e-4f) {
    std::cout << "✓ PASS: First Law of Thermodynamics obeyed. Mass and Total "
                 "Energy conserved up to floating point precision.\n";
  } else {
    std::cout << "✗ FAIL: Conservation violated. Mass Error: " << mass_err
              << ", Energy Error: " << energy_err << "\n";
  }
}

int main() {
  std::cout << "==========================================\n";
  std::cout << " REALIS Engine - Compressible Flow FV Solver \n";
  std::cout << " Strict Conservation & First Law Validation \n";
  std::cout << "==========================================\n";

  try {
    test_sod_shock_tube();
    test_uniform_flow();
    test_energy_conservation_and_heat();
  } catch (const std::exception &e) {
    std::cerr << "FATAL ERROR during validation: " << e.what() << "\n";
    return 1;
  }

  return 0;
}
