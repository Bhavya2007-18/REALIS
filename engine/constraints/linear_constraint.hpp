
#pragma once
#include "constraint.hpp"

namespace realis {


class LinearConstraint : public Constraint {
public:
  Vec3 localA; 
  Vec3 localB; 
  Vec3 axis;   

  LinearConstraint(RigidBody *a, RigidBody *b, const Vec3 &pA, const Vec3 &pB,
                   const Vec3 &n)
      : Constraint(a, b), localA(pA), localB(pB), axis(n) {}

  void pre_step(float dt) override {
    if (!bodyA || !bodyB)
      return;

    
    Vec3 rA = bodyA->orientation.rotate(localA);
    Vec3 rB = bodyB->orientation.rotate(localB);
    Vec3 pA = bodyA->position + rA;
    Vec3 pB = bodyB->position + rB;

    
    Vec3 delta = pB - pA;

    
    Vec3 n = axis;

    
    
    linearA = n * -1.0f;
    angularA = rA.cross(n) * -1.0f;
    linearB = n;
    angularB = rB.cross(n);

    
    C_val = delta.dot(n);

    J_dot_v = 0.0f;
    bias = 0.0f;
  }
};

} 