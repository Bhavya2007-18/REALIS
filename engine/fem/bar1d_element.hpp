// =============================================================================
// REALIS Physics Engine — Phase 4A: 1D Linear Elastic FEM
// engine/fem/bar1d_element.hpp
//
// 1D Two-Node Bar Element (Linear Lagrange)
// =============================================================================
//
// MATHEMATICAL DERIVATION
// ========================
//
// Strong form of 1D linear elasticity:
//   d/dx( EA du/dx ) + f = 0    on [x_i, x_j]
//
// Weak form (multiply by test function v, integrate by parts on element):
//   ∫_{x_i}^{x_j} EA (du/dx)(dv/dx) dx  =  ∫_{x_i}^{x_j} f·v dx
//                                           + [EA·(du/dx)·v]_{x_i}^{x_j}
//
// Natural (local) coordinate: ξ ∈ [0,1], with x = x_i + ξ·Le
//   Le = x_j - x_i  (element length)
//   dx = Le · dξ
//
// Linear shape functions:
//   N₁(ξ) = 1 - ξ,    N₂(ξ) = ξ
//
// Displacement interpolation:
//   u(ξ) = N₁·u_i + N₂·u_j = [N₁ N₂]{u_i, u_j}
//
// Strain-displacement matrix B:
//   ε = du/dx = (1/Le) · dN/dξ · û
//   B = (1/Le) · [dN₁/dξ, dN₂/dξ]
//     = (1/Le) · [-1,  1]     (row vector, 1×2)
//
// Element stiffness matrix (derived from weak form):
//   ke = ∫₀¹ EA · Bᵀ B · Le dξ
//      = EA · Le · Bᵀ B  · ∫₀¹ dξ        [EA,Le constant per element]
//      = EA · Le · (1/Le)² · [[-1],[ 1]] · [-1, 1]  · 1
//      = (EA/Le) · [[ 1, -1],
//                   [-1,  1]]
//
// Consistent nodal load vector (uniform body force f_body):
//   fe = ∫₀¹ f_body · [N₁, N₂]ᵀ · Le dξ
//      = f_body · Le · [∫₀¹(1-ξ)dξ, ∫₀¹ ξ dξ]ᵀ
//      = f_body · Le · [1/2, 1/2]ᵀ
//      = (f_body · Le / 2) · {1, 1}
//
// This is the exact element-level formulation from Galerkin FEM.
// =============================================================================

#pragma once
#include <array>
#include <cmath>
#include <stdexcept>
#include <vector>


namespace realis {
namespace fem {

// ─────────────────────────────────────────────────────────────────────────────
// Bar1DElement — 1D Two-Node Linear Bar Element
// ─────────────────────────────────────────────────────────────────────────────
//
// Stores:
//   node_i, node_j  — global DOF indices (node indices in the mesh)
//   E               — Young's modulus [Pa]
//   A               — Cross-sectional area [m²]
//   Le              — Element length [m]  (= x_j - x_i, pre-computed)
//
// The element does NOT store or modify node positions. All geometric info
// is baked in at construction from the mesh node positions.
// ─────────────────────────────────────────────────────────────────────────────
class Bar1DElement {
public:
  int node_i; // Global index of left node
  int node_j; // Global index of right node
  double E;   // Young's modulus [Pa]
  double A;   // Cross-sectional area [m²]
  double Le;  // Element length [m]

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

  // ─────────────────────────────────────────────────────────────────────────
  // local_stiffness() — returns the 2×2 element stiffness matrix ke
  //
  // Derivation: ke = (EA/Le) · [[ 1, -1], [-1, 1]]
  // (See top-of-file derivation for full proof from weak form.)
  // ─────────────────────────────────────────────────────────────────────────
  std::array<std::array<double, 2>, 2> local_stiffness() const {
    double k = (E * A) / Le;
    return {{{k, -k}, {-k, k}}};
  }

  // ─────────────────────────────────────────────────────────────────────────
  // assemble_stiffness() — scatter local ke into global stiffness matrix K
  //
  // K is stored as a flat row-major vector of size (n_dof × n_dof).
  // DOF mapping: local DOF 0 → global node_i, local DOF 1 → global node_j
  //
  // Symmetric assembly:
  //   K[i,i] += ke[0][0]    K[i,j] += ke[0][1]
  //   K[j,i] += ke[1][0]    K[j,j] += ke[1][1]
  // ─────────────────────────────────────────────────────────────────────────
  void assemble_stiffness(std::vector<double> &K, int n_dof) const {
    auto ke = local_stiffness();
    const int dofs[2] = {node_i, node_j};

    for (int r = 0; r < 2; ++r) {
      for (int c = 0; c < 2; ++c) {
        K[dofs[r] * n_dof + dofs[c]] += ke[r][c];
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // assemble_body_force() — scatter consistent nodal load vector into F
  //
  // For uniform distributed body force f_body [N/m]:
  //   fe = (f_body · Le / 2) · {1, 1}
  //
  // This is derived from the shape-function integral (see top derivation).
  // ─────────────────────────────────────────────────────────────────────────
  void assemble_body_force(std::vector<double> &F, double f_body) const {
    double fe = f_body * Le * 0.5;
    F[node_i] += fe;
    F[node_j] += fe;
  }
};

} // namespace fem
} // namespace realis
