
#pragma once
#include "constraint.hpp"
#include <cmath>

namespace realis {


class DistanceConstraint : public Constraint {
public:
  float distance;
  float frequency; 
  float damping;

  DistanceConstraint(RigidBody *a, RigidBody *b, float dist)
      : Constraint(a, b), distance(dist), frequency(0.0f), damping(0.0f) {}

  void pre_step(float dt) override {
    if (!bodyA || !bodyB)
      return;

    
    Vec3 pA = bodyA->position;
    Vec3 pB = bodyB->position;
    Vec3 n = pB - pA;
    float d = n.magnitude();

    if (d > 0.0001f) {
      n = n * (1.0f / d);
    } else {
      n = Vec3(0, 1, 0); 
    }

    
    
    
    
    linearA = n * -1.0f;
    linearB = n;

    
    angularA = Vec3(0, 0, 0);
    angularB = Vec3(0, 0, 0);

    
    C_val = d - distance;

    
    
    
    
    Vec3 vA = bodyA->velocity;
    Vec3 vB = bodyB->velocity;
    Vec3 rel_v = vB - vA;
    Vec3 n_dot = (rel_v - n * n.dot(rel_v)) * (1.0f / d);

    J_dot_v = n_dot.dot(rel_v);

    
    
    
    bias = 0.0f;
  }
};

} 