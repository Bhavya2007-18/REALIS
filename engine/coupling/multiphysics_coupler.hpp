


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

  
  int fluid_boundary_cell; 
  int solid_boundary_node; 
  double contact_area;     

  MultiphysicsCoupler1D(fluids::FluidDomain1D *f_dom,
                        fluids::FVMSolver1D *f_sol, fem::CoupledSolid1D *s_dom,
                        int f_cell, int s_node, double area)
      : fluid(f_dom), fluid_solver(f_sol), solid(s_dom),
        fluid_boundary_cell(f_cell), solid_boundary_node(s_node),
        contact_area(area) {}

  
  double compute_global_timestep(double cfl) const {
    
    double dt_fluid = fluid_solver->compute_timestep(*fluid, cfl);

    
    double max_solid_c = 0.0;
    double min_Le = 1e6;
    for (const auto &el : solid->elements) {
      double c = std::sqrt(el.E / el.rho);
      max_solid_c = std::max(max_solid_c, c);
      min_Le = std::min(min_Le, el.Le);
    }
    double dt_solid = (max_solid_c == 0.0) ? 1.0 : (cfl * min_Le / max_solid_c);

    
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

  
  void step(double dt) {
    

    
    
    

    auto &boundary_state = fluid->cells[fluid_boundary_cell];
    double p_fluid =
        fluid_solver->get_pressure(boundary_state, fluid_solver->gamma);
    double force_on_solid = p_fluid * contact_area;

    
    
    double v_interface = solid->velocity[solid_boundary_node];

    
    double work_rate = force_on_solid * v_interface;

    
    
    
    double htc = 0.0; 
    double T_fluid = fluid_solver->get_temperature(
        boundary_state, fluid_solver->specific_heat_cv);
    double T_solid = solid->temperature[solid_boundary_node];
    double q_heat_rate = htc * contact_area * (T_fluid - T_solid); 

    

    
    solid->apply_traction(solid_boundary_node, force_on_solid);
    solid->apply_heat(solid_boundary_node, q_heat_rate);

    
    
    
    
    double cell_volume = contact_area * fluid->dx;
    boundary_state.E -= (work_rate + q_heat_rate) * (dt / cell_volume);

    
    fluid_solver->step(*fluid, dt);
    solid->step(dt);

    
    
    
  }

  
  
  
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

} 
} 