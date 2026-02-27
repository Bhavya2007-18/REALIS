// =============================================================================
// REALIS Physics Engine — Phase 4A: 1D Linear Elastic FEM
// engine/fem/bar1d_mesh.hpp
//
// 1D Bar Mesh Container
// =============================================================================
//
// Holds the mesh geometry (node positions) and element connectivity
// for a 1D bar discretization. Provides a factory for uniform meshes.
//
// This is architecturally separate from the 3D FEMMesh (fem_mesh.hpp).
// It operates on scalars (x positions), not Vec3 nodes.
// =============================================================================

#pragma once
#include "bar1d_element.hpp"
#include <stdexcept>
#include <vector>


namespace realis {
namespace fem {

// ─────────────────────────────────────────────────────────────────────────────
// Bar1DMesh — 1D Mesh for Bar FEM Analysis
// ─────────────────────────────────────────────────────────────────────────────
//
// Coordinate convention:
//   node_positions[i] = x_i   (physical x-coordinate of node i)
//
// Elements are ordered left-to-right.
//   elements[e].node_i = e
//   elements[e].node_j = e + 1
// ─────────────────────────────────────────────────────────────────────────────
struct Bar1DMesh {
  std::vector<double> node_positions; // x-coordinate of each node [m]
  std::vector<Bar1DElement> elements; // Element list (ordered L→R)

  int n_nodes() const { return static_cast<int>(node_positions.size()); }
  int n_elements() const { return static_cast<int>(elements.size()); }

  // ─────────────────────────────────────────────────────────────────────────
  // uniform() — Create a uniform 1D mesh on [0, L] with n_elem elements.
  //
  // This generates n_elem+1 equally spaced nodes and n_elem bar elements,
  // each with the same material properties E and A.
  //
  // Element length: Le = L / n_elem
  // Node positions: x_i = i * Le, i = 0 ... n_elem
  // ─────────────────────────────────────────────────────────────────────────
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

    // Create n_elem + 1 nodes
    mesh.node_positions.resize(n_elem + 1);
    for (int i = 0; i <= n_elem; ++i) {
      mesh.node_positions[i] = i * Le;
    }

    // Create n_elem elements with sequential connectivity
    mesh.elements.reserve(n_elem);
    for (int e = 0; e < n_elem; ++e) {
      mesh.elements.emplace_back(e, e + 1, E, A, Le);
    }

    return mesh;
  }
};

} // namespace fem
} // namespace realis
