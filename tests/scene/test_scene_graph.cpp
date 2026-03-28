

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






static bool test_identity_root() {
  using namespace realis::scene;
  auto root = std::make_unique<SceneNode>("Root");
  root->updateWorldMatrix();
  return mat4Near(root->getWorldMatrix(), glm::mat4(1.0f));
}


static bool test_root_translation() {
  using namespace realis::scene;
  auto root = std::make_unique<SceneNode>("Root");
  root->localTransform.setPosition({3.0f, 0.0f, 0.0f});
  root->updateWorldMatrix();
  const glm::mat4 &W = root->getWorldMatrix();
  return nearEqual(W[3][0], 3.0f) && nearEqual(W[3][1], 0.0f) &&
         nearEqual(W[3][2], 0.0f) && nearEqual(W[3][3], 1.0f);
}


static bool test_translation_chain() {
  using namespace realis::scene;
  auto root = std::make_unique<SceneNode>("Root");
  root->localTransform.setPosition({2.0f, 0.0f, 0.0f});

  auto child = std::make_unique<SceneNode>("Child");
  child->localTransform.setPosition({0.0f, 3.0f, 0.0f});
  root->addChild(std::move(child));

  root->updateWorldMatrix();

  
  const glm::mat4 &W = root->getChildren()[0]->getWorldMatrix();
  return nearEqual(W[3][0], 2.0f) && nearEqual(W[3][1], 3.0f) &&
         nearEqual(W[3][2], 0.0f);
}


static bool test_rotation_propagation() {
  using namespace realis::scene;
  auto root = std::make_unique<SceneNode>("Root");
  
  root->localTransform.setRotation(
      glm::angleAxis(glm::radians(90.0f), glm::vec3(0.0f, 1.0f, 0.0f)));

  auto child = std::make_unique<SceneNode>("Child");
  child->localTransform.setPosition({0.0f, 0.0f, 1.0f}); 
  root->addChild(std::move(child));

  root->updateWorldMatrix();

  const glm::mat4 &W = root->getChildren()[0]->getWorldMatrix();
  
  return nearEqual(W[3][0], 1.0f, 1e-4f) && nearEqual(W[3][1], 0.0f, 1e-4f) &&
         nearEqual(W[3][2], 0.0f, 1e-4f);
}


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


static bool test_deep_hierarchy() {
  using namespace realis::scene;
  constexpr int DEPTH = 10;

  auto root = std::make_unique<SceneNode>("Level0");
  root->localTransform.setPosition({1.0f, 0.0f, 0.0f});

  
  SceneNode *current = root.get();
  for (int i = 1; i < DEPTH; ++i) {
    auto node = std::make_unique<SceneNode>("Level" + std::to_string(i));
    node->localTransform.setPosition({1.0f, 0.0f, 0.0f});
    current = current->addChild(std::move(node));
  }

  root->updateWorldMatrix();

  
  const SceneNode *leaf = root.get();
  while (!leaf->getChildren().empty()) {
    leaf = leaf->getChildren()[0].get();
  }

  const glm::mat4 &W = leaf->getWorldMatrix();
  return nearEqual(W[3][0], static_cast<float>(DEPTH), 1e-3f);
}


static bool test_independent_child_rotation() {
  using namespace realis::scene;
  auto root = std::make_unique<SceneNode>("Root");
  root->localTransform.setPosition({1.0f, 2.0f, 3.0f});

  auto child = std::make_unique<SceneNode>("Child");
  child->localTransform.setRotation(
      glm::angleAxis(glm::radians(45.0f), glm::vec3(0.0f, 0.0f, 1.0f)));
  root->addChild(std::move(child));

  root->updateWorldMatrix();

  
  const glm::mat4 &Wp = root->getWorldMatrix();
  return nearEqual(Wp[3][0], 1.0f) && nearEqual(Wp[3][1], 2.0f) &&
         nearEqual(Wp[3][2], 3.0f);
}


static bool test_no_drift_after_repeated_updates() {
  using namespace realis::scene;
  auto root = std::make_unique<SceneNode>("Root");
  auto child = std::make_unique<SceneNode>("Child");
  child->localTransform.setPosition({1.0f, 0.0f, 0.0f});
  root->addChild(std::move(child));

  float totalAngle = 0.0f;
  for (int i = 0; i < 1000; ++i) {
    totalAngle += 0.1f;
    
    root->localTransform.setRotation(
        glm::angleAxis(totalAngle, glm::vec3(0.0f, 1.0f, 0.0f)));
    root->updateWorldMatrix();
  }

  const glm::mat4 &W = root->getWorldMatrix();

  
  
  float det = glm::determinant(W);
  return nearEqual(det, 1.0f, 1e-4f);
}





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