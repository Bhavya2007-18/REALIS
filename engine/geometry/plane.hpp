
#pragma once
#include "shape.hpp"

namespace realis {
namespace geometry {

class Plane : public Shape {
public:
  Vec3 normal;
  float d; 

  
  Plane(const Vec3 &n, float dist)
      : Shape(ShapeType::PLANE), normal(n.normalized()), d(dist) {
    
    
    
    aabb_min = Vec3(-1e8f, -1e8f, -1e8f);
    aabb_max = Vec3(1e8f, 1e8f, 1e8f);
  }

  Vec3 support(const Vec3 &direction) const override {
    
    
    
    return normal * d;
  }

  Mat3 compute_inertia_tensor(float mass) const override {
    
    return Mat3::identity();
  }
};

} 
} 