#pragma once
#include <algorithm>
#include <glm/glm.hpp>
#include <vector>


namespace realis::scene {

/**
 * @brief Axis-Aligned Bounding Box (AABB) in 3D space.
 */
struct AABB {
  glm::vec3 min;
  glm::vec3 max;

  AABB() : min(1e30f), max(-1e30f) {}

  AABB(const glm::vec3 &min_, const glm::vec3 &max_) : min(min_), max(max_) {}

  /**
   * @brief Expand AABB to include a point.
   */
  void expand(const glm::vec3 &point) {
    min = glm::min(min, point);
    max = glm::max(max, point);
  }

  /**
   * @brief Transform this AABB by a matrix and compute the new AABB.
   * Note: This recomputes the bounding box of the transformed 8 corners.
   */
  AABB transformed(const glm::mat4 &matrix) const {
    glm::vec3 corners[8] = {{min.x, min.y, min.z}, {min.x, min.y, max.z},
                            {min.x, max.y, min.z}, {min.x, max.y, max.z},
                            {max.x, min.y, min.z}, {max.x, min.y, max.z},
                            {max.x, max.y, min.z}, {max.x, max.y, max.z}};

    AABB result;
    for (int i = 0; i < 8; ++i) {
      glm::vec4 p = matrix * glm::vec4(corners[i], 1.0f);
      result.expand(glm::vec3(p));
    }
    return result;
  }

  bool isValid() const {
    return min.x <= max.x && min.y <= max.y && min.z <= max.z;
  }
};

} // namespace realis::scene
