// Phase 4 Demonstration: Collision Response & Impulse Resolution
// Validates C++ implementation against Python reference
// Reference: physics_lab/collisions/collision_1d.py

#include "../engine/collision/narrowphase.hpp"
#include "../engine/core/world.hpp"
#include "../engine/dynamics/contact_resolver.hpp"
#include "../engine/dynamics/rigid_body.hpp"
#include <cmath>
#include <iomanip>
#include <iostream>
#include <vector>

using namespace realis;

void run_collision_test() {
  std::cout << "=== Phase 4: Collision & Impulse Resolution Test ==="
            << std::endl;
  std::cout << "Scenario: Two spheres colliding head-on" << std::endl;

  // Body A: Moving right
  RigidBody body_a;
  body_a.position = Vec3(-2.0f, 0.0f, 0.0f);
  body_a.velocity = Vec3(2.0f, 0.0f, 0.0f);
  body_a.mass = 1.0f;
  body_a.inv_mass = 1.0f;

  // Body B: Stationary
  RigidBody body_b;
  body_b.position = Vec3(2.0f, 0.0f, 0.0f);
  body_b.velocity = Vec3(0.0f, 0.0f, 0.0f);
  body_b.mass = 1.0f;
  body_b.inv_mass = 1.0f;

  float dt = 0.01f;
  float duration = 3.0f;
  int steps = static_cast<int>(duration / dt);

  std::cout << std::fixed << std::setprecision(4);
  std::cout << "Initial Velocities: A=" << body_a.velocity.x
            << ", B=" << body_b.velocity.x << std::endl;
  std::cout << "Initial Momentum: "
            << (body_a.mass * body_a.velocity.x +
                body_b.mass * body_b.velocity.x)
            << std::endl;

  bool collision_occurred = false;

  for (int i = 0; i < steps; ++i) {
    // 1. Detection
    Contact contact = NarrowPhase::generate_contact(&body_a, &body_b);

    if (contact.colliding) {
      if (!collision_occurred) {
        std::cout << "[Step " << i << "] COLLISION detected! t=" << i * dt
                  << "s" << std::endl;
        collision_occurred = true;
      }
      // 2. Resolution
      ContactResolver::resolve_contact(body_a, body_b, contact);
    }

    // 3. Integration
    body_a.position = body_a.position + body_a.velocity * dt;
    body_b.position = body_b.position + body_b.velocity * dt;
  }

  std::cout << std::endl << "=== Results ===" << std::endl;
  std::cout << "Final Velocities: A=" << body_a.velocity.x
            << ", B=" << body_b.velocity.x << std::endl;
  std::cout << "Final Momentum: "
            << (body_a.mass * body_a.velocity.x +
                body_b.mass * body_b.velocity.x)
            << std::endl;

  // Validation
  // For e=0.5 (as set in resolver) and m1=m2=1, v1=2, v2=0:
  // v_cm = (1*2 + 1*0) / 2 = 1.0
  // v_rel_before = 2 - 0 = 2.0
  // v_rel_after = -0.5 * 2 = -1.0
  // v1' = v_cm + (0.5)*v_rel_after = 1.0 - 0.5 = 0.5
  // v2' = v_cm - (0.5)*v_rel_after = 1.0 + 0.5 = 1.5

  float expected_v1 = 0.5f;
  float expected_v2 = 1.5f;

  bool v1_ok = std::abs(body_a.velocity.x - expected_v1) < 0.1f;
  bool v2_ok = std::abs(body_b.velocity.x - expected_v2) < 0.1f;
  bool momentum_ok = std::abs((body_a.mass * body_a.velocity.x +
                               body_b.mass * body_b.velocity.x) -
                              2.0f) < 0.01f;

  if (v1_ok && v2_ok && momentum_ok) {
    std::cout << "✓ PASS: Collision response matches Python/analytical laws of "
                 "momentum & restitution!"
              << std::endl;
  } else {
    std::cout << "✗ FAIL: Physical laws violated or deviation too high"
              << std::endl;
  }
}

int main() {
  run_collision_test();
  return 0;
}
