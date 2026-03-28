
#pragma once

#include <glm/glm.hpp>

namespace realis::scene {
struct Ray;
}

namespace realis::renderer {

enum class ProjectionMode { Perspective, Orthographic };


class Camera {
public:
  Camera(glm::vec3 target = {0.0f, 0.0f, 0.0f}, float distance = 5.0f);

  
  void rotate(float deltaYaw, float deltaPitch);
  void pan(float deltaX, float deltaY);
  void zoom(float deltaScroll);

  
  void setAspectRatio(float ratio) { m_aspectRatio = ratio; }
  void setProjectionMode(ProjectionMode mode) { m_mode = mode; }
  void toggleProjectionMode();

  
  glm::mat4 getViewMatrix() const;
  glm::mat4 getProjectionMatrix() const;

  
  realis::scene::Ray generateRayFromMouse(float mouseX, float mouseY,
                                          float width, float height) const;

  
  glm::vec3 getPosition() const;
  glm::vec3 getTarget() const { return m_target; }
  ProjectionMode getProjectionMode() const { return m_mode; }

private:
  
  glm::vec3 m_target;
  float m_distance;
  float m_yaw;   
  float m_pitch; 

  
  float m_fov = 45.0f; 
  float m_aspectRatio = 1.6f;
  float m_nearPlane = 0.1f;
  float m_farPlane = 1000.0f;
  ProjectionMode m_mode = ProjectionMode::Perspective;

  
  const glm::vec3 m_up = {0.0f, 1.0f, 0.0f};

  
  void clampPitch();
};

} 