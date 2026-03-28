
#include "Transform.hpp"

#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/quaternion.hpp>
#define GLM_ENABLE_EXPERIMENTAL
#include <glm/gtx/quaternion.hpp>

namespace realis::scene {




Transform::Transform()
    : m_position(0.0f, 0.0f, 0.0f),
      m_rotation(glm::quat(1.0f, 0.0f, 0.0f, 0.0f)) 
      ,
      m_scale(1.0f, 1.0f, 1.0f), m_dirty(true) {}

Transform::Transform(const glm::vec3 &position, const glm::quat &rotation,
                     const glm::vec3 &scale)
    : m_position(position),
      m_rotation(glm::normalize(rotation)) 
      ,
      m_scale(scale), m_dirty(true) {}




void Transform::setPosition(const glm::vec3 &position) {
  m_position = position;
  m_dirty = true;
}

void Transform::setRotation(const glm::quat &rotation) {
  
  
  m_rotation = glm::normalize(rotation);
  m_dirty = true;
}

void Transform::setScale(const glm::vec3 &scale) {
  m_scale = scale;
  m_dirty = true;
}

void Transform::setEulerAngles(const glm::vec3 &eulerRadians) {
  
  m_rotation = glm::normalize(glm::quat(eulerRadians));
  m_dirty = true;
}




glm::mat4 Transform::getLocalMatrix() const {
  
  
  
  
  
  
  
  
  
  
  

  
  const glm::mat4 T = glm::translate(glm::mat4(1.0f), m_position);

  
  const glm::mat4 R = glm::toMat4(m_rotation);

  
  const glm::mat4 S = glm::scale(glm::mat4(1.0f), m_scale);

  return T * R * S;
}

} 