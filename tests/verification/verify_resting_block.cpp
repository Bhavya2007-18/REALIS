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

void verify_resting_block(Integrator *integrator, float dt) {
  World world(dt);

  // 1. Static Ground Plane
  geometry::Plane ground(Vec3(0, 1, 0), 0.0f);
  RigidBody ground_body;
  ground_body.mass = 0.0f; // Static
  ground_body.inv_mass = 0.0f;
  ground_body.position = Vec3(0, 0, 0);
  ground_body.shape = &ground;
  ground_body.restitution = 0.0f; // No bounce
  ground_body.friction = 0.5f;

  // 2. Falling Block
  geometry::Box box(Vec3(1.0f, 1.0f, 1.0f));
  RigidBody block;
  block.mass = 1.0f;
  block.inv_mass = 1.0f;
  block.position = Vec3(0, 5.0f, 0); // Drop from 5m
  block.velocity = Vec3(0, 0, 0);
  block.shape = &box;
  block.inertia_tensor = box.compute_inertia_tensor(block.mass);
  block.inv_inertia_tensor = block.inertia_tensor.inverse();
  block.restitution = 0.0f; // Inelastic collision with ground
  block.friction = 0.5f;

  world.add_body(&ground_body);
  world.add_body(&block);

  UniformGravityField gravity(9.81f);
  world.add_force_field(&gravity);

  world.set_integrator(integrator);

  std::cout << "--- Resting Block Test (dt=" << dt << ") ---\n";
  std::cout << "Initial Y: " << block.position.y << " m\n";

  float initial_energy = world.compute_energy();
  float max_energy = initial_energy;
  bool energy_increased = false;

  int settling_steps = 0;
  for (int i = 0; i < 2000; ++i) {
    world.step();
    float current_energy = world.compute_energy();

    if (current_energy > max_energy + 1e-4f) {
      energy_increased = true;
      std::cout << "WARNING: Energy increased at step " << i << " from "
                << max_energy << " to " << current_energy << "\n";
    }
    max_energy = std::max(max_energy, current_energy);

    // Check if settled (velocity near zero, resting on ground)
    if (std::abs(block.position.y - 0.5f) < 1e-3f &&
        block.velocity.dot(block.velocity) < 1e-6f) {
      settling_steps++;
    } else {
      settling_steps = 0;
    }

    if (i % 200 == 0) {
      std::cout << "t=" << std::fixed << std::setprecision(2)
                << world.get_time() << "s | PosY=" << block.position.y
                << "m | VelY=" << block.velocity.y
                << "m/s | E=" << current_energy << "J\n";
    }
  }

  std::cout << "\nFinal Results:\n";
  std::cout << "  Final Y Position: " << block.position.y
            << " m (Expected: 0.5 m)\n";
  std::cout << "  Final Y Velocity: " << block.velocity.y
            << " m/s (Expected: 0.0 m/s)\n";
  std::cout << "  Has Settled: " << (settling_steps > 10 ? "Yes" : "No")
            << "\n";
  std::cout << "  Energy Exploded: " << (energy_increased ? "Yes" : "No")
            << "\n\n";
}

int main() {
  std::cout << "=== Phase 3 Verification: Resting Block ===\n\n";

  SemiImplicitEuler semi_euler;
  verify_resting_block(&semi_euler, 0.01f);

  return 0;
}
