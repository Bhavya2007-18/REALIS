#pragma once
#include "AABB.hpp"
#include "Ray.hpp"
#include <algorithm>
#include <glm/glm.hpp>


namespace realis::scene {


inline bool intersectRayAABB(const Ray &ray, const AABB &aabb, float &t) {
  float tmin = -1e30f;
  float tmax = 1e30f;

  for (int i = 0; i < 3; ++i) {
    if (std::abs(ray.direction[i]) > 1e-6f) {
      float t1 = (aabb.min[i] - ray.origin[i]) / ray.direction[i];
      float t2 = (aabb.max[i] - ray.origin[i]) / ray.direction[i];

      tmin = std::max(tmin, std::min(t1, t2));
      tmax = std::min(tmax, std::max(t1, t2));
    } else {
      
      if (ray.origin[i] < aabb.min[i] || ray.origin[i] > aabb.max[i]) {
        return false;
      }
    }
  }

  if (tmax >= std::max(tmin, 0.0f)) {
    t = tmin < 0.0f ? tmax : tmin;
    return true;
  }

  return false;
}

} 