





































#pragma once
#include "tri2d_mesh.hpp"
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <limits>
#include <map>
#include <stdexcept>
#include <vector>

namespace realis {
namespace fem {




struct Tri2DResult {
  std::vector<double>
      u; 
  double elastic_energy;            
  double condition_number_estimate; 
  bool converged;
};




class Tri2DSolver {
public:
  const Tri2DMesh &mesh;

  
  
  std::map<std::pair<int, int>, double> dirichlet_bcs;

  
  std::map<std::pair<int, int>, double> neumann_bcs;

  
  double body_force_x = 0.0;
  double body_force_y = 0.0;

  explicit Tri2DSolver(const Tri2DMesh &m) : mesh(m) {}

  
  
  
  
  void add_dirichlet(int node_id, int component, double value = 0.0) {
    if (node_id < 0 || node_id >= mesh.n_nodes())
      throw std::out_of_range("add_dirichlet: node_id out of range");
    if (component < 0 || component > 1)
      throw std::invalid_argument(
          "add_dirichlet: component must be 0 (u) or 1 (v)");
    dirichlet_bcs[{node_id, component}] = value;
  }

  
  
  
  void add_neumann(int node_id, int component, double force) {
    if (node_id < 0 || node_id >= mesh.n_nodes())
      throw std::out_of_range("add_neumann: node_id out of range");
    if (component < 0 || component > 1)
      throw std::invalid_argument("add_neumann: component must be 0 or 1");
    neumann_bcs[{node_id, component}] += force;
  }

  
  
  
  Tri2DResult solve() const {
    const int n_dof = mesh.n_dof();
    if (n_dof < 4)
      throw std::runtime_error("Tri2DSolver: mesh must have at least 2 nodes");
    if (dirichlet_bcs.empty())
      throw std::runtime_error("Tri2DSolver: need at least one Dirichlet BC "
                               "(removes rigid body modes)");

    
    std::vector<double> K(n_dof * n_dof, 0.0);
    std::vector<double> F(n_dof, 0.0);

    
    for (const auto &elem : mesh.elements)
      elem.assemble_stiffness(K, n_dof);

    
    if (body_force_x != 0.0 || body_force_y != 0.0)
      for (const auto &elem : mesh.elements)
        elem.assemble_body_force(F, body_force_x, body_force_y);

    
    for (const auto &kv : neumann_bcs) {
      int dof = 2 * kv.first.first + kv.first.second;
      F[dof] += kv.second;
    }

    
    double kdiag_max = 0.0;
    double kdiag_min = std::numeric_limits<double>::max();
    for (int i = 0; i < n_dof; ++i) {
      double d = K[i * n_dof + i];
      if (d > 1e-15) {
        kdiag_max = std::max(kdiag_max, d);
        kdiag_min = std::min(kdiag_min, d);
      }
    }
    double kappa = (kdiag_min > 1e-15)
                       ? kdiag_max / kdiag_min
                       : std::numeric_limits<double>::infinity();

    
    std::vector<double> K_orig = K;

    
    
    std::vector<std::pair<int, double>> constrained; 
    for (const auto &kv : dirichlet_bcs) {
      int dof = 2 * kv.first.first + kv.first.second;
      constrained.emplace_back(dof, kv.second);
    }
    
    std::sort(
        constrained.begin(), constrained.end(),
        [](const std::pair<int, double> &a, const std::pair<int, double> &b) {
          return a.first < b.first;
        });

    for (const auto &cv : constrained) {
      int d = cv.first;
      double ubar = cv.second;

      
      for (int i = 0; i < n_dof; ++i)
        if (i != d)
          F[i] -= K[i * n_dof + d] * ubar;

      
      for (int i = 0; i < n_dof; ++i) {
        K[d * n_dof + i] = 0.0;
        K[i * n_dof + d] = 0.0;
      }

      
      K[d * n_dof + d] = 1.0;
      F[d] = ubar;
    }

    
    
    
    
    
    
    
    
    
    std::vector<double> A(K); 
    std::vector<double> b(F); 

    bool ok = true;
    for (int col = 0; col < n_dof; ++col) {
      
      int pivot = col;
      double pivot_val = std::abs(A[col * n_dof + col]);
      for (int row = col + 1; row < n_dof; ++row) {
        double v = std::abs(A[row * n_dof + col]);
        if (v > pivot_val) {
          pivot_val = v;
          pivot = row;
        }
      }
      if (pivot_val < 1e-15) {
        ok = false;
        break;
      }

      
      if (pivot != col) {
        for (int j = 0; j < n_dof; ++j)
          std::swap(A[col * n_dof + j], A[pivot * n_dof + j]);
        std::swap(b[col], b[pivot]);
      }

      
      double inv_diag = 1.0 / A[col * n_dof + col];
      for (int row = col + 1; row < n_dof; ++row) {
        double factor = A[row * n_dof + col] * inv_diag;
        if (std::abs(factor) < 1e-30)
          continue;
        for (int j = col; j < n_dof; ++j)
          A[row * n_dof + j] -= factor * A[col * n_dof + j];
        b[row] -= factor * b[col];
      }
    }

    
    std::vector<double> u_sol(n_dof, 0.0);
    if (ok) {
      for (int i = n_dof - 1; i >= 0; --i) {
        double sum = b[i];
        for (int j = i + 1; j < n_dof; ++j)
          sum -= A[i * n_dof + j] * u_sol[j];
        u_sol[i] = sum / A[i * n_dof + i];
      }
    }

    Tri2DResult result;
    result.converged = ok;
    result.condition_number_estimate = kappa;

    if (!ok) {
      result.u.assign(n_dof, 0.0);
      result.elastic_energy = 0.0;
      return result;
    }

    
    result.u = u_sol;

    
    
    double energy = 0.0;
    for (int i = 0; i < n_dof; ++i) {
      double Ku_i = 0.0;
      for (int j = 0; j < n_dof; ++j)
        Ku_i += K_orig[i * n_dof + j] * result.u[j];
      energy += result.u[i] * Ku_i;
    }
    result.elastic_energy = 0.5 * energy;

    return result;
  }
};

} 
} 