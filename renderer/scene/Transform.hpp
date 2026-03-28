
#pragma once

#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/quaternion.hpp>
#define GLM_ENABLE_EXPERIMENTAL
#include <glm/gtx/quaternion.hpp>

namespace realis::scene {

class Transform {
public:
  

  
  Transform();

  
  Transform(const glm::vec3 &position, const glm::quat &rotation,
            const glm::vec3 &scale);

  

  void setPosition(const glm::vec3 &position);
  void setRotation(const glm::quat &rotation);
  void setScale(const glm::vec3 &scale);

  
  void setEulerAngles(const glm::vec3 &eulerRadians);

  

  const glm::vec3 &getPosition() const { return m_position; }
  const glm::quat &getRotation() const { return m_rotation; }
  const glm::vec3 &getScale() const { return m_scale; }

  
  glm::mat4 getLocalMatrix() const;

  
  
  

  void markDirty() { m_dirty = true; }
  void clearDirty() { m_dirty = false; }
  bool isDirty() const { return m_dirty; }

private:
  glm::vec3 m_position; 
  glm::quat m_rotation; 
  glm::vec3 m_scale;    

  bool m_dirty = true; 
};

} 