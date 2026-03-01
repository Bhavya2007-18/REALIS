// Conservation Residual Tracker
// Per-step reporting of mass, energy, momentum residuals with threshold
// enforcement

#pragma once
#include <cmath>
#include <iomanip>
#include <iostream>
#include <string>


namespace realis {
namespace verification {

struct ConservationResiduals {
  double mass_error = 0.0;
  double energy_error = 0.0;
  double momentum_error = 0.0;
  double max_constraint_violation = 0.0;
  double discretization_error_estimate = 0.0;

  void compute(double initial_mass, double final_mass, double initial_energy,
               double final_energy, double initial_momentum,
               double final_momentum) {
    mass_error = (initial_mass > 1e-15)
                     ? std::abs(final_mass - initial_mass) / initial_mass
                     : 0.0;
    energy_error =
        (initial_energy > 1e-15)
            ? std::abs(final_energy - initial_energy) / initial_energy
            : 0.0;
    momentum_error =
        (initial_momentum > 1e-15)
            ? std::abs(final_momentum - initial_momentum) / initial_momentum
            : std::abs(final_momentum - initial_momentum);
  }

  void report(const std::string &label) const {
    std::cout << std::scientific << std::setprecision(6);
    std::cout << "[V&V Report: " << label << "]\n";
    std::cout << "  Mass error:                  " << mass_error << "\n";
    std::cout << "  Energy error:                " << energy_error << "\n";
    std::cout << "  Momentum error:              " << momentum_error << "\n";
    std::cout << "  Max constraint violation:    " << max_constraint_violation
              << "\n";
    std::cout << "  Discretization error est:    "
              << discretization_error_estimate << "\n";
  }

  bool check_thresholds(double tol) const {
    bool valid = true;
    if (mass_error > tol) {
      std::cerr << "  ** THRESHOLD EXCEEDED: Mass error " << mass_error << " > "
                << tol << "\n";
      valid = false;
    }
    if (energy_error > tol) {
      std::cerr << "  ** THRESHOLD EXCEEDED: Energy error " << energy_error
                << " > " << tol << "\n";
      valid = false;
    }
    if (momentum_error > tol) {
      std::cerr << "  ** THRESHOLD EXCEEDED: Momentum error " << momentum_error
                << " > " << tol << "\n";
      valid = false;
    }
    return valid;
  }
};

} // namespace verification
} // namespace realis
