#include "narrowphase.hpp"
#include "../geometry/sphere.hpp"
#include <algorithm>
#include <cmath>


namespace realis {

static float get_radius(const RigidBody *b) {
  if (b && b->shape && b->shape->type == geometry::ShapeType::SPHERE) {
    return static_cast<const geometry::Sphere *>(b->shape)->radius;
  }
  return 0.5f; // Fallback radius
}

Contact NarrowPhase::generate_contact(RigidBody *a, RigidBody *b) {
  Contact contact;
  contact.body_a = a;
  contact.body_b = b;
  contact.restitution = std::min(a->restitution, b->restitution);

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
