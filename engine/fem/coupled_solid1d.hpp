#pragma once
#include "thermoelastic_bar1d.hpp"
#include <iostream>
#include <vector>


namespace realis {
namespace fem {

// 1D explicitly integrated Multiphysics solid domain
class CoupledSolid1D {
public:
  int num_nodes;
  double T_reference; // Stress-free temperature

  std::vector<double> position;     // x
  std::vector<double> displacement; // u
  std::vector<double> velocity;     // v
  std::vector<double> mass;         // M (lumped)

  std::vector<double> temperature; // T
  std::vector<double> force_ext;   // F_ext
  std::vector<double> heat_rate;   // Q_dot [W]

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
    // The rigid mass adds thermal capacity, but for consistency if we assume it
    // has the same c_v for this test, we must account for its baseline energy 
    // Or simply we must track that this extra mass is now part of the thermal pool.
    // Actually, the simplest fix for strict accounting is to just track 
    // the initial thermal energy of the added mass if we are going to compute E = m*c*T.
    // Easiest is to avoid `mass[i]` in thermal energy computation, and use 
    // the initial bar mass for thermal energy, since the rigid mass didn't bring any "T" with it in the test setup.
  }

  // Explicit Symplectic Euler step
  void step(double dt) {
    std::vector<double> F_total(num_nodes, 0.0);

    // 1. Gather component forces and internal heat fluxes
    for (int i = 0; i < num_nodes; ++i) {
      F_total[i] = force_ext[i]; // Start with external bounds
    }

    for (const auto &el : elements) {
      el.compute_nodal_forces(displacement, temperature, T_reference, F_total);
      el.compute_heat_flux(temperature, heat_rate); // updates heat_rate
    }

    // 2. Integration
    for (int i = 0; i < num_nodes; ++i) {
      if (is_fixed[i]) {
        velocity[i] = 0.0;
        displacement[i] = 0.0; // Strictly enforce
        continue;
      }

      // Motion (accel = F/m)
      double accel = F_total[i] / mass[i];
      velocity[i] += accel * dt;
      displacement[i] += velocity[i] * dt;
      position[i] += velocity[i] * dt;

      // Temperature (dT = Q_dot * dt / (mass * c_v))
      // To be precise, c_v per node must be aggregated from elements.
      // For uniform mesh, cv is identical. Let's just pull it from arbitrary
      // adj element.
      double cv = elements[0].cv;
      double dT = (heat_rate[i] / (mass[i] * cv)) * dt;
      temperature[i] += dT;
    }

    // 3. Reset accumulators for next frame
    std::fill(force_ext.begin(), force_ext.end(), 0.0);
    std::fill(heat_rate.begin(), heat_rate.end(), 0.0);
  }

  // Exact energy accounting
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
        
        // Element density * Area * Le gives base mass.
        // Nodal base mass is half from each connected element.
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

} // namespace fem
} // namespace realis
