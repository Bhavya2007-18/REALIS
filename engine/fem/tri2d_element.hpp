// =============================================================================
// REALIS Physics Engine — Phase 4.2: 2D FEM
// engine/fem/tri2d_element.hpp
//
// Constant Strain Triangle (CST) — Linear 3-Node 2D Element
// =============================================================================
//
// ─────────────────────────────────────────────────────────────────────────────
// COMPLETE MATHEMATICAL DERIVATION
// ─────────────────────────────────────────────────────────────────────────────
//
// GOVERNING EQUATIONS (2D Linear Elasticity)
// ──────────────────────────────────────────
// Strong form:   ∂σxx/∂x + ∂σxy/∂y + bx = 0
//                ∂σxy/∂x + ∂σyy/∂y + by = 0
//
// Small-strain tensor:
//   εxx = ∂ux/∂x,   εyy = ∂uy/∂y,   γxy = ∂ux/∂y + ∂uy/∂x
//
// ─────────────────────────────────────────────────────────────────────────────
// SHAPE FUNCTIONS — Linear Triangle
// ─────────────────────────────────────────────────────────────────────────────
// Nodes: (x1,y1), (x2,y2), (x3,y3).  Area:
//   2·Ae = (x2-x1)(y3-y1) - (x3-x1)(y2-y1)
//         = det[x2-x1  x3-x1]
//               [y2-y1  y3-y1]   (positive if CCW ordering)
//
// Shape functions are derived by solving:
//   Ni(x,y) = (ai + bi·x + ci·y) / (2Ae)
// where:
//   b1 = y2 - y3,    b2 = y3 - y1,    b3 = y1 - y2
//   c1 = x3 - x2,   c2 = x1 - x3,   c3 = x2 - x1
//   a1 = x2·y3 - x3·y2,  (not used in B — only derivatives matter)
//
// These satisfy: Ni(xj,yj) = δij (Kronecker delta) ✓
// And: N1+N2+N3 = 1 (partition of unity) ✓
//
// ─────────────────────────────────────────────────────────────────────────────
// STRAIN–DISPLACEMENT MATRIX B (3×6)
// ─────────────────────────────────────────────────────────────────────────────
// DOF ordering per element: [u1, v1, u2, v2, u3, v3]
//
// From the strain definitions and shape functions:
//   εxx = ∂ux/∂x = Σi (∂Ni/∂x) ui = Σi (bi/(2Ae)) ui
//   εyy = ∂uy/∂y = Σi (∂Ni/∂y) vi = Σi (ci/(2Ae)) vi
//   γxy = ∂ux/∂y + ∂uy/∂x = Σi (ci·ui + bi·vi) / (2Ae)
//
// Therefore:
//        1    ⎡ b1  0   b2  0   b3  0  ⎤
//   B = ───── ⎢  0  c1   0  c2   0  c3 ⎥
//       2·Ae  ⎣ c1  b1  c2  b2  c3  b3 ⎦
//
// KEY PROPERTY: B is CONSTANT over the element
// → Strain is uniform within each CST element (hence "Constant Strain
// Triangle") → No numerical integration needed for ke (exact closed form)
//
// ─────────────────────────────────────────────────────────────────────────────
// CONSTITUTIVE MATRIX D — PLANE STRESS (3×3)
// ─────────────────────────────────────────────────────────────────────────────
// Assumption: Plane Stress (σzz = σxz = σyz = 0)
// Appropriate for thin plates where the z-faces are traction-free.
//
//         E       ⎡ 1    ν    0         ⎤
//   D = ─────── · ⎢ ν    1    0         ⎥
//       1 - ν²    ⎣ 0    0    (1-ν)/2   ⎦
//
// Parameters: E = Young's modulus [Pa], ν = Poisson's ratio (0 < ν < 0.5)
//
// WHY NOT PLANE STRAIN:
//   Plane strain assumes εzz=0 (thick body constrained in z). The D matrix
//   changes: 1-ν² → (1-2ν)(1+ν)/ν terms. Plane stress is used here because
//   it is more appropriate for the thin-plate validation benchmark and avoids
//   artificial z-constraint stiffening.
//
// ─────────────────────────────────────────────────────────────────────────────
// ELEMENT STIFFNESS MATRIX ke (6×6)
// ─────────────────────────────────────────────────────────────────────────────
// Weak form for a single element (volume Ω_e):
//   ∫_{Ω_e} εᵀ σ dΩ  =  ∫_{Ω_e} vᵀ b dΩ  +  ∫_{∂Ω_e} vᵀ t dΓ
//
// Substituting ε = B uₑ, σ = D ε = D B uₑ:
//   ke = ∫_{Ω_e} Bᵀ D B dΩ
//
// Since B and D are constant over the CST element and thickness t=1:
//   ke = Bᵀ D B · Ae
//
// This is EXACT (no approximation from quadrature).
//
// SYMMETRY: ke = (Bᵀ D B · Ae)ᵀ = Aₑ · Bᵀ Dᵀ B = Bᵀ D B · Ae ✓  (D=Dᵀ)
//
// CONSISTENT BODY FORCE:
//   fe = ∫_{Ae} Nᵀ b dA = Ae/3 · [bx, by, bx, by, bx, by]ᵀ
//   (each node gets equal share of body force — exact for linear elements)
//
// ─────────────────────────────────────────────────────────────────────────────

#pragma once
#include <array>
#include <cmath>
#include <stdexcept>
#include <vector>

namespace realis {
namespace fem {

// ─────────────────────────────────────────────────────────────────────────────
// Tri2DElement — Linear 3-Node CST (Constant Strain Triangle)
// ─────────────────────────────────────────────────────────────────────────────
// DOF layout:  local [0,1] = (u,v) of node[0]
//              local [2,3] = (u,v) of node[1]
//              local [4,5] = (u,v) of node[2]
//
// Global DOF for node i:  global_u = 2*node[k], global_v = 2*node[k]+1
// ─────────────────────────────────────────────────────────────────────────────
class Tri2DElement {
public:
  int node[3];       // Global node indices
  double x[3], y[3]; // Node coordinates (baked in at construction)
  double E;          // Young's modulus [Pa]
  double nu;         // Poisson's ratio
  double t;          // Thickness [m] (1.0 for unit thickness)

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

    // Ensure node ordering gives positive area (CCW)
    double two_ae =
        (x[1] - x[0]) * (y[2] - y[0]) - (x[2] - x[0]) * (y[1] - y[0]);
    if (two_ae < 1e-30)
      throw std::invalid_argument(
          "Tri2DElement: degenerate or CW-oriented triangle");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // area() → element area Ae
  // 2Ae = det[x2-x1  x3-x1] = (x2-x1)(y3-y1) - (x3-x1)(y2-y1)
  //           [y2-y1  y3-y1]
  // ─────────────────────────────────────────────────────────────────────────
  double area() const {
    return 0.5 *
           ((x[1] - x[0]) * (y[2] - y[0]) - (x[2] - x[0]) * (y[1] - y[0]));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // b_matrix() → B (3×6) stored row-major as 18 doubles
  //
  //        1    ⎡ b1  0   b2  0   b3  0  ⎤   row 0: εxx
  //   B = ───── ⎢  0  c1   0  c2   0  c3 ⎥   row 1: εyy
  //       2·Ae  ⎣ c1  b1  c2  b2  c3  b3 ⎦   row 2: γxy
  //
  // where:  bi = y_{i+1} - y_{i+2},  ci = x_{i+2} - x_{i+1}  (cyclic)
  // ─────────────────────────────────────────────────────────────────────────
  std::array<double, 18> b_matrix() const {
    double two_ae = 2.0 * area();
    // Derivative coefficients (see derivation above)
    double b1 = y[1] - y[2];
    double b2 = y[2] - y[0];
    double b3 = y[0] - y[1];
    double c1 = x[2] - x[1];
    double c2 = x[0] - x[2];
    double c3 = x[1] - x[0];

    std::array<double, 18> B{};
    double inv = 1.0 / two_ae;

    // Row 0 (εxx = ∂ux/∂x): columns u1, v1, u2, v2, u3, v3
    B[0 * 6 + 0] = b1 * inv;
    B[0 * 6 + 1] = 0.0;
    B[0 * 6 + 2] = b2 * inv;
    B[0 * 6 + 3] = 0.0;
    B[0 * 6 + 4] = b3 * inv;
    B[0 * 6 + 5] = 0.0;

    // Row 1 (εyy = ∂uy/∂y)
    B[1 * 6 + 0] = 0.0;
    B[1 * 6 + 1] = c1 * inv;
    B[1 * 6 + 2] = 0.0;
    B[1 * 6 + 3] = c2 * inv;
    B[1 * 6 + 4] = 0.0;
    B[1 * 6 + 5] = c3 * inv;

    // Row 2 (γxy = ∂ux/∂y + ∂uy/∂x)
    B[2 * 6 + 0] = c1 * inv;
    B[2 * 6 + 1] = b1 * inv;
    B[2 * 6 + 2] = c2 * inv;
    B[2 * 6 + 3] = b2 * inv;
    B[2 * 6 + 4] = c3 * inv;
    B[2 * 6 + 5] = b3 * inv;

    return B;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // d_matrix() → D (3×3) plane stress, stored row-major as 9 doubles
  //
  //       E        ⎡ 1    ν    0        ⎤
  //   D = ────── · ⎢ ν    1    0        ⎥
  //      1 - ν²    ⎣ 0    0  (1-ν)/2   ⎦
  // ─────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  // local_stiffness() → ke (6×6) = Bᵀ D B · Ae · t
  //
  // Exact for CST (B constant). Symmetric by construction.
  // ─────────────────────────────────────────────────────────────────────────
  std::array<double, 36> local_stiffness() const {
    auto B = b_matrix(); // 3×6
    auto D = d_matrix(); // 3×3
    double Ae = area();

    // Compute DB = D(3×3) * B(3×6) → (3×6)
    std::array<double, 18> DB{};
    for (int r = 0; r < 3; ++r)
      for (int c = 0; c < 6; ++c)
        for (int k = 0; k < 3; ++k)
          DB[r * 6 + c] += D[r * 3 + k] * B[k * 6 + c];

    // ke = Bᵀ(6×3) * DB(3×6) * Ae * t → (6×6)
    std::array<double, 36> ke{};
    for (int r = 0; r < 6; ++r)
      for (int c = 0; c < 6; ++c)
        for (int k = 0; k < 3; ++k)
          ke[r * 6 + c] +=
              B[k * 6 + r] * DB[k * 6 + c]; // B transposed: B[k][r]

    double scale = Ae * t;
    for (double &v : ke)
      v *= scale;

    return ke;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // assemble_stiffness() — scatter local ke into global K (2 DOF/node)
  //
  // DOF mapping: node[k] → global DOFs (2*node[k], 2*node[k]+1)
  // Local DOF layout: [u0,v0, u1,v1, u2,v2] → global indices below.
  // ─────────────────────────────────────────────────────────────────────────
  void assemble_stiffness(std::vector<double> &K, int n_dof) const {
    auto ke = local_stiffness();

    // Map local DOF index → global DOF index
    int g[6];
    for (int k = 0; k < 3; ++k) {
      g[2 * k] = 2 * node[k];         // u component
      g[2 * k + 1] = 2 * node[k] + 1; // v component
    }

    for (int r = 0; r < 6; ++r)
      for (int c = 0; c < 6; ++c)
        K[g[r] * n_dof + g[c]] += ke[r * 6 + c];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // assemble_body_force() — consistent nodal load for uniform body force
  //
  // fe = ∫_{Ae} Nᵀ [bx, by] dA
  // For linear triangle with uniform b: each node gets Ae/3 of total.
  // fe = (Ae/3) · [bx, by, bx, by, bx, by]ᵀ
  // ─────────────────────────────────────────────────────────────────────────
  void assemble_body_force(std::vector<double> &F, double bx, double by) const {
    double frac = area() * t / 3.0;
    for (int k = 0; k < 3; ++k) {
      F[2 * node[k]] += frac * bx;
      F[2 * node[k] + 1] += frac * by;
    }
  }
};

} // namespace fem
} // namespace realis
