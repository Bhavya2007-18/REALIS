#include "../../engine/core/integrator.hpp"
#include "../../engine/core/world.hpp"
#include "../../engine/dynamics/force_field.hpp"
#include "../../engine/dynamics/rigid_body.hpp"
#include <cmath>
#include <iomanip>
#include <iostream>
#include <vector>


using namespace realis;

class SpringForceField : public ForceField {
public:
  SpringForceField(float stiffness, float rest_pos = 0.0f)
      : k(stiffness), rest(rest_pos) {}

  Vec3 compute_force(const RigidBody &body) const override {
    // F = -k * (x - rest)
    return Vec3(-k * (body.position.x - rest), 0, 0);
  }

  float compute_potential_energy(const RigidBody &body) const override {
    // U = 0.5 * k * (x - rest)^2
    float x = body.position.x - rest;
    return 0.5f * k * x * x;
  }

private:
  float k;
  float rest;
};

struct SimulationResult {
  float max_drift;
  float final_drift;
  float initial_energy;
};

SimulationResult run_simulation(Integrator *integrator, float dt,
                                float total_time) {
  World world(dt);

  RigidBody mass;
  mass.mass = 1.0f;
  mass.inv_mass = 1.0f;
  mass.position = Vec3(1.0f, 0, 0); // initial displacement = 1.0
  mass.velocity = Vec3(0, 0, 0);

  SpringForceField spring(10.0f, 0.0f);

  world.add_body(&mass);
  world.add_force_field(&spring);
  world.set_integrator(integrator);

  int steps = std::ceil(total_time / dt);

  float initial_energy = world.compute_energy();
  float max_drift = 0.0f;

  for (int i = 0; i < steps; ++i) {
    float current_energy = world.compute_energy();
    float drift = std::abs(current_energy - initial_energy);
    if (drift > max_drift) {
      max_drift = drift;
    }

    world.step();
  }

  float final_energy = world.compute_energy();
  float final_drift = std::abs(final_energy - initial_energy);

  return {max_drift, final_drift, initial_energy};
}

int main() {
  std::cout << "=== Phase 0 Architecture Validation: 1D Mass-Spring ===\n\n";

  float total_time = 10.0f; // 10 seconds to observe oscillation

  ForwardEuler fwd_euler;
  SemiImplicitEuler semi_euler;

  // --- Test 1: Forward Euler dt=0.01 ---
  std::cout << "[Test 1: Forward Euler, dt = 0.01]\n";
  auto res_fwd_01 = run_simulation(&fwd_euler, 0.01f, total_time);
  std::cout << "Initial Energy: " << res_fwd_01.initial_energy << " J\n";
  std::cout << "Max Drift: " << res_fwd_01.max_drift << " J\n";
  std::cout << "Final Drift: " << res_fwd_01.final_drift << " J\n\n";

  // --- Test 2: Semi-Implicit Euler dt=0.01 ---
  std::cout << "[Test 2: Semi-Implicit Euler, dt = 0.01]\n";
  auto res_semi_01 = run_simulation(&semi_euler, 0.01f, total_time);
  std::cout << "Initial Energy: " << res_semi_01.initial_energy << " J\n";
  std::cout << "Max Drift: " << res_semi_01.max_drift << " J\n";
  std::cout << "Final Drift: " << res_semi_01.final_drift << " J\n\n";

  // --- Test 3: Convergence Test dt=0.005 ---
  std::cout << "[Test 3: Convergence Test (Semi-Implicit Euler), dt = 0.005]\n";
  auto res_semi_005 = run_simulation(&semi_euler, 0.005f, total_time);
  std::cout << "Initial Energy: " << res_semi_005.initial_energy << " J\n";
  std::cout << "Max Drift: " << res_semi_005.max_drift << " J\n";
  std::cout << "Final Drift: " << res_semi_005.final_drift << " J\n\n";

  std::cout << "Convergence verification: dt=0.01 drift ("
            << res_semi_01.max_drift << ") vs dt=0.005 drift ("
            << res_semi_005.max_drift << ")\n";
  if (res_semi_005.max_drift < res_semi_01.max_drift) {
    std::cout << "--> ERROR REDUCED! Convergence achieved.\n\n";
  } else {
    std::cout << "--> ERROR NOT REDUCED! Convergence failed.\n\n";
  }

  std::cout << "Solver independence test: passed implicitly. \n"
            << "The physics definitions (RigidBody, SpringForceField) were "
               "unchanged.\n"
            << "Only the `set_integrator()` pointer was modified.\n";

  return 0;
}
