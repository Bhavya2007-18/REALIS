
#pragma once

#include "AABB.hpp"
#include "Ray.hpp"
#include "Transform.hpp"


#include <glm/glm.hpp>

#include <cstdint>
#include <memory>
#include <string>
#include <vector>

namespace realis::scene {

class SceneNode {
public:
  

  explicit SceneNode(std::string name = "Node");

  
  ~SceneNode() = default;

  
  SceneNode(const SceneNode &) = delete;
  SceneNode &operator=(const SceneNode &) = delete;

  
  SceneNode(SceneNode &&) = default;
  SceneNode &operator=(SceneNode &&) = default;

  

  
  SceneNode *addChild(std::unique_ptr<SceneNode> child);

  
  std::unique_ptr<SceneNode> removeChild(SceneNode *child);

  SceneNode *getParent() const { return m_parent; }
  const std::vector<std::unique_ptr<SceneNode>> &getChildren() const {
    return m_children;
  }

  

  
  Transform localTransform;

  
  AABB localAABB;
  AABB worldAABB;

  

  
  SceneNode* pickChild(const Ray& ray, float& closestT);

  

  
  void updateWorldMatrix(const glm::mat4 &parentWorld = glm::mat4(1.0f));

  
  const glm::mat4 &getWorldMatrix() const { return m_worldMatrix; }

  

  const std::string &getName() const { return m_name; }
  void setName(const std::string &name) { m_name = name; }

  uint32_t getId() const { return m_id; }
  bool isVisible() const { return m_visible; }
  bool isEnabled() const { return m_enabled; }
  void setVisible(bool v) { m_visible = v; }
  void setEnabled(bool e) { m_enabled = e; }

private:
  
  std::string m_name;
  uint32_t m_id; 
  bool m_visible{true};
  bool m_enabled{true};

  
  SceneNode *m_parent{nullptr};
  std::vector<std::unique_ptr<SceneNode>> m_children;

  
  glm::mat4 m_worldMatrix{1.0f}; 

  
  static uint32_t s_nextId;
};

} 