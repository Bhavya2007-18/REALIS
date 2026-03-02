/**
 * @file Camera.cpp
 * @description Core camera mathematics.
 */
#include "Camera.hpp"
#include <algorithm>
#include <glm/gtc/matrix_transform.hpp>


namespace realis::renderer {

Camera::Camera(glm::vec3 target, float distance)
    : m_target(target), m_distance(distance), m_yaw(0.0f), m_pitch(0.0f) {}

void Camera::rotate(float deltaYaw, float deltaPitch) {
  m_yaw += deltaYaw;
  m_pitch += deltaPitch;
  clampPitch();
}

void Camera::pan(float deltaX, float deltaY) {
  // Determine view-space orientation
  glm::vec3 direction = glm::normalize(getPosition() - m_target);
  glm::vec3 right = glm::normalize(glm::cross({0.0f, 1.0f, 0.0f}, direction));
  glm::vec3 up = glm::cross(direction, right);

  // Scale panning speed based on distance to maintain visual consistency
  float panSpeed = m_distance * 0.001f;
  m_target += right * deltaX * panSpeed;
  m_target += up * deltaY * panSpeed;
}

void Camera::zoom(float deltaScroll) {
  // Exponential zoom for smooth feel
  // factor > 0 zooms out, factor < 0 zooms in
  float zoomFactor = 0.1f;
  m_distance *= (1.0f - deltaScroll * zoomFactor);

  // Clamp minimum distance to prevent camera inversion/clipping
  if (m_distance < 0.1f) {
    m_distance = 0.1f;
  }
}

void Camera::toggleProjectionMode() {
  m_mode = (m_mode == ProjectionMode::Perspective)
               ? ProjectionMode::Orthographic
               : ProjectionMode::Perspective;
}

glm::mat4 Camera::getViewMatrix() const {
  return glm::lookAt(getPosition(), m_target, m_up);
}

glm::mat4 Camera::getProjectionMatrix() const {
  if (m_mode == ProjectionMode::Perspective) {
    return glm::perspective(glm::radians(m_fov), m_aspectRatio, m_nearPlane,
                            m_farPlane);
  } else {
    // For Orthographic, the width/height are based on distance
    // to maintain framing relative to the target.
    float orthoHeight = m_distance * glm::tan(glm::radians(m_fov * 0.5f));
    float orthoWidth = orthoHeight * m_aspectRatio;
    return glm::ortho(-orthoWidth, orthoWidth, -orthoHeight, orthoHeight,
                      m_nearPlane, m_farPlane);
  }
}

glm::vec3 Camera::getPosition() const {
  // Convert spherical (yaw, pitch) to Cartesian
  float x = m_distance * glm::cos(m_pitch) * glm::sin(m_yaw);
  float y = m_distance * glm::sin(m_pitch);
  float z = m_distance * glm::cos(m_pitch) * glm::cos(m_yaw);

  return m_target + glm::vec3(x, y, z);
}

void Camera::clampPitch() {
  // Clamp slightly below 90 degrees to avoid gimbal lock/flip
  const float limit = glm::radians(89.9f);
  if (m_pitch > limit)
    m_pitch = limit;
  if (m_pitch < -limit)
    m_pitch = -limit;
}

} // namespace realis::renderer
