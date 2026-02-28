#include "compressible_1d.hpp"
#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace realis {
namespace fluids {

float FVMSolver1D::get_velocity(const FluidState1D &state) {
  if (state.rho <= 0.0f)
    return 0.0f;
  return state.rho_u / state.rho;
}

float FVMSolver1D::get_internal_energy(const FluidState1D &state) {
  if (state.rho <= 0.0f)
    return 0.0f;
  float u = get_velocity(state);
  return (state.E / state.rho) - 0.5f * u * u;
}

float FVMSolver1D::get_pressure(const FluidState1D &state, float gamma) {
  if (state.rho <= 0.0f)
    return 0.0f;
  float u = get_velocity(state);
  return (gamma - 1.0f) * (state.E - 0.5f * state.rho * u * u);
}

float FVMSolver1D::get_temperature(const FluidState1D &state, float cv) {
  float e = get_internal_energy(state);
  return e / cv;
}

float FVMSolver1D::get_sound_speed(const FluidState1D &state, float gamma) {
  float p = get_pressure(state, gamma);
  if (state.rho <= 0.0f || p <= 0.0f)
    return 0.0f;
  return std::sqrt(gamma * p / state.rho);
}

float FVMSolver1D::compute_timestep(const FluidDomain1D &domain,
                                    float cfl) const {
  float max_speed = 0.0f;
  float max_alpha = 0.0f;
  for (int i = 0; i < domain.num_cells; ++i) {
    float u = std::abs(get_velocity(domain.cells[i]));
    float c = get_sound_speed(domain.cells[i], gamma);
    max_speed = std::max(max_speed, u + c);
    
    if (thermal_conductivity > 0.0f) {
        float alpha = thermal_conductivity / (domain.cells[i].rho * specific_heat_cv);
        max_alpha = std::max(max_alpha, alpha);
    }
  }

  float dt_adv = (max_speed == 0.0f) ? 0.001f : cfl * domain.dx / max_speed;
  float dt_diff = 1e6f;
  if (thermal_conductivity > 0.0f && max_alpha > 0.0f) {
      // parabolic stability limit (with CFL safety scale)
      dt_diff = cfl * 0.5f * domain.dx * domain.dx / max_alpha; 
  }

  return std::min(dt_adv, dt_diff);
}

FluidState1D
FVMSolver1D::compute_physical_flux(const FluidState1D &state) const {
  float u = get_velocity(state);
  float p = get_pressure(state, gamma);

  return FluidState1D(state.rho_u, state.rho_u * u + p, u * (state.E + p));
}

FluidState1D
FVMSolver1D::compute_rusanov_flux(const FluidState1D &left,
                                  const FluidState1D &right) const {
  FluidState1D F_L = compute_physical_flux(left);
  FluidState1D F_R = compute_physical_flux(right);

  float u_L = std::abs(get_velocity(left));
  float c_L = get_sound_speed(left, gamma);
  float u_R = std::abs(get_velocity(right));
  float c_R = get_sound_speed(right, gamma);

  float lambda_max = std::max(u_L + c_L, u_R + c_R);

  // Rusanov flux: 0.5 * (F_L + F_R) - 0.5 * lambda_max * (U_R - U_L)
  return (F_L + F_R) * 0.5f - (right - left) * (0.5f * lambda_max);
}

void FVMSolver1D::step(FluidDomain1D &domain, float dt) const {
  int n = domain.num_cells;
  std::vector<FluidState1D> next_cells(n);
  std::vector<FluidState1D> numerical_fluxes(n + 1);
  std::vector<float> heat_fluxes(n + 1, 0.0f);

  // 1. Compute fluxes at interfaces
  for (int i = 0; i <= n; ++i) {
    FluidState1D left, right;
    if (i == 0) {
      if (boundary_condition == BoundaryCondition::PERIODIC) {
        left = domain.cells[n - 1];
        right = domain.cells[0];
      } else if (boundary_condition == BoundaryCondition::REFLECTIVE) {
        left = domain.cells[0];
        left.rho_u = -left.rho_u;
        right = domain.cells[0];
      } else { // OUTFLOW
        left = domain.cells[0];
        right = domain.cells[0];
      }
    } else if (i == n) {
      if (boundary_condition == BoundaryCondition::PERIODIC) {
        left = domain.cells[n - 1];
        right = domain.cells[0];
      } else if (boundary_condition == BoundaryCondition::REFLECTIVE) {
        left = domain.cells[n - 1];
        right = domain.cells[n - 1];
        right.rho_u = -right.rho_u;
      } else { // OUTFLOW
        left = domain.cells[n - 1];
        right = domain.cells[n - 1];
      }
    } else {
      left = domain.cells[i - 1];
      right = domain.cells[i];
    }

    numerical_fluxes[i] = compute_rusanov_flux(left, right);

    // Heat transfer (Fourier conduction): q = -k * dT/dx
    if (thermal_conductivity > 0.0f) {
      float T_L = get_temperature(left, specific_heat_cv);
      float T_R = get_temperature(right, specific_heat_cv);
      heat_fluxes[i] = -thermal_conductivity * (T_R - T_L) / domain.dx;
    }
  }

  // 2. Explicit Euler Update
  // U_i^{n+1} = U_i^n - dt/dx * (F_{i+1/2} - F_{i-1/2})
  float dtdx = dt / domain.dx;
  for (int i = 0; i < n; ++i) {
    next_cells[i] = domain.cells[i] -
                    (numerical_fluxes[i + 1] - numerical_fluxes[i]) * dtdx;

    // Add heat flux divergence to Total Energy equation
    // divergence = (q_{i+1/2} - q_{i-1/2}) / dx
    // So E_new = E_old - dt/dx * (q_{i+1/2} - q_{i-1/2})
    next_cells[i].E -= (heat_fluxes[i + 1] - heat_fluxes[i]) * dtdx;

    // Safety checks
    if (next_cells[i].rho <= 0.0f) {
      throw std::runtime_error(
          "Negative density encountered during integration.");
    }
    float p = get_pressure(next_cells[i], gamma);
    if (p < 0.0f) {
      throw std::runtime_error(
          "Negative pressure encountered during integration.");
    }
    float e = get_internal_energy(next_cells[i]);
    if (e < 0.0f) {
      throw std::runtime_error(
          "Negative internal energy encountered during integration.");
    }
  }

  // Apply updates
  domain.cells = next_cells;
}

} // namespace fluids
} // namespace realis
