/**
 * @file test_scene_graph.cpp
 * @brief Standalone verification for REALIS scene graph hierarchy.
 *
 * Build: Compiled as a separate CMake target (test_scene_graph).
 * Deps:  GLM only — no window, no OpenGL, no GPU required.
 *
 * Tests:
 *   1. Identity root        — worldMatrix == identity when no transform set
 *   2. Root translation     — root translate propagates to world position
 *   3. Translation chain    — child world position = parent pos + child local
 * pos
 *   4. Rotation propagation — parent 90° Y-rotation correctly moves child
 *   5. Scale propagation    — parent ×2 scale applied to child world
 *   6. Deep hierarchy       — 10-level chain, cumulative translation sums
 * correctly
 *   7. Independent child    — rotating child does not affect parent's
 * worldMatrix
 *   8. No drift             — 1000 incremental root rotations: det(worldMatrix)
 * ≈ 1
 */

#include "../../renderer/scene/SceneNode.hpp"
#include "../../renderer/scene/Transform.hpp"

#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/quaternion.hpp>
#define GLM_ENABLE_EXPERIMENTAL
#include <glm/gtx/quaternion.hpp>

#include <cassert>
#include <cmath>
#include <cstdio>
#include <memory>
#include <string>

// ── Tiny test harness
// ──────────────────────────────────────────────────────────
static int g_passed = 0;
static int g_total = 0;

static bool nearEqual(float a, float b, float eps = 1e-4f) {
  return std::abs(a - b) < eps;
}

static bool mat4Near(const glm::mat4 &A, const glm::mat4 &B,
                     float eps = 1e-4f) {
  for (int col = 0; col < 4; ++col)
    for (int row = 0; row < 4; ++row)
      if (!nearEqual(A[col][row], B[col][row], eps))
        return false;
  return true;
}

static void runTest(const std::string &name, bool result) {
  ++g_total;
  if (result) {
    ++g_passed;
    std::printf("  [PASS] %s\n", name.c_str());
  } else {
    std::printf("  [FAIL] %s\n", name.c_str());
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test implementations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Test 1: Root with default (identity) transform.
 * Expected: worldMatrix == glm::mat4(1.0f)
 */
static bool test_identity_root() {
  using namespace realis::scene;
  auto root = std::make_unique<SceneNode>("Root");
  root->updateWorldMatrix();
  return mat4Near(root->getWorldMatrix(), glm::mat4(1.0f));
}

/**
 * Test 2: Root translation.
 * Root at (3, 0, 0) → column 3 of worldMatrix should be (3, 0, 0, 1).
 */
static bool test_root_translation() {
  using namespace realis::scene;
  auto root = std::make_unique<SceneNode>("Root");
  root->localTransform.setPosition({3.0f, 0.0f, 0.0f});
  root->updateWorldMatrix();
  const glm::mat4 &W = root->getWorldMatrix();
  return nearEqual(W[3][0], 3.0f) && nearEqual(W[3][1], 0.0f) &&
         nearEqual(W[3][2], 0.0f) && nearEqual(W[3][3], 1.0f);
}

/**
 * Test 3: Child world position = parent translation + child local translation.
 * Parent at (2, 0, 0), child at local (0, 3, 0)
 * → child world position should be (2, 3, 0).
 */
static bool test_translation_chain() {
  using namespace realis::scene;
  auto root = std::make_unique<SceneNode>("Root");
  root->localTransform.setPosition({2.0f, 0.0f, 0.0f});

  auto child = std::make_unique<SceneNode>("Child");
  child->localTransform.setPosition({0.0f, 3.0f, 0.0f});
  root->addChild(std::move(child));

  root->updateWorldMatrix();

  // world position is column 3
  const glm::mat4 &W = root->getChildren()[0]->getWorldMatrix();
  return nearEqual(W[3][0], 2.0f) && nearEqual(W[3][1], 3.0f) &&
         nearEqual(W[3][2], 0.0f);
}

/**
 * Test 4: Rotation propagation.
 * Parent rotated 90° around Y axis. Child at local position (0, 0, 1).
 * After parent rotation, child world position should be (1, 0, 0).
 *
 * Rotation: 90° Y maps Z+ → X+
 */
static bool test_rotation_propagation() {
  using namespace realis::scene;
  auto root = std::make_unique<SceneNode>("Root");
  // 90° Y-axis rotation
  root->localTransform.setRotation(
      glm::angleAxis(glm::radians(90.0f), glm::vec3(0.0f, 1.0f, 0.0f)));

  auto child = std::make_unique<SceneNode>("Child");
  child->localTransform.setPosition({0.0f, 0.0f, 1.0f}); // local Z+
  root->addChild(std::move(child));

  root->updateWorldMatrix();

  const glm::mat4 &W = root->getChildren()[0]->getWorldMatrix();
  // Expected child world pos: (1, 0, 0)
  return nearEqual(W[3][0], 1.0f, 1e-4f) && nearEqual(W[3][1], 0.0f, 1e-4f) &&
         nearEqual(W[3][2], 0.0f, 1e-4f);
}

/**
 * Test 5: Scale propagation.
 * Parent scaled ×2. Child at local position (1, 0, 0) with unit scale.
 * Child world position should be (2, 0, 0) because the parent scale stretches
 * space.
 */
static bool test_scale_propagation() {
  using namespace realis::scene;
  auto root = std::make_unique<SceneNode>("Root");
  root->localTransform.setScale({2.0f, 2.0f, 2.0f});

  auto child = std::make_unique<SceneNode>("Child");
  child->localTransform.setPosition({1.0f, 0.0f, 0.0f});
  root->addChild(std::move(child));

  root->updateWorldMatrix();

  const glm::mat4 &W = root->getChildren()[0]->getWorldMatrix();
  return nearEqual(W[3][0], 2.0f) && nearEqual(W[3][1], 0.0f) &&
         nearEqual(W[3][2], 0.0f);
}

/**
 * Test 6: Deep 10-level hierarchy.
 * Each node adds +1 on X. After updating from root, the leaf node's
 * world X-translation should equal 10.0.
 */
static bool test_deep_hierarchy() {
  using namespace realis::scene;
  constexpr int DEPTH = 10;

  auto root = std::make_unique<SceneNode>("Level0");
  root->localTransform.setPosition({1.0f, 0.0f, 0.0f});

  // Build chain: root → l1 → l2 → ... → l9
  SceneNode *current = root.get();
  for (int i = 1; i < DEPTH; ++i) {
    auto node = std::make_unique<SceneNode>("Level" + std::to_string(i));
    node->localTransform.setPosition({1.0f, 0.0f, 0.0f});
    current = current->addChild(std::move(node));
  }

  root->updateWorldMatrix();

  // Walk down to leaf
  const SceneNode *leaf = root.get();
  while (!leaf->getChildren().empty()) {
    leaf = leaf->getChildren()[0].get();
  }

  const glm::mat4 &W = leaf->getWorldMatrix();
  return nearEqual(W[3][0], static_cast<float>(DEPTH), 1e-3f);
}

/**
 * Test 7: Independent child rotation does not corrupt parent's world matrix.
 * Rotate child, then update, verify parent world matrix unchanged.
 */
static bool test_independent_child_rotation() {
  using namespace realis::scene;
  auto root = std::make_unique<SceneNode>("Root");
  root->localTransform.setPosition({1.0f, 2.0f, 3.0f});

  auto child = std::make_unique<SceneNode>("Child");
  child->localTransform.setRotation(
      glm::angleAxis(glm::radians(45.0f), glm::vec3(0.0f, 0.0f, 1.0f)));
  root->addChild(std::move(child));

  root->updateWorldMatrix();

  // Parent world position must still be exactly (1, 2, 3)
  const glm::mat4 &Wp = root->getWorldMatrix();
  return nearEqual(Wp[3][0], 1.0f) && nearEqual(Wp[3][1], 2.0f) &&
         nearEqual(Wp[3][2], 3.0f);
}

/**
 * Test 8: No drift after 1000 repeated rotation updates.
 * Rotate root by 0.1 rad around Y, 1000 times (total 100 rad ≈ 15.9 full
 * turns). After each update, recompute from clean quaternion (normalized every
 * set). Verify determinant of root's world matrix ≈ 1.0 (no scale creep).
 */
static bool test_no_drift_after_repeated_updates() {
  using namespace realis::scene;
  auto root = std::make_unique<SceneNode>("Root");
  auto child = std::make_unique<SceneNode>("Child");
  child->localTransform.setPosition({1.0f, 0.0f, 0.0f});
  root->addChild(std::move(child));

  float totalAngle = 0.0f;
  for (int i = 0; i < 1000; ++i) {
    totalAngle += 0.1f;
    // Always build rotation from scratch — no incremental accumulation
    root->localTransform.setRotation(
        glm::angleAxis(totalAngle, glm::vec3(0.0f, 1.0f, 0.0f)));
    root->updateWorldMatrix();
  }

  const glm::mat4 &W = root->getWorldMatrix();

  // The determinant of a pure rotation+translation matrix must be 1.0
  // (no unintended scale creep from floating-point accumulation)
  float det = glm::determinant(W);
  return nearEqual(det, 1.0f, 1e-4f);
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

int main() {
  std::printf("══════════════════════════════════════════════════════\n");
  std::printf("  REALIS Scene Graph — Verification Suite\n");
  std::printf("══════════════════════════════════════════════════════\n\n");

  runTest("Identity root", test_identity_root());
  runTest("Root translation", test_root_translation());
  runTest("Translation chain", test_translation_chain());
  runTest("Rotation propagation (90° Y)", test_rotation_propagation());
  runTest("Scale propagation (×2 parent)", test_scale_propagation());
  runTest("Deep hierarchy (10 levels)", test_deep_hierarchy());
  runTest("Independent child rotation", test_independent_child_rotation());
  runTest("No drift after 1000 updates",
          test_no_drift_after_repeated_updates());

  std::printf("\n══════════════════════════════════════════════════════\n");
  std::printf("  Result: %d/%d tests passed\n", g_passed, g_total);
  std::printf("══════════════════════════════════════════════════════\n");

  return (g_passed == g_total) ? 0 : 1;
}
