#pragma once
#include <glm/glm.hpp>

namespace realis::scene {

/**
 * @brief Represents a geometric ray in 3D space.
 */
struct Ray {
  glm::vec3 origin;
  glm::vec3 direction;

  /**
   * @brief Construct a ray from origin and direction.
   * @param o Origin point
   * @param d Direction vector (should be normalized)
   */
  Ray(const glm::vec3 &o, const glm::vec3 &d)
      : origin(o), direction(glm::normalize(d)) {}

  /**
   * @brief Get point along the ray at distance t.
   */
  glm::vec3 at(float t) const { return origin + t * direction; }
};

} // namespace realis::scene
