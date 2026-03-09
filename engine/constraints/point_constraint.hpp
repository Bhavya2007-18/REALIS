// Point Constraint (Ball-and-Socket Joint) implementation
#pragma once
#include "constraint.hpp"

namespace realis {

/**
 * Removes 3 linear degrees of freedom.
 * C(q) = (pA + rA) - (pB + rB) = 0
 * This requires 3 individual 1D constraints in our current solver.
 */
class PointConstraint : public Constraint {
public:
  Vec3 localA; // Pivot position in body A's local space
  Vec3 localB; // Pivot position in body B's local space
  int axis;    // 0:X, 1:Y, 2:Z

  PointConstraint(RigidBody *a, RigidBody *b, const Vec3 &pA, const Vec3 &pB,
                  int ax)
      : Constraint(a, b), localA(pA), localB(pB), axis(ax) {}

  void pre_step(float dt) override {
    if (!bodyA || !bodyB)
      return;

    // World space pivots
    Vec3 rA = bodyA->orientation.rotate(localA);
    Vec3 rB = bodyB->orientation.rotate(localB);
    Vec3 pA = bodyA->position + rA;
    Vec3 pB = bodyB->position + rB;

    // Error vector
    Vec3 error = pA - pB;

    // Direction for this specific axis constraint
    Vec3 n(0, 0, 0);
    if (axis == 0)
      n.x = 1.0f;
    else if (axis == 1)
      n.y = 1.0f;
    else if (axis == 2)
      n.z = 1.0f;

    // Jacobian row
    // J = [ -n, -(rA x n), n, (rB x n) ]
    linearA = n * -1.0f;
    angularA = rA.cross(n) * -1.0f;
    linearB = n;
    angularB = rB.cross(n);

    // C(q) projection on axis
    C_val = error.dot(n);

    // J_dot_v = n.dot(vB + wB x rB - (vA + wA x rA)) ... simplified
    // For now we rely on Baumgarte to handle the drift.
    J_dot_v = 0.0f;
    bias = 0.0f;
  }
};

} // namespace realis
