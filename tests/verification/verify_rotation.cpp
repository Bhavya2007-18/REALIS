#include "../../engine/core/integrator.hpp"
#include "../../engine/core/world.hpp"
#include "../../engine/dynamics/rigid_body.hpp"
#include <cmath>
#include <iomanip>
#include <iostream>

using namespace realis;

float measure_L2(const Vec3 &L, const Vec3 &L0) {
  Vec3 diff = L - L0;
  return std::sqrt(diff.x * diff.x + diff.y * diff.y + diff.z * diff.z);
}

void verify_tumbling(Integrator *integrator, float dt, float total_time,
                     const std::string &name) {
  World world(dt);

  RigidBody b1;
  // Asymmetric inertia for Dzhanibekov effect tumbling
  Mat3 I_asym = Mat3::identity();
  I_asym.data[0] = 2.0f; // Row 0 Col 0
  I_asym.data[4] = 1.0f; // Row 1 Col 1
  I_asym.data[8] = 0.5f; // Row 2 Col 2

  b1.inertia_tensor = I_asym;
  b1.inv_inertia_tensor = I_asym.inverse();

  b1.angular_velocity = Vec3(0.1f, 10.0f, 0.1f); // Off-axis spin

  world.add_body(&b1);
  world.set_integrator(integrator);

  float initial_energy = world.compute_energy();
  Vec3 initial_L = world.compute_angular_momentum();

  float max_e_drift = 0.0f;
  float max_L_drift = 0.0f;

  int steps = std::ceil(total_time / dt);
  for (int i = 0; i < steps; ++i) {
    world.step();

    float e = world.compute_energy();
    Vec3 L = world.compute_angular_momentum();

    float e_drift = std::abs(e - initial_energy);
    float L_drift = measure_L2(L, initial_L);

    if (e_drift > max_e_drift)
      max_e_drift = e_drift;
    if (L_drift > max_L_drift)
      max_L_drift = L_drift;
  }

  std::cout << "[" << std::setw(20) << name << " | dt=" << dt << "] "
            << "Max E Drift: " << max_e_drift << " J | "
            << "Max L Drift: " << max_L_drift << " kg*m^2/s\n";
}

int main() {
  std::cout
      << "=== Phase 1B Rotational Validation: Dzhanibekov Tumbling ===\n\n";

  SemiImplicitEuler semi_euler;
  RK4Integrator rk4;

  std::cout << "--- 1. Torque-Free Rotational Tracking ---\n";
  // Short term tests to capture raw convergence drift mappings over tumbling
  // vectors.
  verify_tumbling(&semi_euler, 0.01f, 5.0f, "Semi-Implicit Euler");
  verify_tumbling(&semi_euler, 0.005f, 5.0f, "Semi-Implicit Euler");

  std::cout << "\n";
  verify_tumbling(&rk4, 0.01f, 5.0f, "RK4 Integrator");
  verify_tumbling(&rk4, 0.005f, 5.0f, "RK4 Integrator");

  std::cout << "\n--> Verifying solver independence mapping pure structural "
               "constants...\n";

  return 0;
}
