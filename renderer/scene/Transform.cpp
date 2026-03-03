/**
 * @file Transform.cpp
 * @brief Implementation of the REALIS Transform component.
 */
#include "Transform.hpp"

#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/quaternion.hpp>
#define GLM_ENABLE_EXPERIMENTAL
#include <glm/gtx/quaternion.hpp>

namespace realis::scene {

// ── Construction
// ───────────────────────────────────────────────────────────────

Transform::Transform()
    : m_position(0.0f, 0.0f, 0.0f),
      m_rotation(glm::quat(1.0f, 0.0f, 0.0f, 0.0f)) // identity quaternion (w=1)
      ,
      m_scale(1.0f, 1.0f, 1.0f), m_dirty(true) {}

Transform::Transform(const glm::vec3 &position, const glm::quat &rotation,
                     const glm::vec3 &scale)
    : m_position(position),
      m_rotation(glm::normalize(rotation)) // Always normalize on input
      ,
      m_scale(scale), m_dirty(true) {}

// ── Setters
// ────────────────────────────────────────────────────────────────────

void Transform::setPosition(const glm::vec3 &position) {
  m_position = position;
  m_dirty = true;
}

void Transform::setRotation(const glm::quat &rotation) {
  // Always normalize the quaternion to prevent drift from repeated
  // rotational compositions that the caller may have performed.
  m_rotation = glm::normalize(rotation);
  m_dirty = true;
}

void Transform::setScale(const glm::vec3 &scale) {
  m_scale = scale;
  m_dirty = true;
}

void Transform::setEulerAngles(const glm::vec3 &eulerRadians) {
  // glm::quat constructor from Euler vector: pitch/yaw/roll (XYZ)
  m_rotation = glm::normalize(glm::quat(eulerRadians));
  m_dirty = true;
}

// ── Local matrix
// ──────────────────────────────────────────────────────────────

glm::mat4 Transform::getLocalMatrix() const {
  // ──────────────────────────────────────────────────────────────────────────
  // Local matrix = T * R * S
  //
  // Applied right-to-left to the vertex:
  //   1. Scale the object in its local frame
  //   2. Rotate it around local origin
  //   3. Translate it to local position
  //
  // This is the canonical TRS convention for scene graphs.
  // We NEVER store this matrix as a member — always recompute clean.
  // ──────────────────────────────────────────────────────────────────────────

  // Translation matrix
  const glm::mat4 T = glm::translate(glm::mat4(1.0f), m_position);

  // Rotation matrix from unit quaternion
  const glm::mat4 R = glm::toMat4(m_rotation);

  // Scale matrix
  const glm::mat4 S = glm::scale(glm::mat4(1.0f), m_scale);

  return T * R * S;
}

} // namespace realis::scene
