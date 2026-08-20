















































#pragma once
#include <array>
#include <cmath>
#include <stdexcept>
#include <vector>


namespace realis {
namespace fem {














class Bar1DElement {
public:
  int node_i; 
  int node_j; 
  double E;   
  double A;   
  double Le;  

  Bar1DElement(int i, int j, double youngs_modulus, double area, double length)
      : node_i(i), node_j(j), E(youngs_modulus), A(area), Le(length) {
    if (Le <= 0.0)
      throw std::invalid_argument(
          "Bar1DElement: element length must be positive");
    if (E <= 0.0)
      throw std::invalid_argument(
          "Bar1DElement: Young's modulus must be positive");
    if (A <= 0.0)
      throw std::invalid_argument(
          "Bar1DElement: cross-sectional area must be positive");
  }

  
  
  
  
  
  
  std::array<std::array<double, 2>, 2> local_stiffness() const {
    double k = (E * A) / Le;
    return {{{k, -k}, {-k, k}}};
  }

  
  
  
  
  
  
  
  
  
  
  void assemble_stiffness(std::vector<double> &K, int n_dof) const {
    auto ke = local_stiffness();
    const int dofs[2] = {node_i, node_j};

    for (int r = 0; r < 2; ++r) {
      for (int c = 0; c < 2; ++c) {
        K[dofs[r] * n_dof + dofs[c]] += ke[r][c];
      }
    }
  }

  
  
  
  
  
  
  
  
  void assemble_body_force(std::vector<double> &F, double f_body) const {
    double fe = f_body * Le * 0.5;
    F[node_i] += fe;
    F[node_j] += fe;
  }
};

} 
} 