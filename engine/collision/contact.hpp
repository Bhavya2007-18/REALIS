
#pragma once
#include "../math/vec3.hpp"

namespace realis {

class RigidBody; 

struct Contact {
  RigidBody *body_a;
  RigidBody *body_b;

  Vec3 normal;       
  float penetration; 
  Vec3 point;        

  float restitution; 

  Vec3 tangent1;  
  Vec3 tangent2;  
  float friction; 

  
  float accumulated_normal_impulse;
  float accumulated_tangent1_impulse;
  float accumulated_tangent2_impulse;

  bool colliding; 

  Contact()
      : body_a(nullptr), body_b(nullptr), penetration(0), restitution(1.0f),
        friction(0.5f), accumulated_normal_impulse(0.0f),
        accumulated_tangent1_impulse(0.0f), accumulated_tangent2_impulse(0.0f),
        colliding(false) {}
};

} 