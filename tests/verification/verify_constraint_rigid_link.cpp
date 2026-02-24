#include "../../engine/constraints/distance_constraint.hpp"
#include "../../engine/core/integrator.hpp"
#include "../../engine/core/world.hpp"
#include "../../engine/dynamics/rigid_body.hpp"
#include "../../engine/geometry/sphere.hpp"
#include <cmath>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <vector>

using namespace realis;
using namespace realis::geometry;

void verify_rigid_link(Integrator *integrator, float dt) {
  World world(dt);

  // Two bodies linked, no gravity.
  // Body 1 is essentially a heavy anchor (though moving).
  // Let's spawn them 2m apart. Body A at origin, Body B at (2,0,0).
  // We give Body B a velocity in Y, causing circular orbit.

  Sphere s1(0.5f);
  RigidBody b1;
  b1.mass = 1.0f;
  b1.inv_mass = 1.0f;
  b1.position = Vec3(-1.0f, 0, 0);
  b1.velocity = Vec3(0, -1.0f, 0); // Opposing velocity for CM rest
  b1.shape = &s1;

  Sphere s2(0.5f);
  RigidBody b2;
  b2.mass = 1.0f;
  b2.inv_mass = 1.0f;
  b2.position = Vec3(1.0f, 0, 0);
  b2.velocity = Vec3(0, 1.0f, 0);
  b2.shape = &s2;

  world.add_body(&b1);
  world.add_body(&b2);

  DistanceConstraint link(&b1, &b2, 2.0f);
  world.add_constraint(&link);

  world.set_integrator(integrator);

  std::ofstream out("rigid_link_results.txt", std::ios_base::app);
  out << "--- Rigid Link Motion Testing (dt=" << dt << ") ---\n";
  float initial_energy = world.compute_energy();
  out << "Initial Energy: " << initial_energy << " J\n";
  out << "Initial Distance: " << (b1.position - b2.position).magnitude()
      << " m\n\n";

  float max_drift = 0.0f;

  // Simulate ~10 seconds
  int steps = static_cast<int>(10.0f / dt);
  for (int i = 0; i < steps; ++i) {
    world.step();

    float current_dist = (b1.position - b2.position).magnitude();
    float drift = std::abs(current_dist - 2.0f);
    if (drift > max_drift)
      max_drift = drift;
  }

  float final_energy = world.compute_energy();

  out << "After " << steps << " steps:\n";
  out << "  E_total: " << final_energy
      << " J (Error: " << std::abs(final_energy - initial_energy) << " J)\n";
  out << "  Final Distance: " << (b1.position - b2.position).magnitude()
      << " m\n";
  out << "  Max Constraint Drift: " << max_drift << " m\n\n";
  out.close();
}

int main() {
  std::cout
      << "=== Phase 2A Verification: Lagrange Multiplier Rigid Link ===\n\n";

  SemiImplicitEuler semi_euler;
  verify_rigid_link(&semi_euler, 0.01f);
  verify_rigid_link(&semi_euler, 0.005f); // Half timestep to verify convergence

  return 0;
}
