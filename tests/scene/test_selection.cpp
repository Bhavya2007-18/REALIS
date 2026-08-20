#include <cassert>
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <iostream>


#define GLM_ENABLE_EXPERIMENTAL
#include <glm/gtx/quaternion.hpp>

#include "../../renderer/scene/AABB.hpp"
#include "../../renderer/scene/Ray.hpp"
#include "../../renderer/scene/RayIntersection.hpp"
#include "../../renderer/scene/SceneNode.hpp"


using namespace realis::scene;

void test_ray_aabb_intersection() {
  std::cout << "  [Test] Ray-AABB Intersection... ";

  AABB box(glm::vec3(-1.0f), glm::vec3(1.0f));

  
  Ray ray1(glm::vec3(0.0f, 0.0f, 5.0f), glm::vec3(0.0f, 0.0f, -1.0f));
  float t1;
  assert(intersectRayAABB(ray1, box, t1) && "Should hit box from front");
  assert(std::abs(t1 - 4.0f) < 0.001f && "Distance should be 4.0");

  
  Ray ray2(glm::vec3(2.0f, 2.0f, 5.0f), glm::vec3(0.0f, 0.0f, -1.0f));
  float t2;
  assert(!intersectRayAABB(ray2, box, t2) && "Should miss box");

  
  Ray ray3(glm::vec3(-2.0f, -2.0f, -2.0f),
           glm::normalize(glm::vec3(1.0f, 1.0f, 1.0f)));
  float t3;
  assert(intersectRayAABB(ray3, box, t3) && "Should hit box obliquely");

  std::cout << "PASS" << std::endl;
}

void test_aabb_transformation() {
  std::cout << "  [Test] AABB Transformation... ";

  AABB localBox(glm::vec3(-0.5f), glm::vec3(0.5f));

  
  glm::mat4 mat = glm::translate(glm::mat4(1.0f), glm::vec3(10.0f, 0.0f, 0.0f));
  mat = glm::scale(mat, glm::vec3(2.0f));

  AABB worldBox = localBox.transformed(mat);

  
  assert(std::abs(worldBox.min.x - 9.0f) < 0.001f);
  assert(std::abs(worldBox.max.x - 11.0f) < 0.001f);
  assert(std::abs(worldBox.min.y - (-1.0f)) < 0.001f);

  std::cout << "PASS" << std::endl;
}

void test_closest_hit_selection() {
  std::cout << "  [Test] Closest Hit Selection... ";

  auto root = std::make_unique<SceneNode>("Root");

  
  auto front = std::make_unique<SceneNode>("Front");
  front->localAABB = AABB(glm::vec3(-0.5f), glm::vec3(0.5f));
  front->localTransform.setPosition({0.0f, 0.0f, 2.0f});

  
  auto back = std::make_unique<SceneNode>("Back");
  back->localAABB = AABB(glm::vec3(-0.5f), glm::vec3(0.5f));
  back->localTransform.setPosition({0.0f, 0.0f, -2.0f});

  root->addChild(std::move(front));
  root->addChild(std::move(back));
  root->updateWorldMatrix();

  
  Ray ray(glm::vec3(0.0f, 0.0f, 10.0f), glm::vec3(0.0f, 0.0f, -1.0f));
  float t;
  SceneNode *hit = root->pickChild(ray, t);

  assert(hit != nullptr);
  assert(hit->getName() == "Front" && "Should pick closer object");

  std::cout << "PASS" << std::endl;
}

int main() {
  std::cout << "============================================" << std::endl;
  std::cout << "   REALIS Selection Verification Suite" << std::endl;
  std::cout << "============================================" << std::endl;

  try {
    test_ray_aabb_intersection();
    test_aabb_transformation();
    test_closest_hit_selection();

    std::cout << "\nAll 3/3 tests passed!" << std::endl;
  } catch (const std::exception &e) {
    std::cerr << "\nTEST FAILED: " << e.what() << std::endl;
    return 1;
  }

  return 0;
}