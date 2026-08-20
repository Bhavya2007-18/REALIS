













#pragma once
#include "bar1d_element.hpp"
#include <stdexcept>
#include <vector>


namespace realis {
namespace fem {












struct Bar1DMesh {
  std::vector<double> node_positions; 
  std::vector<Bar1DElement> elements; 

  int n_nodes() const { return static_cast<int>(node_positions.size()); }
  int n_elements() const { return static_cast<int>(elements.size()); }

  
  
  
  
  
  
  
  
  
  static Bar1DMesh uniform(double L, int n_elem, double E, double A) {
    if (L <= 0.0)
      throw std::invalid_argument("Bar1DMesh::uniform: L must be positive");
    if (n_elem < 1)
      throw std::invalid_argument("Bar1DMesh::uniform: n_elem must be >= 1");
    if (E <= 0.0 || A <= 0.0)
      throw std::invalid_argument(
          "Bar1DMesh::uniform: E and A must be positive");

    Bar1DMesh mesh;
    double Le = L / static_cast<double>(n_elem);

    
    mesh.node_positions.resize(n_elem + 1);
    for (int i = 0; i <= n_elem; ++i) {
      mesh.node_positions[i] = i * Le;
    }

    
    mesh.elements.reserve(n_elem);
    for (int e = 0; e < n_elem; ++e) {
      mesh.elements.emplace_back(e, e + 1, E, A, Le);
    }

    return mesh;
  }
};

} 
} 