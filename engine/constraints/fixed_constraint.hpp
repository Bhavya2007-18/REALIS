// Fixed Ground Constraint implementation
#pragma once
#include "constraint.hpp"
#include <cmath>
#include <vector>


namespace realis {

/**
 * C(x) = pA - p0 = 0  (3-DOF positional constraint fixing body A to an anchor)
 * This constraint generates 3 rows in the Jacobian for x, y, z individually.
 * To fit our 1D unified interface which solves 1 row per `Constraint` object,
 * we define FixedConstraint1D representing a single axis projection.
 */
class FixedConstraint1D : public Constraint {
public:
  Vec3 anchor; // The point p0 it should stick to
  Vec3 axis;   // The fixed axis this row restrains (e.g. (1,0,0) for X)

  FixedConstraint1D(RigidBody *a, const Vec3 &anchor_point,
                    const Vec3 &constraint_axis)
      : Constraint(a, nullptr), anchor(anchor_point), axis(constraint_axis) {}

  void pre_step(float dt) override {
    if (!bodyA)
      return;

    // 1. Jacobians
    // C = (pA - p0) \cdot axis = 0
    // \dot{C} = vA \cdot axis = J * v
    // J_A = axis^T
    linearA = axis;
    linearB = Vec3(0, 0, 0);

    // Fixed anchors have 0 angular effect on the pure geometric COM position
    angularA = Vec3(0, 0, 0);
    angularB = Vec3(0, 0, 0);

    // 2. C_val: C(q)
    Vec3 error = bodyA->position - anchor;
    C_val = error.dot(axis);

    // 3. J_dot_v
    // \dot{J} = 0 since axis is constant
    J_dot_v = 0.0f;
  }
};

} // namespace realis
