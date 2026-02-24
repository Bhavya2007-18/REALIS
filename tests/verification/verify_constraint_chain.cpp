#include "../../engine/constraints/distance_constraint.hpp"
#include "../../engine/constraints/fixed_constraint.hpp"
#include "../../engine/core/integrator.hpp"
#include "../../engine/core/world.hpp"
#include "../../engine/dynamics/rigid_body.hpp"
#include "../../engine/dynamics/uniform_gravity.hpp"
#include "../../engine/geometry/sphere.hpp"
#include <cmath>
#include <fstream>
#include <iostream>

using namespace realis;
using namespace realis::geometry;

void verify_chain(Integrator *integrator, float dt) {
  World world(dt);

  UniformGravityField gravity(9.81f);
  world.add_force_field(&gravity);

  Sphere s(0.5f);

  RigidBody b1;
  b1.shape = &s;
  b1.mass = 1.0f;
  b1.inv_mass = 1.0f;
  RigidBody b2;
  b2.shape = &s;
  b2.mass = 1.0f;
  b2.inv_mass = 1.0f;
  RigidBody b3;
  b3.shape = &s;
  b3.mass = 1.0f;
  b3.inv_mass = 1.0f;

  // Link bodies
  b1.position = Vec3(2.0f, 0.0f, 0.0f);
  b2.position = Vec3(4.0f, 0.0f, 0.0f);
  b3.position = Vec3(6.0f, 0.0f, 0.0f);

  world.add_body(&b1);
  world.add_body(&b2);
  world.add_body(&b3);

  // Fixed anchor at origin for b1
  Vec3 anchor(0, 0, 0);
  RigidBody *static_anchor = new RigidBody();
  static_anchor->shape = &s;
  static_anchor->mass = 0.0f;
  static_anchor->inv_mass = 0.0f;
  static_anchor->position = anchor;
  DistanceConstraint root_link(static_anchor, &b1, 2.0f);

  DistanceConstraint link1(&b1, &b2, 2.0f);
  DistanceConstraint link2(&b2, &b3, 2.0f);

  world.add_constraint(&root_link);
  world.add_constraint(&link1);
  world.add_constraint(&link2);

  world.set_integrator(integrator);

  float initial_energy = world.compute_energy();
  float max_drift = 0.0f;

  int steps = static_cast<int>(5.0f / dt);
  for (int i = 0; i < steps; ++i) {
    world.step();

    // Check constraint invariant drifts
    float drift0 = std::abs((b1.position - anchor).magnitude() - 2.0f);
    float drift1 = std::abs((b2.position - b1.position).magnitude() - 2.0f);
    float drift2 = std::abs((b3.position - b2.position).magnitude() - 2.0f);

    float current_max = std::max(drift0, std::max(drift1, drift2));
    if (current_max > max_drift)
      max_drift = current_max;
  }

  float final_energy = world.compute_energy();

  std::ofstream out("chain_results.txt", std::ios_base::app);
  out << "--- 3-Body Chain Testing (Gravity applied, dt=" << dt << ") ---\n";
  out << "Initial Energy: " << initial_energy << " J\n";
  out << "After " << steps << " steps:\n";
  out << "  E_total: " << final_energy
      << " J (Error: " << std::abs(final_energy - initial_energy) << " J)\n";
  out << "  Max Constraint Drift (Any link): " << max_drift << " m\n\n";
  out.close();

  delete root_link.bodyA;
}

int main() {
  SemiImplicitEuler euler;
  std::ofstream out("chain_results.txt"); // clear file
  out.close();

  verify_chain(&euler, 0.01f);
  verify_chain(&euler, 0.005f);

  return 0;
}
