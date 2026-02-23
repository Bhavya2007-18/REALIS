#include "integrator.hpp"
#include <cstddef>
#include <vector>

namespace realis {

// --- Forward Euler (Explicit) ---
void ForwardEuler::step(System &sys, float dt) {
  std::vector<float> y_n = sys.get_state();
  std::vector<float> k1 = sys.compute_derivatives(y_n, 0.0f);

  std::vector<float> y_np1(y_n.size());
  for (size_t i = 0; i < y_n.size(); ++i) {
    y_np1[i] = y_n[i] + dt * k1[i];
  }
  sys.set_state(y_np1);
}

// --- Semi-Implicit Euler ---
// Processes state linearly assuming typical translation stride length `N`
// Because Phase 1B incorporates rotational states (which don't linearly
// integrate simply using nested v/p coupling trivially over generic indexes
// without knowing the map structure), we will structurally apply the symplectic
// form purely to the translational sector `[pos, vel]` (indices 0-5), and
// explicitly integrate the complex rotational structures `[quat, omega]`
// natively generically (indices 6-12).
void SemiImplicitEuler::step(System &sys, float dt) {
  std::vector<float> y_n = sys.get_state();
  std::vector<float> k1 = sys.compute_derivatives(y_n, 0.0f);

  std::vector<float> y_np1 = y_n;

  // Length is 13 floats per body
  for (size_t i = 0; i < y_n.size(); i += 13) {
    // Translation: Symplectic Semi-Implicit
    // v_{n+1} = v_n + a_n * dt
    y_np1[i + 3] = y_n[i + 3] + dt * k1[i + 3];
    y_np1[i + 4] = y_n[i + 4] + dt * k1[i + 4];
    y_np1[i + 5] = y_n[i + 5] + dt * k1[i + 5];

    // p_{n+1} = p_n + v_{n+1} * dt
    y_np1[i + 0] = y_n[i + 0] + dt * y_np1[i + 3]; // using new vel
    y_np1[i + 1] = y_n[i + 1] + dt * y_np1[i + 4];
    y_np1[i + 2] = y_n[i + 2] + dt * y_np1[i + 5];

    // Rotation: Explicit Euler
    // w_{n+1} = w_n + alpha_n * dt
    y_np1[i + 10] = y_n[i + 10] + dt * k1[i + 10];
    y_np1[i + 11] = y_n[i + 11] + dt * k1[i + 11];
    y_np1[i + 12] = y_n[i + 12] + dt * k1[i + 12];

    // q_{n+1} = q_n + q_dot_n * dt
    y_np1[i + 6] = y_n[i + 6] + dt * k1[i + 6];
    y_np1[i + 7] = y_n[i + 7] + dt * k1[i + 7];
    y_np1[i + 8] = y_n[i + 8] + dt * k1[i + 8];
    y_np1[i + 9] = y_n[i + 9] + dt * k1[i + 9];
  }

  sys.set_state(y_np1);
}

// --- 4th Order Runge-Kutta ---
void RK4Integrator::step(System &sys, float dt) {
  std::vector<float> y_n = sys.get_state();
  size_t N = y_n.size();

  // k1 = dt * f(t, y_n)
  std::vector<float> f1 = sys.compute_derivatives(y_n, 0.0f);
  std::vector<float> k1(N);
  std::vector<float> y_tmp(N);
  for (size_t i = 0; i < N; ++i) {
    k1[i] = dt * f1[i];
    y_tmp[i] = y_n[i] + 0.5f * k1[i];
  }

  // k2 = dt * f(t + 0.5dt, y_n + 0.5k1)
  std::vector<float> f2 = sys.compute_derivatives(y_tmp, 0.5f * dt);
  std::vector<float> k2(N);
  for (size_t i = 0; i < N; ++i) {
    k2[i] = dt * f2[i];
    y_tmp[i] = y_n[i] + 0.5f * k2[i];
  }

  // k3 = dt * f(t + 0.5dt, y_n + 0.5k2)
  std::vector<float> f3 = sys.compute_derivatives(y_tmp, 0.5f * dt);
  std::vector<float> k3(N);
  for (size_t i = 0; i < N; ++i) {
    k3[i] = dt * f3[i];
    y_tmp[i] = y_n[i] + k3[i];
  }

  // k4 = dt * f(t + dt, y_n + k3)
  std::vector<float> f4 = sys.compute_derivatives(y_tmp, dt);
  std::vector<float> k4(N);
  std::vector<float> y_np1(N);
  for (size_t i = 0; i < N; ++i) {
    k4[i] = dt * f4[i];
    y_np1[i] = y_n[i] + (k1[i] + 2.0f * k2[i] + 2.0f * k3[i] + k4[i]) / 6.0f;
  }

  sys.set_state(y_np1);
}

} // namespace realis
