// Infinite Plane Primitive
#pragma once
#include "shape.hpp"

namespace realis {
namespace geometry {

class Plane : public Shape {
public:
  Vec3 normal;
  float d; // Distance from origin along normal

  // Plane equation: dot(normal, p) = d
  Plane(const Vec3 &n, float dist)
      : Shape(ShapeType::PLANE), normal(n.normalized()), d(dist) {
    // A Plane is technically infinite, so AABB is infinite.
    // For collision broadphase, we usually special-case it or give it huge
    // bounds.
    aabb_min = Vec3(-1e8f, -1e8f, -1e8f);
    aabb_max = Vec3(1e8f, 1e8f, 1e8f);
  }

  Vec3 support(const Vec3 &direction) const override {
    // Technically undefined for an infinite plane, but logically
    // any point on the plane going towards the direction could be infinity.
    // Returns a point on the plane simply.
    return normal * d;
  }

  Mat3 compute_inertia_tensor(float mass) const override {
    // Infinite plane has infinite inertia
    return Mat3::identity();
  }
};

} // namespace geometry
} // namespace realis
