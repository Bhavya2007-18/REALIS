// Phase 1 Demonstration: Free Fall & Projectile Motion
// Validates C++ implementation against analytical solutions
// Uses RigidBody directly with explicit Euler integration loop

#include "../engine/dynamics/rigid_body.hpp"
#include "../engine/math/vec3.hpp"
#include <cmath>
#include <iomanip>
#include <iostream>

using namespace realis;

static const Vec3 GRAVITY(0.0f, -9.81f, 0.0f);

// ── Utility: compute total mechanical energy for a point mass under gravity ──
static float mechanical_energy(const RigidBody &body) {
  float kinetic = 0.5f * body.mass * body.velocity.dot(body.velocity);
  float potential = body.mass * 9.81f * body.position.y; // mgh, h = y
  return kinetic + potential;
}

// ── Manual integration step (Semi-implicit Euler) ───────────────────────────
//   v_{n+1} = v_n + (F/m) * dt
//   x_{n+1} = x_n + v_{n+1} * dt
static void euler_step(RigidBody &body, float dt) {
  // Apply gravity
  body.clear_forces();
  body.apply_force(GRAVITY * body.mass);

  // Integrate velocity first (semi-implicit)
  Vec3 accel = body.force * body.inv_mass;
  body.velocity = body.velocity + accel * dt;
  body.position = body.position + body.velocity * dt;
}

// =============================================================================
// TEST 1 — Free Fall
// =============================================================================
void test_free_fall() {
  std::cout << "=== Phase 1: Free Fall Test ===" << std::endl;
  std::cout << std::endl;

  // Initial conditions
  float y0 = 10.0f; // m
  float dt = 0.01f;
  float duration = 1.0f;

  RigidBody body;
  body.mass = 1.0f;
  body.inv_mass = 1.0f;
  body.position = Vec3(0.0f, y0, 0.0f);
  body.velocity = Vec3(0.0f, 0.0f, 0.0f);

  std::cout << "Initial position: (0, " << y0 << ", 0) m" << std::endl;
  std::cout << "Initial velocity: (0, 0, 0) m/s" << std::endl;
  std::cout << "Timestep: " << dt << " s" << std::endl;
  std::cout << "Duration: " << duration << " s" << std::endl;
  std::cout << "Gravity: -9.81 m/s^2" << std::endl;
  std::cout << std::endl;

  float initial_energy = mechanical_energy(body);
  float sim_time = 0.0f;

  std::cout << "--- Simulation Log (every 10 steps) ---" << std::endl;

  int num_steps = static_cast<int>(duration / dt);
  for (int i = 0; i < num_steps; ++i) {
    euler_step(body, dt);
    sim_time += dt;

    if ((i + 1) % 10 == 0) {
      std::cout << "t=" << std::fixed << std::setprecision(2) << sim_time
                << "  y=" << std::setprecision(4) << body.position.y
                << "  vy=" << body.velocity.y
                << "  E=" << mechanical_energy(body) << std::endl;
    }
  }

  float final_energy = mechanical_energy(body);

  std::cout << std::endl;
  std::cout << "=== Results ===" << std::endl;
  std::cout << std::fixed << std::setprecision(4);
  std::cout << "Final position: (" << body.position.x << ", " << body.position.y
            << ", " << body.position.z << ") m" << std::endl;
  std::cout << "Final velocity: (" << body.velocity.x << ", " << body.velocity.y
            << ", " << body.velocity.z << ") m/s" << std::endl;
  std::cout << std::endl;

  // Analytical solution: y = y0 + vy0*t - 0.5*g*t^2 = 10 - 4.905 = 5.095 m
  float t = duration;
  float g = 9.81f;
  float anal_y = y0 - 0.5f * g * t * t; // semi-impl Euler overshoots slightly
  float anal_vy = -g * t;

  std::cout << "Analytical solution:" << std::endl;
  std::cout << "  Expected y:  " << anal_y << " m" << std::endl;
  std::cout << "  Expected vy: " << anal_vy << " m/s" << std::endl;
  std::cout << std::endl;

  float pos_err = std::abs(body.position.y - anal_y);
  float vel_err = std::abs(body.velocity.y - anal_vy);
  float e_drift =
      (final_energy - initial_energy) / std::abs(initial_energy) * 100.0f;

  std::cout << "Error analysis:" << std::endl;
  std::cout << "  Position error: " << pos_err << " m" << std::endl;
  std::cout << "  Velocity error: " << vel_err << " m/s" << std::endl;
  std::cout << "  Energy drift:   " << e_drift << "%" << std::endl;
  std::cout << std::endl;

  // Semi-implicit Euler has O(dt) position error: ~0.5*g*dt = 0.049 m/s per
  // step tolerance on position: 0.1 m  (O(dt) Euler error for dt=0.01 s)
  bool position_ok = pos_err < 0.1f;
  bool velocity_ok = vel_err < 0.01f;
  bool energy_ok = std::abs(e_drift) < 2.0f;

  if (position_ok && velocity_ok && energy_ok) {
    std::cout << "PASS: C++ free-fall matches analytical solution!"
              << std::endl;
  } else {
    std::cout << "FAIL: Results outside tolerance" << std::endl;
    std::cout << "  pos_ok=" << position_ok << " vel_ok=" << velocity_ok
              << " energy_ok=" << energy_ok << std::endl;
  }
}

// =============================================================================
// TEST 2 — Projectile Motion
// =============================================================================
void test_projectile_motion() {
  std::cout << std::endl;
  std::cout << "=== Phase 1: Projectile Motion Test ===" << std::endl;
  std::cout << std::endl;

  float v0 = 20.0f; // m/s launch speed
  float angle_deg = 45.0f;
  float angle_rad = angle_deg * 3.14159265f / 180.0f;
  float dt = 0.01f;
  float g = 9.81f;

  RigidBody body;
  body.mass = 1.0f;
  body.inv_mass = 1.0f;
  body.position = Vec3(0.0f, 0.0f, 0.0f);
  body.velocity =
      Vec3(v0 * std::cos(angle_rad), v0 * std::sin(angle_rad), 0.0f);

  std::cout << "Launch speed: " << v0 << " m/s at " << angle_deg << " deg"
            << std::endl;
  std::cout << "vx0=" << body.velocity.x << " m/s  vy0=" << body.velocity.y
            << " m/s" << std::endl;
  std::cout << std::endl;

  float initial_energy = mechanical_energy(body);
  float max_height = 0.0f;
  float sim_time = 0.0f;
  int step_count = 0;

  std::cout << "--- Simulating until y < 0 ---" << std::endl;

  while (body.position.y >= 0.0f && step_count < 100000) {
    euler_step(body, dt);
    sim_time += dt;
    ++step_count;

    if (body.position.y > max_height)
      max_height = body.position.y;
  }

  float final_energy = mechanical_energy(body);

  std::cout << std::endl;
  std::cout << "=== Results ===" << std::endl;
  std::cout << std::fixed << std::setprecision(2);
  std::cout << "Maximum height: " << max_height << " m" << std::endl;
  std::cout << "Range:          " << body.position.x << " m" << std::endl;
  std::cout << "Flight time:    " << sim_time << " s" << std::endl;
  std::cout << std::endl;

  // Analytical (vacuum, no Euler error):
  //   t_flight = 2*vy0/g = 2*14.142/9.81 ≈ 2.884 s
  //   range    = vx0 * t_flight ≈ 14.142 * 2.884 ≈ 40.77 m
  //   max_h    = vy0^2 / (2g) ≈ 200/19.62 ≈ 10.19 m
  float vx0 = v0 * std::cos(angle_rad);
  float vy0 = v0 * std::sin(angle_rad);
  float t_flight = 2.0f * vy0 / g;
  float anal_range = vx0 * t_flight;
  float anal_maxh = vy0 * vy0 / (2.0f * g);

  std::cout << "Analytical solution:" << std::endl;
  std::cout << "  Max height:  " << anal_maxh << " m" << std::endl;
  std::cout << "  Range:       " << anal_range << " m" << std::endl;
  std::cout << "  Flight time: " << t_flight << " s" << std::endl;
  std::cout << std::endl;

  float e_drift =
      (final_energy - initial_energy) / std::abs(initial_energy) * 100.0f;
  std::cout << "Energy drift: " << std::setprecision(4) << e_drift << "%"
            << std::endl;
  std::cout << std::endl;

  // Tolerances: semi-implicit Euler adds O(dt) per step, ~O(1%) over flight
  bool height_ok = std::abs(max_height - anal_maxh) < 0.5f;
  bool range_ok = std::abs(body.position.x - anal_range) < 1.0f;
  bool energy_ok = std::abs(e_drift) < 2.0f;

  if (height_ok && range_ok && energy_ok) {
    std::cout << "PASS: C++ projectile matches analytical solution!"
              << std::endl;
  } else {
    std::cout << "FAIL: Results deviate from analytical" << std::endl;
    std::cout << "  height_ok=" << height_ok << " range_ok=" << range_ok
              << " energy_ok=" << energy_ok << std::endl;
  }
}

// =============================================================================
int main() {
  std::cout << "======================================" << std::endl;
  std::cout << "REALIS Physics Engine - Phase 1 Demo" << std::endl;
  std::cout << "Point Mass Motion Under Gravity" << std::endl;
  std::cout << "======================================" << std::endl;
  std::cout << std::endl;

  test_free_fall();

  std::cout << std::endl;
  std::cout << "======================================" << std::endl;
  std::cout << std::endl;

  test_projectile_motion();

  std::cout << std::endl;
  std::cout << "======================================" << std::endl;
  std::cout << "Phase 1 Validation Complete" << std::endl;
  std::cout << "======================================" << std::endl;

  return 0;
}
