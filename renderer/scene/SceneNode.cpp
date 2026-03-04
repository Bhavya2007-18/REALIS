/**
 * @file SceneNode.cpp
 * @brief Implementation of the REALIS scene graph node.
 */
#include "SceneNode.hpp"
#include "RayIntersection.hpp"

#include <algorithm>
#include <cassert>
#include <stdexcept>

namespace realis::scene {

// ── Static ID counter
// ──────────────────────────────────────────────────────────
uint32_t SceneNode::s_nextId = 0;

// ── Construction
// ───────────────────────────────────────────────────────────────

SceneNode::SceneNode(std::string name)
    : localTransform(), m_name(std::move(name)), m_id(s_nextId++),
      m_parent(nullptr), m_worldMatrix(1.0f) {}

// ── Hierarchy
// ──────────────────────────────────────────────────────────────────

SceneNode *SceneNode::addChild(std::unique_ptr<SceneNode> child) {
  assert(child != nullptr && "addChild: child must not be null");

  // A node cannot be its own child (would create a cycle).
  assert(child.get() != this && "addChild: cannot add node as its own child");

  // Wire the parent pointer before transferring ownership.
  child->m_parent = this;

  SceneNode *rawPtr = child.get();
  m_children.push_back(std::move(child));
  return rawPtr;
}

std::unique_ptr<SceneNode> SceneNode::removeChild(SceneNode *child) {
  // Find child by raw pointer
  auto it = std::find_if(m_children.begin(), m_children.end(),
                         [child](const std::unique_ptr<SceneNode> &owned) {
                           return owned.get() == child;
                         });

  if (it == m_children.end()) {
    return nullptr; // Not a child of this node
  }

  // Detach parent link before releasing
  (*it)->m_parent = nullptr;

  // Extract ownership
  std::unique_ptr<SceneNode> extracted = std::move(*it);

  // Swap-erase to avoid O(n) shifting in large child lists
  if (it != m_children.end() - 1) {
    *it = std::move(m_children.back());
  }
  m_children.pop_back();

  return extracted;
}

// ── World matrix propagation
// ───────────────────────────────────────────────────

void SceneNode::updateWorldMatrix(const glm::mat4 &parentWorld) {
  // ──────────────────────────────────────────────────────────────────────────
  // World matrix rule:
  //
  //   root node  (parent == nullptr):  worldMatrix = localMatrix
  //   child node (parent != nullptr):  worldMatrix = parent.worldMatrix *
  //   localMatrix
  //
  // We accept parentWorld as a parameter rather than reading
  // m_parent->m_worldMatrix directly. This allows the public root call to pass
  // glm::mat4(1) without requiring the root to have a sentinel parent node.
  //
  // CRITICAL: We never modify m_worldMatrix except by full recomputation here.
  //           No incremental multiplication ("worldMatrix *= delta") is ever
  //           used.
  // ──────────────────────────────────────────────────────────────────────────

  // Recompute local matrix fresh from components (no stored local matrix)
  const glm::mat4 local = localTransform.getLocalMatrix();

  // Combine with parent's world matrix
  m_worldMatrix = parentWorld * local;

  // Update world-space AABB by transforming the local AABB
  if (localAABB.isValid()) {
    worldAABB = localAABB.transformed(m_worldMatrix);
  }

  // Clear dirty flag for this node
  localTransform.clearDirty();

  // Recurse into all children, passing our freshly computed world matrix
  for (auto &child : m_children) {
    child->updateWorldMatrix(m_worldMatrix);
  }
}

SceneNode *SceneNode::pickChild(const Ray &ray, float &closestT) {
  SceneNode *closestNode = nullptr;
  closestT = 1e30f;

  // 1. Check self (only if enabled and visible)
  if (m_enabled && m_visible && worldAABB.isValid()) {
    float t = 0.0f;
    if (intersectRayAABB(ray, worldAABB, t)) {
      closestT = t;
      closestNode = this;
    }
  }

  // 2. Check children
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

} // namespace realis::scene
