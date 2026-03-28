












































#pragma once
#include "../math/matrix_solver.hpp"
#include "bar1d_mesh.hpp"
#include <algorithm>
#include <cmath>
#include <limits>
#include <numeric>
#include <stdexcept>
#include <unordered_map>
#include <vector>

namespace realis {
namespace fem {




struct Bar1DResult {
  std::vector<double> u;            
  double elastic_energy;            
  double condition_number_estimate; 
  bool converged;                   
};




class Bar1DSolver {
public:
  const Bar1DMesh &mesh;

  
  std::unordered_map<int, double> dirichlet_bcs;

  
  std::unordered_map<int, double> neumann_bcs;

  
  double body_force = 0.0;

  explicit Bar1DSolver(const Bar1DMesh &m) : mesh(m) {}

  
  
  
  void add_dirichlet(int node_id, double prescribed_displacement) {
    if (node_id < 0 || node_id >= mesh.n_nodes())
      throw std::out_of_range("add_dirichlet: node_id out of range");
    dirichlet_bcs[node_id] = prescribed_displacement;
  }

  
  
  
  void add_neumann(int node_id, double force) {
    if (node_id < 0 || node_id >= mesh.n_nodes())
      throw std::out_of_range("add_neumann: node_id out of range");
    neumann_bcs[node_id] += force; 
  }

  
  
  
  
  
  Bar1DResult solve() const {
    const int n = mesh.n_nodes();
    if (n < 2)
      throw std::runtime_error("Bar1DSolver: mesh must have at least 2 nodes");
    if (dirichlet_bcs.empty())
      throw std::runtime_error("Bar1DSolver: at least one Dirichlet BC "
                               "required (prevents rigid body motion)");

    
    
    
    std::vector<double> K(n * n, 0.0);
    std::vector<double> F(n, 0.0);

    
    
    
    for (const auto &elem : mesh.elements) {
      elem.assemble_stiffness(K, n);
    }

    
    
    if (body_force != 0.0) {
      for (const auto &elem : mesh.elements) {
        elem.assemble_body_force(F, body_force);
      }
    }

    
    for (const auto &kv : neumann_bcs) {
      F[kv.first] += kv.second;
    }

    
    
    double kdiag_max = 0.0;
    double kdiag_min = std::numeric_limits<double>::max();
    for (int i = 0; i < n; ++i) {
      double d = K[i * n + i];
      if (d > 1e-15) {
        kdiag_max = std::max(kdiag_max, d);
        kdiag_min = std::min(kdiag_min, d);
      }
    }
    double kappa = (kdiag_min > 1e-15)
                       ? (kdiag_max / kdiag_min)
                       : std::numeric_limits<double>::infinity();

    
    
    
    std::vector<double> K_original = K;

    
    
    
    
    
    
    
    std::vector<int> constrained_dofs;
    constrained_dofs.reserve(dirichlet_bcs.size());
    for (const auto &kv : dirichlet_bcs) {
      constrained_dofs.push_back(kv.first);
    }
    std::sort(constrained_dofs.begin(), constrained_dofs.end());

    for (int d : constrained_dofs) {
      double u_bar = dirichlet_bcs.at(d);

      
      for (int i = 0; i < n; ++i) {
        if (i != d) {
          F[i] -= K[i * n + d] * u_bar;
        }
      }

      
      for (int i = 0; i < n; ++i) {
        K[d * n + i] = 0.0;
        K[i * n + d] = 0.0;
      }

      
      K[d * n + d] = 1.0;
      F[d] = u_bar;
    }

    
    
    
    
    
    
    
    
    
    
    std::vector<float> K_f(K.size());
    std::vector<float> F_f(n);
    for (size_t i = 0; i < K.size(); ++i)
      K_f[i] = static_cast<float>(K[i]);
    for (int i = 0; i < n; ++i)
      F_f[i] = static_cast<float>(F[i]);

    std::vector<float> u_f;
    bool ok = MatrixSolver::solve_gaussian(K_f, F_f, u_f);

    Bar1DResult result;
    result.converged = ok;
    result.condition_number_estimate = kappa;

    if (!ok) {
      result.u.assign(n, 0.0);
      result.elastic_energy = 0.0;
      return result;
    }

    
    result.u.resize(n);
    for (int i = 0; i < n; ++i)
      result.u[i] = static_cast<double>(u_f[i]);

    
    
    
    
    
    double energy = 0.0;
    for (int i = 0; i < n; ++i) {
      double Ku_i = 0.0;
      for (int j = 0; j < n; ++j) {
        Ku_i += K_original[i * n + j] * result.u[j];
      }
      energy += result.u[i] * Ku_i;
    }
    result.elastic_energy = 0.5 * energy;

    return result;
  }
};

} 
} 