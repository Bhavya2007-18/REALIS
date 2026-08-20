



#include "../engine/core/integrator.hpp"
#include "../engine/core/world.hpp"
#include "../engine/dynamics/force_registry.hpp"
#include "../engine/dynamics/rigid_body.hpp"
#include "../engine/energy/energy_monitor.hpp"
#include "../engine/math/vec3.hpp"
#include <cmath>
#include <iomanip>
#include <iostream>
#include <vector>


using namespace realis;


class ConstantGravity : public ForceGenerator {
  Vec3 gravity;

public:
  ConstantGravity(const Vec3 &g) : gravity(g) {}
  void update_force(RigidBody *body, float ) override {
    
    body->apply_force(gravity * body->mass);
  }
};



struct SpringForce : public ForceGenerator {
  float k = 1.0f;
  void update_force(RigidBody *body, float ) override {
    body->apply_force(body->position * -k);
  }
};

void run_drift_analysis() {
  std::cout << "=== Phase 2: Integrator Energy Drift Comparison ==="
            << std::endl;
  std::cout << "Test: Harmonic Oscillator (Spring-like behavior)" << std::endl;

  float dt = 0.1f;
  float duration = 10.0f;
  int steps = static_cast<int>(duration / dt);

  SpringForce spring;

  
  RigidBody body_semi;
  body_semi.position = Vec3(1.0f, 0.0f, 0.0f);
  body_semi.velocity = Vec3(0.0f, 0.0f, 0.0f);
  body_semi.mass = 1.0f;
  body_semi.inv_mass = 1.0f;

  ForceRegistry registry;
  registry.add(&body_semi, &spring);

  auto calc_osc_energy = [](const RigidBody &b) {
    return 0.5f * b.velocity.dot(b.velocity) +
           0.5f * b.position.dot(b.position);
  };

  float e_initial = calc_osc_energy(body_semi);

  std::cout << std::fixed << std::setprecision(6);
  std::cout << "Initial Energy: " << e_initial << std::endl;

  for (int i = 0; i < steps; ++i) {
    registry.update_forces(dt);
    Vec3 accel = body_semi.force * body_semi.inv_mass;
    body_semi.velocity = body_semi.velocity + accel * dt;
    body_semi.position = body_semi.position + body_semi.velocity * dt;
    body_semi.clear_forces();
  }

  float e_final = calc_osc_energy(body_semi);
  float drift = (e_final - e_initial) / e_initial * 100.0f;

  std::cout << "Final Energy:   " << e_final << std::endl;
  std::cout << "Energy Drift:   " << drift << "%" << std::endl;

  if (std::abs(drift) < 0.1f) {
    std::cout
        << "✓ PASS: Energy drift within tolerance for Symplectic Integrator"
        << std::endl;
  } else {
    std::cout << "✗ FAIL: Energy drift too high" << std::endl;
  }

  
  
  std::cout << std::endl
            << "--- Comparison: Forward Euler (Explicit) ---" << std::endl;

  RigidBody body_forward;
  body_forward.position = Vec3(1.0f, 0.0f, 0.0f);
  body_forward.velocity = Vec3(0.0f, 0.0f, 0.0f);
  body_forward.mass = 1.0f;
  body_forward.inv_mass = 1.0f;

  float e_initial_f = calc_osc_energy(body_forward);

  for (int i = 0; i < steps; ++i) {
    
    Vec3 force = body_forward.position * -1.0f;
    Vec3 accel = force; 

    
    
    
    Vec3 x_new = body_forward.position + body_forward.velocity * dt;
    Vec3 v_new = body_forward.velocity + accel * dt;

    body_forward.position = x_new;
    body_forward.velocity = v_new;
  }

  float e_final_f = calc_osc_energy(body_forward);
  float drift_f = (e_final_f - e_initial_f) / e_initial_f * 100.0f;

  std::cout << "Final Energy:   " << e_final_f << std::endl;
  std::cout << "Energy Drift:   " << drift_f << "%" << std::endl;
  std::cout << "(Note: Forward Euler energy grows significantly, as expected "
               "from Python validation)"
            << std::endl;
}

int main() {
  run_drift_analysis();
  return 0;
}