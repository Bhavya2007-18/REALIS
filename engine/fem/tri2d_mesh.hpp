// =============================================================================
// REALIS Physics Engine — Phase 4.2: 2D FEM
// engine/fem/tri2d_mesh.hpp
//
// 2D Triangular Mesh Container and Factory Methods
// =============================================================================
//
// Supports two mesh types:
//
// 1. patch_mesh(E, nu)
//    A 2×1 structured mesh of 4 right triangles covering [0,2]×[0,1].
//    Used for patch test: apply linear displacement on boundary → verify
//    interior.
//
// 2. cantilever(L, H, nx, ny, E, nu)
//    Structured mesh of right triangles.
//    Each rectangular cell [i,i+1]×[j,j+1] is split into 2 triangles
//    (lower-left diagonal split). Produces nx*ny*2 elements. Standard benchmark
//    for convergence study.
//
// ─────────────────────────────────────────────────────────────────────────────

#pragma once
#include "tri2d_element.hpp"
#include <stdexcept>
#include <vector>

namespace realis {
namespace fem {

// ─────────────────────────────────────────────────────────────────────────────
// Tri2DMesh — Container for 2D FEM mesh
// ─────────────────────────────────────────────────────────────────────────────
struct Tri2DMesh {
  std::vector<double> node_x;         // x-coordinate of each node
  std::vector<double> node_y;         // y-coordinate of each node
  std::vector<Tri2DElement> elements; // list of CST elements

  int n_nodes() const { return static_cast<int>(node_x.size()); }
  int n_dof() const { return 2 * n_nodes(); }
  int n_elements() const { return static_cast<int>(elements.size()); }

  int add_node(double x, double y) {
    node_x.push_back(x);
    node_y.push_back(y);
    return n_nodes() - 1;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // add_element() — add a triangle (CCW node order enforced automatically)
  //
  // If nodes are given CW, the element constructor throws. Factory methods
  // below guarantee CCW ordering by construction.
  // ─────────────────────────────────────────────────────────────────────────
  void add_element(int n0, int n1, int n2, double E, double nu,
                   double t = 1.0) {
    elements.emplace_back(n0, n1, n2, node_x[n0], node_y[n0], node_x[n1],
                          node_y[n1], node_x[n2], node_y[n2], E, nu, t);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // patch_mesh() — 8-triangle patch mesh on [0,2]×[0,1] with interior node
  //
  // CRITICAL REQUIREMENT: The "test node" must be TRULY INTERIOR (surrounded
  // on all sides by elements). A node on the domain boundary has missing
  // traction contributions, which breaks the patch test premise.
  //
  // Node layout (3 columns × 3 rows, y={0, 0.5, 1}):
  //   Row 2 (y=1): 6:(0,1)  7:(1,1)  8:(2,1)
  //   Row 1 (y=0.5): 3:(0,0.5)  4:(1,0.5) ← INTERIOR  5:(2,0.5)
  //   Row 0 (y=0): 0:(0,0)  1:(1,0)  2:(2,0)
  //
  // 8 elements (CCW), node 4 at (1, 0.5) is shared by 6 elements.
  // Boundary nodes (prescribed): {0,1,2,3,5,6,7,8}
  // Free node (test): 4 at (1,0.5)
  //
  // Verification: for u=ax+by, v=cx+dy, the sum of internal forces at node 4
  // is zero for ALL constants a,b,c,d (verified analytically — see derivation).
  // ─────────────────────────────────────────────────────────────────────────
  static Tri2DMesh patch_mesh(double E, double nu) {
    Tri2DMesh m;
    // Row 0
    m.add_node(0.0, 0.0); // 0
    m.add_node(1.0, 0.0); // 1
    m.add_node(2.0, 0.0); // 2
    // Row 1 (y=0.5) — node 4 will be interior
    m.add_node(0.0, 0.5); // 3
    m.add_node(1.0, 0.5); // 4 ← truly interior
    m.add_node(2.0, 0.5); // 5
    // Row 2
    m.add_node(0.0, 1.0); // 6
    m.add_node(1.0, 1.0); // 7
    m.add_node(2.0, 1.0); // 8

    // Bottom strip (y=0 to y=0.5), 4 elements — all CCW:
    m.add_element(0, 1, 3, E, nu); // [0,1,3]: (0,0),(1,0),(0,0.5) Ae=0.25
    m.add_element(1, 4, 3, E, nu); // [1,4,3]: (1,0),(1,0.5),(0,0.5) Ae=0.25
    m.add_element(1, 2, 4, E, nu); // [1,2,4]: (1,0),(2,0),(1,0.5) Ae=0.25
    m.add_element(2, 5, 4, E, nu); // [2,5,4]: (2,0),(2,0.5),(1,0.5) Ae=0.25

    // Top strip (y=0.5 to y=1.0), 4 elements — all CCW:
    m.add_element(3, 4, 6, E, nu); // [3,4,6]: (0,0.5),(1,0.5),(0,1) Ae=0.25
    m.add_element(4, 7, 6, E, nu); // [4,7,6]: (1,0.5),(1,1),(0,1) Ae=0.25
    m.add_element(4, 5, 7, E, nu); // [4,5,7]: (1,0.5),(2,0.5),(1,1) Ae=0.25
    m.add_element(5, 8, 7, E, nu); // [5,8,7]: (2,0.5),(2,1),(1,1) Ae=0.25

    return m;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // cantilever() — structured rectangular mesh [0,L] × [0,H]
  //               subdivided into nx×ny rectangles, each split into 2 CCW
  //               triangles.
  //
  // Node index: n = i*(ny+1) + j   where i ∈ [0,nx], j ∈ [0,ny]
  //   x = i * (L/nx),  y = j * (H/ny)
  //
  // Each cell (i,j):
  //   sw = i*(ny+1)+j,    se = (i+1)*(ny+1)+j
  //   nw = i*(ny+1)+j+1,  ne = (i+1)*(ny+1)+j+1
  //
  // Split (lower-left diagonal → CCW):
  //   Triangle A: [sw, se, nw]  (lower-right to upper-left)
  //   Triangle B: [se, ne, nw]  (upper half)
  //
  // Both orientations are CCW for standard (L,H > 0) grids. ✓
  //
  // Parameters:
  //   L  = length [m]    (x-direction)
  //   H  = height [m]    (y-direction)
  //   nx = number of cells in x (columns)
  //   ny = number of cells in y (rows)
  // ─────────────────────────────────────────────────────────────────────────
  static Tri2DMesh cantilever(double L, double H, int nx, int ny, double E,
                              double nu) {
    if (nx < 1 || ny < 1)
      throw std::invalid_argument("cantilever: nx,ny must be >= 1");

    Tri2DMesh m;
    double dx = L / nx;
    double dy = H / ny;

    // Add nodes in column-major order: node(i,j) = i*(ny+1)+j
    for (int i = 0; i <= nx; ++i)
      for (int j = 0; j <= ny; ++j)
        m.add_node(i * dx, j * dy);

    // Add elements
    auto idx = [&](int i, int j) { return i * (ny + 1) + j; };
    for (int i = 0; i < nx; ++i) {
      for (int j = 0; j < ny; ++j) {
        int sw = idx(i, j);
        int se = idx(i + 1, j);
        int nw = idx(i, j + 1);
        int ne = idx(i + 1, j + 1);
        // Triangle A: sw → se → nw  (CCW)
        m.add_element(sw, se, nw, E, nu);
        // Triangle B: se → ne → nw  (CCW)
        m.add_element(se, ne, nw, E, nu);
      }
    }
    return m;
  }
};

} // namespace fem
} // namespace realis
