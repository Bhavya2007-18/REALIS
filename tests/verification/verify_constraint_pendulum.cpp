#include "../../engine/constraints/distance_constraint.hpp"
#include "../../engine/constraints/fixed_constraint.hpp"
#include "../../engine/core/integrator.hpp"
#include "../../engine/core/world.hpp"
#include "../../engine/dynamics/rigid_body.hpp"
#include "../../engine/dynamics/uniform_gravity.hpp"
#include "../../engine/geometry/sphere.hpp"
#include <cmath>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <vector>

using namespace realis;
using namespace realis::geometry;

void verify_pendulum(Integrator *integrator, float dt) {
  World world(dt);

  UniformGravityField gravity(9.81f);
  world.add_force_field(&gravity);

  Sphere s1(0.5f);
  RigidBody b1;
  b1.mass = 1.0f;
  b1.inv_mass = 1.0f;
  b1.position = Vec3(2.0f, 0, 0); // Start horizontally to left
  b1.velocity = Vec3(0, 0, 0);
  b1.shape = &s1;

  world.add_body(&b1);

  Vec3 anchor(0, 0, 0);

  // Instead of FixedConstraint1D, since we just want a pendulum we can use
  // DistanceConstraint with a fake static anchor body
  RigidBody anchor_body;
  anchor_body.mass = 0.0f;
  anchor_body.inv_mass = 0.0f; // Infinite mass, won't move
  anchor_body.position = anchor;
  anchor_body.velocity = Vec3(0, 0, 0);
  anchor_body.shape = &s1; // Add generic shape to avoid segfaults in engine
                           // internals if accessed
  world.add_body(&anchor_body);

  DistanceConstraint link(&anchor_body, &b1, 2.0f);
  world.add_constraint(&link);

  world.set_integrator(integrator);

  std::cout << "--- Pendulum Testing (Gravity applied, dt=" << dt << ") ---\n";
  float initial_energy = world.compute_energy();
  std::cout << "Initial Energy: " << initial_energy << " J\n";
  std::cout << "Initial Distance: " << (b1.position - anchor).magnitude()
            << " m\n\n";

  float max_drift = 0.0f;

  // Simulate ~5 seconds
  int steps = static_cast<int>(5.0f / dt);
  for (int i = 0; i < steps; ++i) {
    world.step();

    float current_dist = (b1.position - anchor).magnitude();
    float drift = std::abs(current_dist - 2.0f);
    if (drift > max_drift)
      max_drift = drift;
  }

  float final_energy = world.compute_energy();

  std::ofstream out("pendulum_results.txt", std::ios_base::app);
  out << "--- Pendulum Testing (Gravity applied, dt=" << dt << ") ---\n";
  out << "Initial Energy: " << initial_energy << " J\n";
  out << "After " << steps << " steps:\n";
  out << "  E_total: " << final_energy
      << " J (Error: " << std::abs(final_energy - initial_energy) << " J)\n";
  out << "  Final Distance: " << (b1.position - anchor).magnitude() << " m\n";
  out << "  Max Constraint Drift: " << max_drift << " m\n\n";
  out.close();
}

int main() {
  std::cout
      << "=== Phase 2A Verification: Lagrange Multiplier Pendulum ===\n\n";

  SemiImplicitEuler semi_euler;
  verify_pendulum(&semi_euler, 0.01f);
  verify_pendulum(&semi_euler, 0.005f); // Half timestep to verify convergence

  return 0;
}
