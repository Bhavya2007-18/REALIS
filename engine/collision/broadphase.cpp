#include "broadphase.hpp"
#include "../dynamics/rigid_body.hpp"
#include "../geometry/plane.hpp"
#include "../geometry/sphere.hpp"
#include <cstddef>

namespace realis {

static float get_radius(const RigidBody *b) {
  if (b && b->shape && b->shape->type == geometry::ShapeType::SPHERE) {
    return static_cast<const geometry::Sphere *>(b->shape)->radius;
  }
  return 0.5f; // Fallback
}

std::vector<BroadPhasePair>
BroadPhase::detect(const std::vector<RigidBody *> &bodies) {
  std::vector<BroadPhasePair> pairs;

  for (size_t i = 0; i < bodies.size(); ++i) {
    for (size_t j = i + 1; j < bodies.size(); ++j) {
      RigidBody *a = bodies[i];
      RigidBody *b = bodies[j];

      if (a->inv_mass == 0.0f && b->inv_mass == 0.0f)
        continue;

      // Special case: Infinite Plane bounding volume
      if ((a->shape && a->shape->type == geometry::ShapeType::PLANE) ||
          (b->shape && b->shape->type == geometry::ShapeType::PLANE)) {
        pairs.emplace_back(a, b);
        continue;
      }

      float r1 = get_radius(a);
      float r2 = get_radius(b);

      float distSq = (a->position - b->position).dot(a->position - b->position);
      if (distSq <= (r1 + r2) * (r1 + r2)) {
        pairs.emplace_back(a, b);
      }
    }
  }

  return pairs;
}

} // namespace realis
