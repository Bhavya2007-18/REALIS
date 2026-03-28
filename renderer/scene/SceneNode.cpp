
#include "SceneNode.hpp"
#include "RayIntersection.hpp"

#include <algorithm>
#include <cassert>
#include <stdexcept>

namespace realis::scene {



uint32_t SceneNode::s_nextId = 0;




SceneNode::SceneNode(std::string name)
    : localTransform(), m_name(std::move(name)), m_id(s_nextId++),
      m_parent(nullptr), m_worldMatrix(1.0f) {}




SceneNode *SceneNode::addChild(std::unique_ptr<SceneNode> child) {
  assert(child != nullptr && "addChild: child must not be null");

  
  assert(child.get() != this && "addChild: cannot add node as its own child");

  
  child->m_parent = this;

  SceneNode *rawPtr = child.get();
  m_children.push_back(std::move(child));
  return rawPtr;
}

std::unique_ptr<SceneNode> SceneNode::removeChild(SceneNode *child) {
  
  auto it = std::find_if(m_children.begin(), m_children.end(),
                         [child](const std::unique_ptr<SceneNode> &owned) {
                           return owned.get() == child;
                         });

  if (it == m_children.end()) {
    return nullptr; 
  }

  
  (*it)->m_parent = nullptr;

  
  std::unique_ptr<SceneNode> extracted = std::move(*it);

  
  if (it != m_children.end() - 1) {
    *it = std::move(m_children.back());
  }
  m_children.pop_back();

  return extracted;
}




void SceneNode::updateWorldMatrix(const glm::mat4 &parentWorld) {
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  

  
  const glm::mat4 local = localTransform.getLocalMatrix();

  
  m_worldMatrix = parentWorld * local;

  
  if (localAABB.isValid()) {
    worldAABB = localAABB.transformed(m_worldMatrix);
  }

  
  localTransform.clearDirty();

  
  for (auto &child : m_children) {
    child->updateWorldMatrix(m_worldMatrix);
  }
}

SceneNode *SceneNode::pickChild(const Ray &ray, float &closestT) {
  SceneNode *closestNode = nullptr;
  closestT = 1e30f;

  
  if (m_enabled && m_visible && worldAABB.isValid()) {
    float t = 0.0f;
    if (intersectRayAABB(ray, worldAABB, t)) {
      closestT = t;
      closestNode = this;
    }
  }

  
  for (auto &child : m_children) {
    float childT = 0.0f;
    SceneNode *hitNode = child->pickChild(ray, childT);
    if (hitNode && childT < closestT) {
      closestT = childT;
      closestNode = hitNode;
    }
  }

  return closestNode;
}

} 