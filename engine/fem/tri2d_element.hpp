































































































#pragma once
#include <array>
#include <cmath>
#include <stdexcept>
#include <vector>

namespace realis {
namespace fem {










class Tri2DElement {
public:
  int node[3];       
  double x[3], y[3]; 
  double E;          
  double nu;         
  double t;          

  Tri2DElement(int n0, int n1, int n2, double x0, double y0, double x1,
               double y1, double x2, double y2, double E_, double nu_,
               double t_ = 1.0)
      : E(E_), nu(nu_), t(t_) {
    node[0] = n0;
    node[1] = n1;
    node[2] = n2;
    x[0] = x0;
    x[1] = x1;
    x[2] = x2;
    y[0] = y0;
    y[1] = y1;
    y[2] = y2;

    if (E <= 0.0)
      throw std::invalid_argument("Tri2DElement: E must be positive");
    if (nu <= 0.0 || nu >= 0.5)
      throw std::invalid_argument("Tri2DElement: nu must be in (0, 0.5)");

    
    double two_ae =
        (x[1] - x[0]) * (y[2] - y[0]) - (x[2] - x[0]) * (y[1] - y[0]);
    if (two_ae < 1e-30)
      throw std::invalid_argument(
          "Tri2DElement: degenerate or CW-oriented triangle");
  }

  
  
  
  
  
  double area() const {
    return 0.5 *
           ((x[1] - x[0]) * (y[2] - y[0]) - (x[2] - x[0]) * (y[1] - y[0]));
  }

  
  
  
  
  
  
  
  
  
  std::array<double, 18> b_matrix() const {
    double two_ae = 2.0 * area();
    
    double b1 = y[1] - y[2];
    double b2 = y[2] - y[0];
    double b3 = y[0] - y[1];
    double c1 = x[2] - x[1];
    double c2 = x[0] - x[2];
    double c3 = x[1] - x[0];

    std::array<double, 18> B{};
    double inv = 1.0 / two_ae;

    
    B[0 * 6 + 0] = b1 * inv;
    B[0 * 6 + 1] = 0.0;
    B[0 * 6 + 2] = b2 * inv;
    B[0 * 6 + 3] = 0.0;
    B[0 * 6 + 4] = b3 * inv;
    B[0 * 6 + 5] = 0.0;

    
    B[1 * 6 + 0] = 0.0;
    B[1 * 6 + 1] = c1 * inv;
    B[1 * 6 + 2] = 0.0;
    B[1 * 6 + 3] = c2 * inv;
    B[1 * 6 + 4] = 0.0;
    B[1 * 6 + 5] = c3 * inv;

    
    B[2 * 6 + 0] = c1 * inv;
    B[2 * 6 + 1] = b1 * inv;
    B[2 * 6 + 2] = c2 * inv;
    B[2 * 6 + 3] = b2 * inv;
    B[2 * 6 + 4] = c3 * inv;
    B[2 * 6 + 5] = b3 * inv;

    return B;
  }

  
  
  
  
  
  
  
  std::array<double, 9> d_matrix() const {
    double fac = E / (1.0 - nu * nu);
    std::array<double, 9> D{};
    D[0 * 3 + 0] = fac * 1.0;
    D[0 * 3 + 1] = fac * nu;
    D[0 * 3 + 2] = 0.0;
    D[1 * 3 + 0] = fac * nu;
    D[1 * 3 + 1] = fac * 1.0;
    D[1 * 3 + 2] = 0.0;
    D[2 * 3 + 0] = 0.0;
    D[2 * 3 + 1] = 0.0;
    D[2 * 3 + 2] = fac * (1.0 - nu) * 0.5;
    return D;
  }

  
  
  
  
  
  std::array<double, 36> local_stiffness() const {
    auto B = b_matrix(); 
    auto D = d_matrix(); 
    double Ae = area();

    
    std::array<double, 18> DB{};
    for (int r = 0; r < 3; ++r)
      for (int c = 0; c < 6; ++c)
        for (int k = 0; k < 3; ++k)
          DB[r * 6 + c] += D[r * 3 + k] * B[k * 6 + c];

    
    std::array<double, 36> ke{};
    for (int r = 0; r < 6; ++r)
      for (int c = 0; c < 6; ++c)
        for (int k = 0; k < 3; ++k)
          ke[r * 6 + c] +=
              B[k * 6 + r] * DB[k * 6 + c]; 

    double scale = Ae * t;
    for (double &v : ke)
      v *= scale;

    return ke;
  }

  
  
  
  
  
  
  void assemble_stiffness(std::vector<double> &K, int n_dof) const {
    auto ke = local_stiffness();

    
    int g[6];
    for (int k = 0; k < 3; ++k) {
      g[2 * k] = 2 * node[k];         
      g[2 * k + 1] = 2 * node[k] + 1; 
    }

    for (int r = 0; r < 6; ++r)
      for (int c = 0; c < 6; ++c)
        K[g[r] * n_dof + g[c]] += ke[r * 6 + c];
  }

  
  
  
  
  
  
  
  void assemble_body_force(std::vector<double> &F, double bx, double by) const {
    double frac = area() * t / 3.0;
    for (int k = 0; k < 3; ++k) {
      F[2 * node[k]] += frac * bx;
      F[2 * node[k] + 1] += frac * by;
    }
  }
};

} 
} 