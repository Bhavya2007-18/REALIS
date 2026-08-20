
#pragma once
#include <vector>

namespace realis {
namespace fluids {


struct FluidState1D {
  float rho;   
  float rho_u; 
  float E;     

  FluidState1D() : rho(0.0f), rho_u(0.0f), E(0.0f) {}
  FluidState1D(float r, float ru, float e) : rho(r), rho_u(ru), E(e) {}

  
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


class FluidDomain1D {
public:
  int num_cells;
  float dx;
  std::vector<FluidState1D> cells; 

  FluidDomain1D(int n, float length) : num_cells(n), dx(length / n), cells(n) {}
};


class FVMSolver1D {
public:
  enum class BoundaryCondition { OUTFLOW, PERIODIC, REFLECTIVE };
  BoundaryCondition boundary_condition = BoundaryCondition::OUTFLOW;

  float gamma = 1.4f;                
  float thermal_conductivity = 0.0f; 
  float specific_heat_cv =
      718.0f; 

  
  float compute_timestep(const FluidDomain1D &domain, float cfl) const;

  
  void step(FluidDomain1D &domain, float dt) const;

  
  static float get_velocity(const FluidState1D &state);
  static float get_pressure(const FluidState1D &state, float gamma);
  static float get_internal_energy(const FluidState1D &state);
  static float get_temperature(const FluidState1D &state, float cv);
  static float get_sound_speed(const FluidState1D &state, float gamma);

private:
  
  FluidState1D compute_physical_flux(const FluidState1D &state) const;

  
  
  FluidState1D compute_rusanov_flux(const FluidState1D &left,
                                    const FluidState1D &right) const;
};

} 
} 