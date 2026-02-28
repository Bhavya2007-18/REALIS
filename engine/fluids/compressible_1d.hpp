// 1D Compressible Flow Solver using Finite Volume Method
#pragma once
#include <vector>

namespace realis {
namespace fluids {

// Conserved variables state vector
struct FluidState1D {
  float rho;   // Density (mass per volume/length)
  float rho_u; // Momentum
  float E;     // Total Energy

  FluidState1D() : rho(0.0f), rho_u(0.0f), E(0.0f) {}
  FluidState1D(float r, float ru, float e) : rho(r), rho_u(ru), E(e) {}

  // Vector operations for finite volume updates
  FluidState1D operator+(const FluidState1D &other) const {
    return FluidState1D(rho + other.rho, rho_u + other.rho_u, E + other.E);
  }
  FluidState1D operator-(const FluidState1D &other) const {
    return FluidState1D(rho - other.rho, rho_u - other.rho_u, E - other.E);
  }
  FluidState1D operator*(float scalar) const {
    return FluidState1D(rho * scalar, rho_u * scalar, E * scalar);
  }
};

// Represents the 1D domain divided into finite volumes (cells)
class FluidDomain1D {
public:
  int num_cells;
  float dx;
  std::vector<FluidState1D> cells; // Cell-centered states

  FluidDomain1D(int n, float length) : num_cells(n), dx(length / n), cells(n) {}
};

// Finite Volume Method Solver for 1D Compressible Euler equations
class FVMSolver1D {
public:
  enum class BoundaryCondition { OUTFLOW, PERIODIC, REFLECTIVE };
  BoundaryCondition boundary_condition = BoundaryCondition::OUTFLOW;

  float gamma = 1.4f;                // Heat capacity ratio (ideal gas)
  float thermal_conductivity = 0.0f; // Fourier heat conduction coefficient 'k'
  float specific_heat_cv =
      718.0f; // Specific heat at constant volume (J/kg.K) for air

  // Computes the maximum allowable timestep obeying the CFL condition
  float compute_timestep(const FluidDomain1D &domain, float cfl) const;

  // Advances the domain by one timestep using explicit Euler and Rusanov flux
  void step(FluidDomain1D &domain, float dt) const;

  // Primitive variable extraction
  static float get_velocity(const FluidState1D &state);
  static float get_pressure(const FluidState1D &state, float gamma);
  static float get_internal_energy(const FluidState1D &state);
  static float get_temperature(const FluidState1D &state, float cv);
  static float get_sound_speed(const FluidState1D &state, float gamma);

private:
  // Physical flux vector F(U)
  FluidState1D compute_physical_flux(const FluidState1D &state) const;

  // Rusanov (Local Lax-Friedrichs) numerical flux at the interface between left
  // and right states
  FluidState1D compute_rusanov_flux(const FluidState1D &left,
                                    const FluidState1D &right) const;
};

} // namespace fluids
} // namespace realis
