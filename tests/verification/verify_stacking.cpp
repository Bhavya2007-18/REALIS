#include "../../engine/core/integrator.hpp"
#include "../../engine/core/world.hpp"
#include "../../engine/dynamics/rigid_body.hpp"
#include "../../engine/dynamics/uniform_gravity.hpp"
#include "../../engine/geometry/box.hpp"
#include "../../engine/geometry/plane.hpp"
#include <cmath>
#include <iomanip>
#include <iostream>

using namespace realis;

void verify_stacking(Integrator *integrator, float dt) {
  World world(dt);

  // 1. Static Ground Plane
  geometry::Plane ground(Vec3(0, 1, 0), 0.0f);
  RigidBody ground_body;
  ground_body.mass = 0.0f; // Static
  ground_body.inv_mass = 0.0f;
  ground_body.position = Vec3(0, 0, 0);
  ground_body.shape = &ground;
  ground_body.restitution = 0.0f;
  ground_body.friction = 0.5f;
  world.add_body(&ground_body);

  // 2. Stacked Blocks (3 Blocks of 1x1x1)
  geometry::Box box(Vec3(0.5f, 0.5f, 0.5f));
  std::vector<RigidBody> blocks(3);

  for (int i = 0; i < 3; ++i) {
    blocks[i].mass = 1.0f;
    blocks[i].inv_mass = 1.0f;
    // Drop them slightly separated so they fall onto each other
    blocks[i].position = Vec3(0, 1.0f + i * 1.5f, 0);
    blocks[i].velocity = Vec3(0, 0, 0);
    blocks[i].shape = &box;
    blocks[i].inertia_tensor = box.compute_inertia_tensor(blocks[i].mass);
    blocks[i].inv_inertia_tensor = blocks[i].inertia_tensor.inverse();
    blocks[i].restitution = 0.0f;
    blocks[i].friction = 0.5f;
    world.add_body(&blocks[i]);
  }

  UniformGravityField gravity(9.81f);
  world.add_force_field(&gravity);

  world.set_integrator(integrator);

  std::cout << "--- Stacking Test (dt=" << dt << ", 3 Blocks) ---\n";

  float max_energy = world.compute_energy();
  bool energy_increased = false;

  for (int step = 0; step < 1500; ++step) {
    world.step();
    float current_energy = world.compute_energy();

    // Check strict non-increase (allowing tiny float epsilons)
    if (current_energy > max_energy + 1e-3f) {
      energy_increased = true;
    }
    max_energy = std::max(max_energy, current_energy);

    if (step % 300 == 0) {
      std::cout << "t=" << std::fixed << std::setprecision(2)
                << world.get_time() << "s | E=" << current_energy << "J | "
                << "Y1=" << blocks[0].position.y
                << " Y2=" << blocks[1].position.y
                << " Y3=" << blocks[2].position.y << "\n";
    }
  }

  std::cout << "\nFinal Results:\n";
  std::cout << "  Block 1 Y Position: " << blocks[0].position.y
            << " m (Expected: 0.5)\n";
  std::cout << "  Block 2 Y Position: " << blocks[1].position.y
            << " m (Expected: 1.5)\n";
  std::cout << "  Block 3 Y Position: " << blocks[2].position.y
            << " m (Expected: 2.5)\n";
  std::cout << "  Energy Exploded/Increased: "
            << (energy_increased ? "Yes" : "No") << "\n\n";
}

int main() {
  std::cout << "=== Phase 3 Verification: Stacked Bodies ===\n\n";

  SemiImplicitEuler semi_euler;
  verify_stacking(&semi_euler, 0.01f);

  return 0;
}
