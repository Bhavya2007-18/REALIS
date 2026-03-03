/**
 * @file SceneNode.hpp
 * @brief Scene graph node — the structural backbone of REALIS.
 *
 * Each SceneNode owns its children via std::unique_ptr, carries a local
 * transform, and caches a world matrix that is recalculated via full
 * top-down traversal (Option A — deterministic, no drift).
 *
 * Architectural guarantees:
 *   - No global state / no singletons
 *   - No rendering or physics knowledge inside this class
 *   - Parent destruction automatically destroys all descendants (RAII)
 *   - World matrix is always a top-down product; never incremented in place
 *
 * Usage:
 * @code
 *   auto root  = std::make_unique<SceneNode>("Root");
 *   auto child = std::make_unique<SceneNode>("Child");
 *   child->localTransform.setPosition({1.0f, 0.0f, 0.0f});
 *   root->addChild(std::move(child));
 *   root->updateWorldMatrix();   // propagates to all descendants
 *   glm::mat4 m = root->getWorldMatrix();
 * @endcode
 */
#pragma once

#include "Transform.hpp"

#include <glm/glm.hpp>

#include <cstdint>
#include <memory>
#include <string>
#include <vector>

namespace realis::scene {

class SceneNode {
public:
  // ── Construction / Destruction ────────────────────────────────────────────

  explicit SceneNode(std::string name = "Node");

  /**
   * @brief Destructor.
   * All child unique_ptrs destroyed automatically — no orphans possible.
   */
  ~SceneNode() = default;

  // Non-copyable: ownership semantics via unique_ptr make copy ill-defined.
  SceneNode(const SceneNode &) = delete;
  SceneNode &operator=(const SceneNode &) = delete;

  // Movable
  SceneNode(SceneNode &&) = default;
  SceneNode &operator=(SceneNode &&) = default;

  // ── Hierarchy ─────────────────────────────────────────────────────────────

  /**
   * @brief Transfer ownership of a child node into this node.
   * @param child A unique_ptr to the node to adopt. Must not be null.
   * @return Raw pointer to the adopted child (caller may keep for lookup).
   */
  SceneNode *addChild(std::unique_ptr<SceneNode> child);

  /**
   * @brief Remove a child from this node and return ownership to the caller.
   * @param child Raw pointer previously obtained via addChild.
   * @return The unique_ptr to the removed node (caller now owns it).
   *         Returns nullptr if child was not found.
   */
  std::unique_ptr<SceneNode> removeChild(SceneNode *child);

  SceneNode *getParent() const { return m_parent; }
  const std::vector<std::unique_ptr<SceneNode>> &getChildren() const {
    return m_children;
  }

  // ── Transform ─────────────────────────────────────────────────────────────

  /**
   * @brief The local-space transform for this node (position/rotation/scale).
   * Public by design — mirrors component-style access in modern scene graphs.
   */
  Transform localTransform;

  // ── World matrix ──────────────────────────────────────────────────────────

  /**
   * @brief Recompute this node's world matrix, then recursively update all
   *        descendants (full top-down traversal, Option A).
   *
   * Call this on the root every frame, or whenever any transform changes.
   * Guarantees: world matrix is always a clean product of ancestor chains,
   *             never an incremental accumulation.
   *
   * @param parentWorld  The parent's world matrix. Pass glm::mat4(1) for root.
   */
  void updateWorldMatrix(const glm::mat4 &parentWorld = glm::mat4(1.0f));

  /**
   * @brief Return the cached world matrix.
   * Valid only after updateWorldMatrix() has been called this frame.
   */
  const glm::mat4 &getWorldMatrix() const { return m_worldMatrix; }

  // ── Metadata (optional but recommended for UI trees) ──────────────────────

  const std::string &getName() const { return m_name; }
  void setName(const std::string &name) { m_name = name; }

  uint32_t getId() const { return m_id; }
  bool isVisible() const { return m_visible; }
  bool isEnabled() const { return m_enabled; }
  void setVisible(bool v) { m_visible = v; }
  void setEnabled(bool e) { m_enabled = e; }

private:
  // ── Identity ──────────────────────────────────────────────────────────────
  std::string m_name;
  uint32_t m_id; ///< Unique auto-incremented ID
  bool m_visible{true};
  bool m_enabled{true};

  // ── Hierarchy ─────────────────────────────────────────────────────────────
  SceneNode *m_parent{nullptr};
  std::vector<std::unique_ptr<SceneNode>> m_children;

  // ── Cached world matrix ───────────────────────────────────────────────────
  glm::mat4 m_worldMatrix{1.0f}; ///< Identity until first update

  // ── ID generator ─────────────────────────────────────────────────────────
  static uint32_t s_nextId;
};

} // namespace realis::scene
