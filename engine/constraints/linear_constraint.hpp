// Linear Constraint (1D) implementation
#pragma once
#include "constraint.hpp"

namespace realis {

/**
 * Enforces a 1D linear relationship along an axis n.
 * C(q) = (pB - pA) \cdot n - target_distance = 0
 * \dot{C} = (vB + wB \times rB - (vA + wA \times rA)) \cdot n = 0
 */
class LinearConstraint : public Constraint {
public:
  Vec3 localA; // Anchor point in body A local space
  Vec3 localB; // Anchor point in body B local space
  Vec3 axis;   // Constraint axis in world space

  LinearConstraint(RigidBody *a, RigidBody *b, const Vec3 &pA, const Vec3 &pB,
                   const Vec3 &n)
      : Constraint(a, b), localA(pA), localB(pB), axis(n) {}

  void pre_step(float dt) override {
    if (!bodyA || !bodyB)
      return;

    // World space pivots
    Vec3 rA = bodyA->orientation.rotate(localA);
    Vec3 rB = bodyB->orientation.rotate(localB);
    Vec3 pA = bodyA->position + rA;
    Vec3 pB = bodyB->position + rB;

    // Error vector
    Vec3 delta = pB - pA;

    // n is world space axis
    Vec3 n = axis;

    // Jacobian row
    // J = [ -n, -(rA x n), n, (rB x n) ]
    linearA = n * -1.0f;
    angularA = rA.cross(n) * -1.0f;
    linearB = n;
    angularB = rB.cross(n);

    // C(q)
    C_val = delta.dot(n);

    J_dot_v = 0.0f;
    bias = 0.0f;
  }
};

} // namespace realis
