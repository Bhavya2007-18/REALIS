
#pragma once
#include "constraint.hpp"

namespace realis {


class AngularConstraint : public Constraint {
public:
  Vec3 axis; 

  AngularConstraint(RigidBody *a, RigidBody *b, const Vec3 &ax)
      : Constraint(a, b), axis(ax) {}

  void pre_step(float dt) override {
    if (!bodyA || !bodyB)
      return;

    
    linearA = Vec3(0, 0, 0);
    linearB = Vec3(0, 0, 0);

    
    angularA = axis * -1.0f;
    angularB = axis;

    
    
    C_val = 0.0f;
    J_dot_v = 0.0f;
    bias = 0.0f;
  }
};

} 