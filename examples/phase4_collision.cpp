



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

  
  RigidBody body_a;
  body_a.position = Vec3(-2.0f, 0.0f, 0.0f);
  body_a.velocity = Vec3(2.0f, 0.0f, 0.0f);
  body_a.mass = 1.0f;
  body_a.inv_mass = 1.0f;

  
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
    
    Contact contact = NarrowPhase::generate_contact(&body_a, &body_b);

    if (contact.colliding) {
      if (!collision_occurred) {
        std::cout << "[Step " << i << "] COLLISION detected! t=" << i * dt
                  << "s" << std::endl;
        collision_occurred = true;
      }
      
      ContactResolver::resolve_contact(body_a, body_b, contact);
    }

    
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