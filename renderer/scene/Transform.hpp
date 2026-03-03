/**
 * @file Transform.hpp
 * @brief Local-space transform component for REALIS scene graph.
 *
 * Stores position, rotation (quaternion), and scale as separate,
 * independent components. The local matrix is ALWAYS recomputed
 * fresh from these components — it is never stored permanently.
 *
 * This design guarantees:
 *   - Zero floating-point drift from incremental matrix multiplication
 *   - No rotation skewing from accumulated floating-point error
 *   - Clean separation of each degree-of-freedom
 *
 * Matrix convention: T * R * S  (column-major, right-multiply)
 * Matching GLM's default and OpenGL's expected convention.
 */
#pragma once

#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/quaternion.hpp>
#define GLM_ENABLE_EXPERIMENTAL
#include <glm/gtx/quaternion.hpp>

namespace realis::scene {

class Transform {
public:
  // ── Construction ──────────────────────────────────────────────────────────

  /**
   * @brief Default: identity (no translation, no rotation, unit scale).
   */
  Transform();

  /**
   * @brief Construct with explicit components.
   */
  Transform(const glm::vec3 &position, const glm::quat &rotation,
            const glm::vec3 &scale);

  // ── Setters ───────────────────────────────────────────────────────────────

  void setPosition(const glm::vec3 &position);
  void setRotation(const glm::quat &rotation);
  void setScale(const glm::vec3 &scale);

  /**
   * @brief Set rotation from Euler angles (radians, XYZ order).
   * Internally converts to quaternion immediately — no Euler angles stored.
   */
  void setEulerAngles(const glm::vec3 &eulerRadians);

  // ── Getters ───────────────────────────────────────────────────────────────

  const glm::vec3 &getPosition() const { return m_position; }
  const glm::quat &getRotation() const { return m_rotation; }
  const glm::vec3 &getScale() const { return m_scale; }

  /**
   * @brief Recompute and return the local 4×4 matrix: T * R * S.
   *
   * Called fresh every time it is needed — no caching.
   * This is the only correct way to assemble the local matrix.
   *
   * @return A freshly computed glm::mat4 representing this transform.
   */
  glm::mat4 getLocalMatrix() const;

  // ── Dirty flag ────────────────────────────────────────────────────────────
  // Provided for future dirty-flag propagation (Option B). Currently
  // setters mark dirty but it is the caller's responsibility to clear it.

  void markDirty() { m_dirty = true; }
  void clearDirty() { m_dirty = false; }
  bool isDirty() const { return m_dirty; }

private:
  glm::vec3 m_position; ///< Local translation
  glm::quat m_rotation; ///< Local rotation (unit quaternion)
  glm::vec3 m_scale;    ///< Local scale per axis

  bool m_dirty = true; ///< True if world matrix needs recomputation
};

} // namespace realis::scene
