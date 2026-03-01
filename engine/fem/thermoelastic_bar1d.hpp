// 1D Thermoelastic Bar Element (Linear Extension)
// Specialized for rigorous 1D energy tracking and thermal expansion

#pragma once
#include <array>
#include <cmath>
#include <stdexcept>
#include <vector>

namespace realis {
namespace fem {

class ThermoelasticBar1D {
public:
  int node_i; // Left node
  int node_j; // Right node

  double E;   // Young's modulus [Pa]
  double A;   // Area [m^2]
  double Le;  // Rest length [m]
  double rho; // Density [kg/m^3]

  // Thermal properties
  double alpha; // Thermal expansion coefficient [1/K]
  double cv;    // Specific heat [J/(kg.K)]
  double k;     // Thermal conductivity [W/(m.K)]

  ThermoelasticBar1D(int i, int j, double youngs, double area, double length,
                     double density, double thermal_expansion,
                     double specific_heat, double conductivity)
      : node_i(i), node_j(j), E(youngs), A(area), Le(length), rho(density),
        alpha(thermal_expansion), cv(specific_heat), k(conductivity) {}

  // Computes nodal elastic and thermal forces based on displacements (u) and
  // temperatures (T) F_internal = K * u - F_thermal F_thermal = int( B^T * E *
  // alpha * (T_avg - T_ref) ) A dx For linear element: F_th = E * A * alpha *
  // \Delta T * [-1, 1]^T
  void compute_nodal_forces(const std::vector<double> &u,
                            const std::vector<double> &T, double T_ref,
                            std::vector<double> &F) const {
    double k_e = (E * A) / Le;
    double u_i = u[node_i];
    double u_j = u[node_j];

    // Elastic forces: K * u
    double f_elastic_i = k_e * (u_i - u_j);
    double f_elastic_j = k_e * (-u_i + u_j);

    // Thermal forces: E * A * alpha * \Delta T
    double T_avg = 0.5 * (T[node_i] + T[node_j]);
    double delta_T = T_avg - T_ref;
    double f_thermal = E * A * alpha * delta_T;

    // Total internal force (remember F_internal is SUBTRACTED from rhs in M a =
    // F_ext - F_int) Here we compute F_int, so later: a = (F_ext - F_int) / M.
    // Or directly provide the "restoring force" which is -F_int.
    // Let's compute the force APPLIED to the nodes: -K*u + F_th
    F[node_i] +=
        -f_elastic_i - f_thermal; // - (-f_th) = -f_th because B_1 = -1/L
    F[node_j] += -f_elastic_j + f_thermal; // B_2 = +1/L
  }

  // Computes mass matrix components (Lumped Mass)
  void assemble_lumped_mass(std::vector<double> &M) const {
    double element_mass = rho * A * Le;
    M[node_i] += 0.5 * element_mass;
    M[node_j] += 0.5 * element_mass;
  }

  // Heat conduction: q = -k * dT/dx
  // Updates the rate of change of temperature for the nodes
  // Energy equation: rho * c * V * dT_node/dt = Q_in - Q_out
  void compute_heat_flux(const std::vector<double> &T,
                         std::vector<double> &Q_rate) const {
    double T_i = T[node_i];
    double T_j = T[node_j];

    // Heat flowing from i to j [Watts]
    double heat_flow = k * A * (T_i - T_j) / Le;

    // Rate of heat going into node j, out of node i
    Q_rate[node_i] -= heat_flow;
    Q_rate[node_j] += heat_flow;
  }

  // Exact internal strain energy
  double compute_strain_energy(const std::vector<double> &u,
                               const std::vector<double> &T,
                               double T_ref) const {
    double k_e = (E * A) / Le;
    double strain = (u[node_j] - u[node_i]) / Le;
    double T_avg = 0.5 * (T[node_i] + T[node_j]);
    double thermal_strain = alpha * (T_avg - T_ref);

    // U = 0.5 * E * A * L * (epsilon_total - epsilon_thermal)^2
    return 0.5 * E * A * Le * std::pow(strain - thermal_strain, 2.0);
  }
};

} // namespace fem
} // namespace realis
