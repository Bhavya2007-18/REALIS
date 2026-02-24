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

  bool colliding; // Validation flag

  Contact()
      : body_a(nullptr), body_b(nullptr), penetration(0), restitution(1.0f),
        colliding(false) {}
};

} // namespace realis
