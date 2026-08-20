


#pragma once
#include <array>
#include <cmath>
#include <stdexcept>
#include <vector>

namespace realis {
namespace fem {

class ThermoelasticBar1D {
public:
  int node_i; 
  int node_j; 

  double E;   
  double A;   
  double Le;  
  double rho; 

  
  double alpha; 
  double cv;    
  double k;     

  ThermoelasticBar1D(int i, int j, double youngs, double area, double length,
                     double density, double thermal_expansion,
                     double specific_heat, double conductivity)
      : node_i(i), node_j(j), E(youngs), A(area), Le(length), rho(density),
        alpha(thermal_expansion), cv(specific_heat), k(conductivity) {}

  
  
  
  
  void compute_nodal_forces(const std::vector<double> &u,
                            const std::vector<double> &T, double T_ref,
                            std::vector<double> &F) const {
    double k_e = (E * A) / Le;
    double u_i = u[node_i];
    double u_j = u[node_j];

    
    double f_elastic_i = k_e * (u_i - u_j);
    double f_elastic_j = k_e * (-u_i + u_j);

    
    double T_avg = 0.5 * (T[node_i] + T[node_j]);
    double delta_T = T_avg - T_ref;
    double f_thermal = E * A * alpha * delta_T;

    
    
    
    
    F[node_i] +=
        -f_elastic_i - f_thermal; 
    F[node_j] += -f_elastic_j + f_thermal; 
  }

  
  void assemble_lumped_mass(std::vector<double> &M) const {
    double element_mass = rho * A * Le;
    M[node_i] += 0.5 * element_mass;
    M[node_j] += 0.5 * element_mass;
  }

  
  
  
  void compute_heat_flux(const std::vector<double> &T,
                         std::vector<double> &Q_rate) const {
    double T_i = T[node_i];
    double T_j = T[node_j];

    
    double heat_flow = k * A * (T_i - T_j) / Le;

    
    Q_rate[node_i] -= heat_flow;
    Q_rate[node_j] += heat_flow;
  }

  
  double compute_strain_energy(const std::vector<double> &u,
                               const std::vector<double> &T,
                               double T_ref) const {
    double k_e = (E * A) / Le;
    double strain = (u[node_j] - u[node_i]) / Le;
    double T_avg = 0.5 * (T[node_i] + T[node_j]);
    double thermal_strain = alpha * (T_avg - T_ref);

    
    return 0.5 * E * A * Le * std::pow(strain - thermal_strain, 2.0);
  }
};

} 
} 