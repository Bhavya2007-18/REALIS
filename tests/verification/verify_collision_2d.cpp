#include "../../engine/core/integrator.hpp"
#include "../../engine/core/world.hpp"
#include "../../engine/dynamics/rigid_body.hpp"
#include "../../engine/geometry/sphere.hpp"
#include <cmath>
#include <iomanip>
#include <iostream>


using namespace realis;

void verify_2d_collision(Integrator *integrator, float dt) {
  World world(dt);

  geometry::Sphere s1(1.0f);
  geometry::Sphere s2(1.0f);

  RigidBody b1;
  b1.mass = 2.0f;
  b1.inv_mass = 0.5f;
  b1.position = Vec3(-5.0f, 0.5f, 0); // Offset in Y
  b1.velocity = Vec3(2.0f, 0, 0);
  b1.shape = &s1;

  RigidBody b2;
  b2.mass = 3.0f;
  b2.inv_mass = 1.0f / 3.0f;
  b2.position = Vec3(5.0f, -0.5f, 0); // Offset in Y
  b2.velocity = Vec3(-1.0f, 0, 0);
  b2.shape = &s2;

  world.add_body(&b1);
  world.add_body(&b2);
  world.set_integrator(integrator);

  std::cout << "--- 2D Oblique Elastic Collision Testing (dt=" << dt
            << ") ---\n";

  float initial_energy = world.compute_energy();
  Vec3 initial_p = world.compute_linear_momentum();

  std::cout << "Before Collision:\n";
  std::cout << "  E_total: " << initial_energy << " J\n";
  std::cout << "  P_total: (" << initial_p.x << ", " << initial_p.y << ", "
            << initial_p.z << ") kg m/s\n";
  std::cout << "  v1: (" << b1.velocity.x << ", " << b1.velocity.y
            << ", 0) m/s\n";
  std::cout << "  v2: (" << b2.velocity.x << ", " << b2.velocity.y
            << ", 0) m/s\n\n";

  bool collided = false;
  for (int i = 0; i < 1000; ++i) {
    world.step();

    // When velocity in Y changes, collision has occurred
    if (!collided && (std::abs(b1.velocity.y) > 0.001f)) {
      collided = true;
      std::cout << "Collision occurred around t = " << world.get_time()
                << " s\n";
    }
  }

  float final_energy = world.compute_energy();
  Vec3 final_p = world.compute_linear_momentum();

  std::cout << "After Collision:\n";
  std::cout << "  E_total: " << final_energy
            << " J (Error: " << std::abs(final_energy - initial_energy)
            << " J)\n";
  Vec3 p_diff = final_p - initial_p;
  std::cout << "  P_total: (" << final_p.x << ", " << final_p.y << ", "
            << final_p.z << ") kg m/s (Error: " << std::sqrt(p_diff.dot(p_diff))
            << " kg m/s)\n";
  std::cout << "  v1: (" << b1.velocity.x << ", " << b1.velocity.y
            << ", 0) m/s\n";
  std::cout << "  v2: (" << b2.velocity.x << ", " << b2.velocity.y
            << ", 0) m/s\n\n";
}

int main() {
  std::cout << "=== Phase 2A Verification: 2D Oblique Collision ===\n\n";

  SemiImplicitEuler semi_euler;
  verify_2d_collision(&semi_euler, 0.01f);

  return 0;
}
