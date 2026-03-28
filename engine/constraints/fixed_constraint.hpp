
#pragma once
#include "constraint.hpp"
#include <cmath>
#include <vector>


namespace realis {


class FixedConstraint1D : public Constraint {
public:
  Vec3 anchor; 
  Vec3 axis;   

  FixedConstraint1D(RigidBody *a, const Vec3 &anchor_point,
                    const Vec3 &constraint_axis)
      : Constraint(a, nullptr), anchor(anchor_point), axis(constraint_axis) {}

  void pre_step(float dt) override {
    if (!bodyA)
      return;

    
    
    
    
    linearA = axis;
    linearB = Vec3(0, 0, 0);

    
    angularA = Vec3(0, 0, 0);
    angularB = Vec3(0, 0, 0);

    
    Vec3 error = bodyA->position - anchor;
    C_val = error.dot(axis);

    
    
    J_dot_v = 0.0f;
  }
};

} 