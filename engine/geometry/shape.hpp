

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

  
  
  Vec3 aabb_min;
  Vec3 aabb_max;

  virtual ~Shape() = default;

  
  
  virtual Vec3 support(const Vec3 &direction) const = 0;

  
  
  virtual Mat3 compute_inertia_tensor(float mass) const = 0;

protected:
  Shape(ShapeType t) : type(t) {}
};

} 
} 