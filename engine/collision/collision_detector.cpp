// GJK/EPA narrow phase implementation
#include "collision_detector.hpp"
#include <algorithm>
#include <cmath>
#include <vector>


#include "../geometry/sphere.hpp"

namespace realis {

// For Phase 4, we'll start with SPHERE-SPHERE and SPHERE-PLANE as validated in
// the plan Full GJK for convex hulls will be added if needed, but the primary
// validation is impulses.

static float get_radius(const RigidBody *b) {
  if (b && b->shape && b->shape->type == geometry::ShapeType::SPHERE) {
    return static_cast<const geometry::Sphere *>(b->shape)->radius;
  }
  return 0.5f; // Fallback radius
}

bool CollisionDetector::gjk_test(RigidBody *a, RigidBody *b) {
  // Simplified sphere-sphere detection for broadphase/narrowphase
  float r1 = get_radius(a);
  float r2 = get_radius(b);

  float distSq = (a->position - b->position).dot(a->position - b->position);
  return distSq <= (r1 + r2) * (r1 + r2);
}

Contact CollisionDetector::get_contact(RigidBody *a, RigidBody *b) {
  Contact contact;
  contact.body_a = a;
  contact.body_b = b;
  contact.restitution = 1.0f; // Default to perfectly elastic for now

  float r1 = get_radius(a);
  float r2 = get_radius(b);

  Vec3 relative = b->position - a->position;
  float distSq = relative.dot(relative);
  float minDist = r1 + r2;

  if (distSq <= minDist * minDist) {
    float dist = std::sqrt(distSq);
    contact.colliding = true;

    if (dist > 1e-6f) {
      contact.normal = relative * (1.0f / dist);
      contact.penetration = minDist - dist;
      contact.point = a->position + contact.normal * r1;
    } else {
      // Degenerate case (exactly centered)
      contact.normal = Vec3(0, 1, 0);
      contact.penetration = minDist;
      contact.point = a->position;
    }
  }

  return contact;
}

} // namespace realis
