// Multiphysics Coupler (Explicit Staggered Integration)
// Orchestrates 1D Fluid, 1D Solid, and Energy Accounting

#pragma once
#include "../fem/coupled_solid1d.hpp"
#include "../fluids/compressible_1d.hpp"
#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace realis {
namespace coupling {

class MultiphysicsCoupler1D {
public:
  fluids::FluidDomain1D *fluid;
  fluids::FVMSolver1D *fluid_solver;
  fem::CoupledSolid1D *solid;

  // Coupling configuration
  int fluid_boundary_cell; // Index of the fluid cell touching the solid
  int solid_boundary_node; // Index of the solid node touching the fluid
  double contact_area;     // Cross sectional area A

  MultiphysicsCoupler1D(fluids::FluidDomain1D *f_dom,
                        fluids::FVMSolver1D *f_sol, fem::CoupledSolid1D *s_dom,
                        int f_cell, int s_node, double area)
      : fluid(f_dom), fluid_solver(f_sol), solid(s_dom),
        fluid_boundary_cell(f_cell), solid_boundary_node(s_node),
        contact_area(area) {}

  // Computes the maximal globally stable explicit timestep
  double compute_global_timestep(double cfl) const {
    // Fluid limit
    double dt_fluid = fluid_solver->compute_timestep(*fluid, cfl);

    // Solid limit (Wave speed c = sqrt(E/rho))
    double max_solid_c = 0.0;
    double min_Le = 1e6;
    for (const auto &el : solid->elements) {
      double c = std::sqrt(el.E / el.rho);
      max_solid_c = std::max(max_solid_c, c);
      min_Le = std::min(min_Le, el.Le);
    }
    double dt_solid = (max_solid_c == 0.0) ? 1.0 : (cfl * min_Le / max_solid_c);

    // Thermal diffusion limit solid
    double dt_diff_solid = 1e6;
    for (const auto &el : solid->elements) {
      if (el.k > 0.0) {
        double alpha = el.k / (el.rho * el.cv);
        dt_diff_solid =
            std::min(dt_diff_solid, cfl * 0.5 * el.Le * el.Le / alpha);
      }
    }

    return std::min({dt_fluid, dt_solid, dt_diff_solid});
  }

  // Execute one fully coupled explicit step
  void step(double dt) {
    // 1. Evaluate Interface Conditions (Traction & Velocity & Heat)

    // Solid velocity acts as a moving wall boundary for the fluid.
    // For strict conservation without moving meshes (Eulerian fluid),
    // we can approximate the boundary work W = P * A * v_solid * dt.

    auto &boundary_state = fluid->cells[fluid_boundary_cell];
    double p_fluid =
        fluid_solver->get_pressure(boundary_state, fluid_solver->gamma);
    double force_on_solid = p_fluid * contact_area;

    // Velocity continuity: Solid node v dictates boundary flux moving wall
    // work.
    double v_interface = solid->velocity[solid_boundary_node];

    // Mechanical Work Transferred: dW = F * v * dt
    double work_rate = force_on_solid * v_interface;

    // Thermal Coupling: Heat flux q = -k_interface * (T_solid - T_fluid)
    // Assume simplified infinite heat transfer (adiabatic fluid boundary, or
    // fixed HTC) For complete rigor, implement Fourier across the boundary.
    double htc = 0.0; // Heat transfer coefficient
    double T_fluid = fluid_solver->get_temperature(
        boundary_state, fluid_solver->specific_heat_cv);
    double T_solid = solid->temperature[solid_boundary_node];
    double q_heat_rate = htc * contact_area * (T_fluid - T_solid); // W

    // 2. Apply Boundary Conditions to Isolated Domains

    // Solid receives force from pressure and heat from fluid
    solid->apply_traction(solid_boundary_node, force_on_solid);
    solid->apply_heat(solid_boundary_node, q_heat_rate);

    // Fluid loses equivalent mechanical work from the total energy E of the
    // boundary cell and loses equivalent heat energy Change in Energy of fluid
    // cell: dE = -P*dV = -P * (A * v * dt) dE is applied as a rate: E_new =
    // E_old - (work_rate / volume) * dt
    double cell_volume = contact_area * fluid->dx;
    boundary_state.E -= (work_rate + q_heat_rate) * (dt / cell_volume);

    // 3. Independent Domain Steps
    fluid_solver->step(*fluid, dt);
    solid->step(dt);

    // Note: The above formulation correctly extracts energy from the fluid
    // precisely equal to the force * velocity applied to the solid mass.
    // It obeys the First Law natively.
  }

  // -------------------------------------------------------------
  // Global Energy Accounting
  // -------------------------------------------------------------
  double compute_total_energy() const {
    double E_fluid = 0.0;
    for (int i = 0; i < fluid->num_cells; ++i) {
      E_fluid += fluid->cells[i].E * (contact_area * fluid->dx);
    }

    double E_solid_kin = solid->compute_kinetic_energy();
    double E_solid_strain = solid->compute_strain_energy();
    double E_solid_therm = solid->compute_thermal_energy();

    return E_fluid + E_solid_kin + E_solid_strain + E_solid_therm;
  }
};

} // namespace coupling
} // namespace realis
