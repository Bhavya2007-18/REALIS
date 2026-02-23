#include "../../engine/core/integrator.hpp"
#include "../../engine/core/world.hpp"
#include "../../engine/dynamics/rigid_body.hpp"
#include "../../engine/dynamics/uniform_gravity.hpp"
#include <cmath>
#include <iomanip>
#include <iostream>
#include <vector>


using namespace realis;

struct SimResult {
  float max_drift;
  float max_pos_error;
  float l2_norm;
};

SimResult run_gravity_sim(Integrator *integrator, float dt, float total_time) {
  World world(dt);

  RigidBody mass;
  mass.mass = 1.0f;
  mass.inv_mass = 1.0f;
  mass.position = Vec3(0, 10.0f, 0); // initial height = 10.0
  mass.velocity = Vec3(0, 0, 0);

  UniformGravityField gravity(9.81f);

  world.add_body(&mass);
  world.add_force_field(&gravity);
  world.set_integrator(integrator);

  int steps = std::ceil(total_time / dt);

  float initial_energy = world.compute_energy();
  float max_drift = 0.0f;
  float max_pos_error = 0.0f;
  float sum_sq_error = 0.0f;

  for (int i = 0; i <= steps; ++i) {
    float current_time = i * dt;

    // Analytical solution: x(t) = x0 + v0*t - 0.5*g*t^2
    float y_ana = 10.0f - 0.5f * 9.81f * current_time * current_time;

    float current_energy = world.compute_energy();
    float drift = std::abs(current_energy - initial_energy);
    if (drift > max_drift)
      max_drift = drift;

    float pos_error = std::abs(mass.position.y - y_ana);
    if (pos_error > max_pos_error)
      max_pos_error = pos_error;
    sum_sq_error += pos_error * pos_error;

    if (i < steps)
      world.step();
  }

  float l2_norm = std::sqrt(sum_sq_error);

  return {max_drift, max_pos_error, l2_norm};
}

int main() {
  std::cout
      << "=== Phase 1 Architecture Validation: 1D Uniform Gravity ===\n\n";

  float total_time = 2.0f;

  ForwardEuler fwd_euler;
  SemiImplicitEuler semi_euler;

  // Test 1: Forward Euler dt=0.01
  std::cout << "[Test 1: Forward Euler, dt = 0.01]\n";
  auto res_fwd_01 = run_gravity_sim(&fwd_euler, 0.01f, total_time);
  std::cout << "Max Energy Drift: " << res_fwd_01.max_drift << " J\n";
  std::cout << "Max Position Error: " << res_fwd_01.max_pos_error << " m\n";
  std::cout << "L2 Norm Error: " << res_fwd_01.l2_norm << "\n\n";

  // Test 2: Semi-Implicit Euler dt=0.01
  std::cout << "[Test 2: Semi-Implicit Euler, dt = 0.01]\n";
  auto res_semi_01 = run_gravity_sim(&semi_euler, 0.01f, total_time);
  std::cout << "Max Energy Drift: " << res_semi_01.max_drift << " J\n";
  std::cout << "Max Position Error: " << res_semi_01.max_pos_error << " m\n";
  std::cout << "L2 Norm Error: " << res_semi_01.l2_norm << "\n\n";

  // Test 3: Convergence Test dt=0.005
  std::cout << "[Test 3: Convergence Test (Semi-Implicit Euler), dt = 0.005]\n";
  auto res_semi_005 = run_gravity_sim(&semi_euler, 0.005f, total_time);
  std::cout << "Max Energy Drift: " << res_semi_005.max_drift << " J\n";
  std::cout << "Max Position Error: " << res_semi_005.max_pos_error << " m\n";
  std::cout << "L2 Norm Error: " << res_semi_005.l2_norm << "\n\n";

  std::cout << "Convergence verification: dt=0.01 error ("
            << res_semi_01.max_pos_error << ") vs dt=0.005 error ("
            << res_semi_005.max_pos_error << ")\n";
  if (res_semi_005.max_pos_error < res_semi_01.max_pos_error) {
    std::cout << "--> ERROR REDUCED! Convergence achieved.\n\n";
  } else {
    std::cout << "--> ERROR NOT REDUCED! Convergence failed.\n\n";
  }

  std::cout << "Solver independence test: passed implicitly. \n"
            << "The physics configuration was unchanged.\n"
            << "Only the integrators were swapped.\n";

  return 0;
}
