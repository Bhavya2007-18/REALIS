// Physics Shape Base Class
// Immutable Geometric Truth
#pragma once
#include "../math/mat3.hpp"
#include "../math/quat.hpp"
#include "../math/vec3.hpp"
#include <vector>


namespace realis {
namespace geometry {

enum class ShapeType { SPHERE, BOX, CONVEX_HULL, PLANE };

class Shape {
public:
  ShapeType type;

  // AABB (Axis Aligned Bounding Box) for broadphase
  // Computed in local space, user transforms it
  Vec3 aabb_min;
  Vec3 aabb_max;

  virtual ~Shape() = default;

  // Support Mapping Function (GJK Core)
  // Returns the furthest point in the given direction in local space
  virtual Vec3 support(const Vec3 &direction) const = 0;

  // Inertia Tensor Calculation
  // mass: total mass of the object
  virtual Mat3 compute_inertia_tensor(float mass) const = 0;

protected:
  Shape(ShapeType t) : type(t) {}
};

} // namespace geometry
} // namespace realis
