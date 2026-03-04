/**
 * @file Camera.hpp
 * @description Pure math orbital camera for REALIS.
 */
#pragma once

#include <glm/glm.hpp>

namespace realis::scene {
struct Ray;
}

namespace realis::renderer {

enum class ProjectionMode { Perspective, Orthographic };

/**
 * @class Camera
 * @brief Target-based orbital camera (Orbit, Pan, Zoom).
 *
 * Math model:
 * Position = Target + Distance * SphericalDirection(Yaw, Pitch)
 */
class Camera {
public:
  Camera(glm::vec3 target = {0.0f, 0.0f, 0.0f}, float distance = 5.0f);

  // ── Input API ───────────────────────────────────────────────────────────
  void rotate(float deltaYaw, float deltaPitch);
  void pan(float deltaX, float deltaY);
  void zoom(float deltaScroll);

  // ── Projection/Viewport ──────────────────────────────────────────────────
  void setAspectRatio(float ratio) { m_aspectRatio = ratio; }
  void setProjectionMode(ProjectionMode mode) { m_mode = mode; }
  void toggleProjectionMode();

  // ── Matrices ─────────────────────────────────────────────────────────────
  glm::mat4 getViewMatrix() const;
  glm::mat4 getProjectionMatrix() const;

  /**
   * @brief Convert mouse screen coordinates to a world-space ray.
   */
  realis::scene::Ray generateRayFromMouse(float mouseX, float mouseY,
                                          float width, float height) const;

  // ── Accessors ────────────────────────────────────────────────────────────
  glm::vec3 getPosition() const;
  glm::vec3 getTarget() const { return m_target; }
  ProjectionMode getProjectionMode() const { return m_mode; }

private:
  // State
  glm::vec3 m_target;
  float m_distance;
  float m_yaw;   // Radians
  float m_pitch; // Radians

  // Projection config
  float m_fov = 45.0f; // Degrees
  float m_aspectRatio = 1.6f;
  float m_nearPlane = 0.1f;
  float m_farPlane = 1000.0f;
  ProjectionMode m_mode = ProjectionMode::Perspective;

  // Constants
  const glm::vec3 m_up = {0.0f, 1.0f, 0.0f};

  // Helper: Clamps yaw (optional) and pitch
  void clampPitch();
};

} // namespace realis::renderer
