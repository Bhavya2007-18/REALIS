





















#pragma once
#include "tri2d_element.hpp"
#include <stdexcept>
#include <vector>

namespace realis {
namespace fem {




struct Tri2DMesh {
  std::vector<double> node_x;         
  std::vector<double> node_y;         
  std::vector<Tri2DElement> elements; 

  int n_nodes() const { return static_cast<int>(node_x.size()); }
  int n_dof() const { return 2 * n_nodes(); }
  int n_elements() const { return static_cast<int>(elements.size()); }

  int add_node(double x, double y) {
    node_x.push_back(x);
    node_y.push_back(y);
    return n_nodes() - 1;
  }

  
  
  
  
  
  
  void add_element(int n0, int n1, int n2, double E, double nu,
                   double t = 1.0) {
    elements.emplace_back(n0, n1, n2, node_x[n0], node_y[n0], node_x[n1],
                          node_y[n1], node_x[n2], node_y[n2], E, nu, t);
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  static Tri2DMesh patch_mesh(double E, double nu) {
    Tri2DMesh m;
    
    m.add_node(0.0, 0.0); 
    m.add_node(1.0, 0.0); 
    m.add_node(2.0, 0.0); 
    
    m.add_node(0.0, 0.5); 
    m.add_node(1.0, 0.5); 
    m.add_node(2.0, 0.5); 
    
    m.add_node(0.0, 1.0); 
    m.add_node(1.0, 1.0); 
    m.add_node(2.0, 1.0); 

    
    m.add_element(0, 1, 3, E, nu); 
    m.add_element(1, 4, 3, E, nu); 
    m.add_element(1, 2, 4, E, nu); 
    m.add_element(2, 5, 4, E, nu); 

    
    m.add_element(3, 4, 6, E, nu); 
    m.add_element(4, 7, 6, E, nu); 
    m.add_element(4, 5, 7, E, nu); 
    m.add_element(5, 8, 7, E, nu); 

    return m;
  }

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  static Tri2DMesh cantilever(double L, double H, int nx, int ny, double E,
                              double nu) {
    if (nx < 1 || ny < 1)
      throw std::invalid_argument("cantilever: nx,ny must be >= 1");

    Tri2DMesh m;
    double dx = L / nx;
    double dy = H / ny;

    
    for (int i = 0; i <= nx; ++i)
      for (int j = 0; j <= ny; ++j)
        m.add_node(i * dx, j * dy);

    
    auto idx = [&](int i, int j) { return i * (ny + 1) + j; };
    for (int i = 0; i < nx; ++i) {
      for (int j = 0; j < ny; ++j) {
        int sw = idx(i, j);
        int se = idx(i + 1, j);
        int nw = idx(i, j + 1);
        int ne = idx(i + 1, j + 1);
        
        m.add_element(sw, se, nw, E, nu);
        
        m.add_element(se, ne, nw, E, nu);
      }
    }
    return m;
  }
};

} 
} 