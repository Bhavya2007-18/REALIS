// Contact information
#pragma once
#include "../math/vec3.hpp"

namespace realis {

class RigidBody; // Forward declare

struct Contact {
  RigidBody *body_a;
  RigidBody *body_b;

  Vec3 normal;       // Direction of collision (from A to B)
  float penetration; // Distance of overlap
  Vec3 point;        // Contact point in world space

  float restitution; // Coefficient of restitution (e)

  Vec3 tangent1;  // First tangent direction
  Vec3 tangent2;  // Second tangent direction
  float friction; // Coefficient of friction (mu)

  // Iterative Solver Data
  float accumulated_normal_impulse;
  float accumulated_tangent1_impulse;
  float accumulated_tangent2_impulse;

  bool colliding; // Validation flag

  Contact()
      : body_a(nullptr), body_b(nullptr), penetration(0), restitution(1.0f),
        friction(0.5f), accumulated_normal_impulse(0.0f),
        accumulated_tangent1_impulse(0.0f), accumulated_tangent2_impulse(0.0f),
        colliding(false) {}
};

} // namespace realis
