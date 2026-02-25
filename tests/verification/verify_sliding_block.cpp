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

void verify_sliding_block(Integrator *integrator, float dt) {
  World world(dt);

  // 1. Static Ground Plane
  geometry::Plane ground(Vec3(0, 1, 0), 0.0f);
  RigidBody ground_body;
  ground_body.mass = 0.0f; // Static
  ground_body.inv_mass = 0.0f;
  ground_body.position = Vec3(0, 0, 0);
  ground_body.shape = &ground;
  ground_body.restitution = 0.0f;
  ground_body.friction = 0.3f; // mu = 0.3

  // 2. Sliding Block
  geometry::Box box(Vec3(0.5f, 0.5f, 0.5f));
  RigidBody block;
  block.mass = 2.0f;
  block.inv_mass = 0.5f;
  block.position = Vec3(0, 0.501f, 0); // Barely resting
  block.velocity = Vec3(5.0f, 0, 0);   // Initial sliding velocity
  block.shape = &box;
  block.inertia_tensor = box.compute_inertia_tensor(block.mass);
  block.inv_inertia_tensor = block.inertia_tensor.inverse();
  block.restitution = 0.0f;
  block.friction = 0.3f;

  world.add_body(&ground_body);
  world.add_body(&block);

  UniformGravityField gravity(9.81f);
  world.add_force_field(&gravity);

  world.set_integrator(integrator);

  std::cout << "--- Sliding Block Test (dt=" << dt << ", mu=0.3) ---\n";
  std::cout << "Initial Velocity X: " << block.velocity.x << " m/s\n";

  // Expected deceleration: a = -mu * g = -0.3 * 9.81 = -2.943 m/s^2
  float expected_accel = -0.3f * 9.81f;
  std::cout << "Expected Deceleration: " << expected_accel << " m/s^2\n";

  // Expected stop time: v = v0 + at => t = -v0/a = 5.0 / 2.943 = 1.698s
  float expected_stop_time = 5.0f / 2.943f;
  std::cout << "Expected Stop Time: ~" << expected_stop_time << " s\n\n";

  float initial_energy = world.compute_energy();
  float max_energy = initial_energy;
  bool energy_increased = false;

  float last_vx = block.velocity.x;
  float measured_accel = 0.0f;
  int accel_samples = 0;

  bool stopped = false;
  float actual_stop_time = 0.0f;

  for (int i = 0; i < 300; ++i) {
    world.step();
    float current_energy = world.compute_energy();

    if (current_energy > max_energy + 1e-4f) {
      energy_increased = true;
    }
    max_energy = std::max(max_energy, current_energy);

    if (!stopped && block.velocity.x > 0.1f) {
      float current_accel = (block.velocity.x - last_vx) / dt;
      measured_accel += current_accel;
      accel_samples++;
    }

    if (!stopped && block.velocity.x <= 1e-4f) {
      stopped = true;
      actual_stop_time = world.get_time();
    }

    last_vx = block.velocity.x;

    if (i % 20 == 0) {
      std::cout << "t=" << std::fixed << std::setprecision(2)
                << world.get_time() << "s | PosX=" << block.position.x
                << "m | VelX=" << block.velocity.x
                << "m/s | E=" << current_energy << "J\n";
    }
  }

  float avg_accel = accel_samples > 0 ? measured_accel / accel_samples : 0.0f;

  std::cout << "\nFinal Results:\n";
  std::cout << "  Measured Avg Deceleration: " << avg_accel
            << " m/s^2 (Expected: " << expected_accel << ")\n";
  std::cout << "  Actual Stop Time: " << actual_stop_time << " s (Expected: ~"
            << expected_stop_time << ")\n";
  std::cout << "  Final X Velocity (Stick Transition): " << block.velocity.x
            << " m/s (Expected: 0.0)\n";
  std::cout << "  Energy Exploded: " << (energy_increased ? "Yes" : "No")
            << "\n\n";
}

int main() {
  std::cout
      << "=== Phase 3 Verification: Sliding Block (Coulomb Friction) ===\n\n";

  SemiImplicitEuler semi_euler;
  verify_sliding_block(&semi_euler, 0.01f);

  return 0;
}
