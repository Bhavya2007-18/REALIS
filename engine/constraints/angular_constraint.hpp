// Angular Constraint implementation
#pragma once
#include "constraint.hpp"

namespace realis {

/**
 * Removes 1 angular degree of freedom.
 * \dot{C} = (wB - wA) \cdot axis = 0
 */
class AngularConstraint : public Constraint {
public:
  Vec3 axis; // Rotation axis in world space (to lock)

  AngularConstraint(RigidBody *a, RigidBody *b, const Vec3 &ax)
      : Constraint(a, b), axis(ax) {}

  void pre_step(float dt) override {
    if (!bodyA || !bodyB)
      return;

    // Linear parts of Jacobian are zero for pure rotation
    linearA = Vec3(0, 0, 0);
    linearB = Vec3(0, 0, 0);

    // Angular parts are along the axis
    angularA = axis * -1.0f;
    angularB = axis;

    // C(q) error for angular constraints is a bit complex (locked orientations)
    // For now we rely on Baumgarte on velocity level or drift correction.
    C_val = 0.0f;
    J_dot_v = 0.0f;
    bias = 0.0f;
  }
};

} // namespace realis
