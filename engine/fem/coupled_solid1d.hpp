#pragma once
#include "thermoelastic_bar1d.hpp"
#include <iostream>
#include <vector>


namespace realis {
namespace fem {


class CoupledSolid1D {
public:
  int num_nodes;
  double T_reference; 

  std::vector<double> position;     
  std::vector<double> displacement; 
  std::vector<double> velocity;     
  std::vector<double> mass;         

  std::vector<double> temperature; 
  std::vector<double> force_ext;   
  std::vector<double> heat_rate;   

  std::vector<bool> is_fixed;

  std::vector<ThermoelasticBar1D> elements;

  CoupledSolid1D(int n_nodes, double ref_temp)
      : num_nodes(n_nodes), T_reference(ref_temp), position(n_nodes, 0.0),
        displacement(n_nodes, 0.0), velocity(n_nodes, 0.0), mass(n_nodes, 0.0),
        temperature(n_nodes, ref_temp), force_ext(n_nodes, 0.0),
        heat_rate(n_nodes, 0.0), is_fixed(n_nodes, false) {}

  void build_mass_matrix() {
    std::fill(mass.begin(), mass.end(), 0.0);
    for (const auto &el : elements) {
      el.assemble_lumped_mass(mass);
    }
  }

  void apply_traction(int node_idx, double force) {
    force_ext[node_idx] += force;
  }

  void apply_heat(int node_idx, double power) { heat_rate[node_idx] += power; }

  void add_rigid_mass(int node_idx, double m_rigid) {
    mass[node_idx] += m_rigid;
    
    
    
    
    
    
    
  }

  
  void step(double dt) {
    std::vector<double> F_total(num_nodes, 0.0);

    
    for (int i = 0; i < num_nodes; ++i) {
      F_total[i] = force_ext[i]; 
    }

    for (const auto &el : elements) {
      el.compute_nodal_forces(displacement, temperature, T_reference, F_total);
      el.compute_heat_flux(temperature, heat_rate); 
    }

    
    for (int i = 0; i < num_nodes; ++i) {
      if (is_fixed[i]) {
        velocity[i] = 0.0;
        displacement[i] = 0.0; 
        continue;
      }

      
      double accel = F_total[i] / mass[i];
      velocity[i] += accel * dt;
      displacement[i] += velocity[i] * dt;
      position[i] += velocity[i] * dt;

      
      
      
      
      double cv = elements[0].cv;
      double dT = (heat_rate[i] / (mass[i] * cv)) * dt;
      temperature[i] += dT;
    }

    
    std::fill(force_ext.begin(), force_ext.end(), 0.0);
    std::fill(heat_rate.begin(), heat_rate.end(), 0.0);
  }

  
  double compute_kinetic_energy() const {
    double ke = 0.0;
    for (int i = 0; i < num_nodes; ++i) {
      ke += 0.5 * mass[i] * velocity[i] * velocity[i];
    }
    return ke;
  }

  double compute_strain_energy() const {
    double se = 0.0;
    for (const auto &el : elements) {
      se += el.compute_strain_energy(displacement, temperature, T_reference);
    }
    return se;
  }

    double compute_thermal_energy() const {
        double te = 0.0;
        if (elements.empty()) return 0.0;
        
        
        
        std::vector<double> base_mass(num_nodes, 0.0);
        for (const auto& el : elements) {
            double em = el.rho * el.A * el.Le;
            base_mass[el.node_i] += 0.5 * em;
            base_mass[el.node_j] += 0.5 * em;
        }

        double cv = elements[0].cv;
        for (int i = 0; i < num_nodes; ++i) {
            te += base_mass[i] * cv * temperature[i];
        }
        return te;
    }
};

} 
} 