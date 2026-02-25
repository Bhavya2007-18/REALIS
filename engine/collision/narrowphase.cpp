#include "narrowphase.hpp"
#include "../geometry/box.hpp"
#include "../geometry/plane.hpp"
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

static void compute_tangents(const Vec3 &normal, Vec3 &t1, Vec3 &t2) {
  if (std::abs(normal.x) >= 0.57735f) {
    t1 = Vec3(normal.y, -normal.x, 0.0f).normalized();
  } else {
    t1 = Vec3(0.0f, normal.z, -normal.y).normalized();
  }
  t2 = normal.cross(t1).normalized();
}

static Contact generate_sphere_sphere(RigidBody *a, RigidBody *b) {
  Contact contact;
  contact.body_a = a;
  contact.body_b = b;
  contact.restitution = std::min(a->restitution, b->restitution);
  contact.friction = std::min(a->friction, b->friction);

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
      contact.normal = Vec3(0, 1, 0);
      contact.penetration = minDist;
      contact.point = a->position;
    }

    compute_tangents(contact.normal, contact.tangent1, contact.tangent2);
  }

  return contact;
}

static Contact generate_sphere_plane(RigidBody *sphere_body,
                                     RigidBody *plane_body) {
  Contact contact;
  contact.body_a = sphere_body;
  contact.body_b = plane_body;
  contact.restitution =
      std::min(sphere_body->restitution, plane_body->restitution);
  contact.friction = std::min(sphere_body->friction, plane_body->friction);

  const auto *sphere =
      static_cast<const geometry::Sphere *>(sphere_body->shape);
  const auto *plane = static_cast<const geometry::Plane *>(plane_body->shape);

  // Distance from sphere center to plane
  float dist = sphere_body->position.dot(plane->normal) - plane->d;

  if (dist <= sphere->radius) {
    contact.colliding = true;
    // Normal points from A (sphere) to B (plane). We want normal from B to A
    // for impulse application usually, but our engine expects normal from A to
    // B. Let's make it point from Sphere OUTWARDS towards the plane? Wait,
    // standard points from A to B. So from Sphere TO Plane is -plane->normal.
    contact.normal = plane->normal * -1.0f;
    contact.penetration = sphere->radius - dist;
    contact.point = sphere_body->position - plane->normal * sphere->radius;
    compute_tangents(contact.normal, contact.tangent1, contact.tangent2);
  }

  return contact;
}

static Contact generate_box_plane(RigidBody *box_body, RigidBody *plane_body) {
  Contact contact;
  contact.body_a = box_body;
  contact.body_b = plane_body;
  contact.restitution =
      std::min(box_body->restitution, plane_body->restitution);
  contact.friction = std::min(box_body->friction, plane_body->friction);

  const auto *box = static_cast<const geometry::Box *>(box_body->shape);
  const auto *plane = static_cast<const geometry::Plane *>(plane_body->shape);

  // Box to plane. Find the deepest vertex.
  // For Phase 2B, box orientation is used.
  Mat3 R = box_body->orientation.to_mat3();

  // Test all 8 vertices
  Vec3 deepest_point;
  float min_dist = 1e9f;

  for (int i = 0; i < 8; ++i) {
    Vec3 local_v((i & 1) ? box->half_extents.x : -box->half_extents.x,
                 (i & 2) ? box->half_extents.y : -box->half_extents.y,
                 (i & 4) ? box->half_extents.z : -box->half_extents.z);

    Vec3 world_v = box_body->position + (R * local_v);
    float d = world_v.dot(plane->normal) - plane->d;

    if (d < min_dist) {
      min_dist = d;
      deepest_point = world_v;
    }
  }

  if (min_dist <= 0.0f) {
    contact.colliding = true;
    contact.normal = plane->normal * -1.0f;
    contact.penetration = -min_dist;
    contact.point = deepest_point;
    compute_tangents(contact.normal, contact.tangent1, contact.tangent2);
    // std::cout << "DEBUG: Box-Plane Hit! Pen: " << contact.penetration <<
    // "\n";
  }

  return contact;
}

Contact NarrowPhase::generate_contact(RigidBody *a, RigidBody *b) {
  if (!a || !b || !a->shape || !b->shape)
    return Contact();

  auto type_a = a->shape->type;
  auto type_b = b->shape->type;

  // Sphere - Sphere
  if (type_a == geometry::ShapeType::SPHERE &&
      type_b == geometry::ShapeType::SPHERE) {
    return generate_sphere_sphere(a, b);
  }

  // Sphere - Plane
  if (type_a == geometry::ShapeType::SPHERE &&
      type_b == geometry::ShapeType::PLANE) {
    return generate_sphere_plane(a, b);
  }
  if (type_a == geometry::ShapeType::PLANE &&
      type_b == geometry::ShapeType::SPHERE) {
    Contact c = generate_sphere_plane(b, a);
    // Swap A and B mathematically
    std::swap(c.body_a, c.body_b);
    c.normal = c.normal * -1.0f;
    compute_tangents(c.normal, c.tangent1, c.tangent2);
    return c;
  }

  // Box - Plane
  if (type_a == geometry::ShapeType::BOX &&
      type_b == geometry::ShapeType::PLANE) {
    return generate_box_plane(a, b);
  }
  if (type_a == geometry::ShapeType::PLANE &&
      type_b == geometry::ShapeType::BOX) {
    Contact c = generate_box_plane(b, a);
    std::swap(c.body_a, c.body_b);
    c.normal = c.normal * -1.0f;
    compute_tangents(c.normal, c.tangent1, c.tangent2);
    return c;
  }

  // Box - Box (Fallback to Sphere-Sphere using bounding radius for Phase 2B)
  if (type_a == geometry::ShapeType::BOX &&
      type_b == geometry::ShapeType::BOX) {
    return generate_sphere_sphere(a, b);
  }

  // Fallback or unhandled combinations
  return Contact();
}

} // namespace realis
