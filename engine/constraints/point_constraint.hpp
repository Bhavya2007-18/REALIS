
#pragma once
#include "constraint.hpp"

namespace realis {


class PointConstraint : public Constraint {
public:
  Vec3 localA; 
  Vec3 localB; 
  int axis;    

  PointConstraint(RigidBody *a, RigidBody *b, const Vec3 &pA, const Vec3 &pB,
                  int ax)
      : Constraint(a, b), localA(pA), localB(pB), axis(ax) {}

  void pre_step(float dt) override {
    if (!bodyA || !bodyB)
      return;

    
    Vec3 rA = bodyA->orientation.rotate(localA);
    Vec3 rB = bodyB->orientation.rotate(localB);
    Vec3 pA = bodyA->position + rA;
    Vec3 pB = bodyB->position + rB;

    
    Vec3 error = pA - pB;

    
    Vec3 n(0, 0, 0);
    if (axis == 0)
      n.x = 1.0f;
    else if (axis == 1)
      n.y = 1.0f;
    else if (axis == 2)
      n.z = 1.0f;

    
    
    linearA = n * -1.0f;
    angularA = rA.cross(n) * -1.0f;
    linearB = n;
    angularB = rB.cross(n);

    
    C_val = error.dot(n);

    
    
    J_dot_v = 0.0f;
    bias = 0.0f;
  }
};

} 