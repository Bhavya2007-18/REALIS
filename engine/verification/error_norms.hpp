// Error Norm & Convergence Rate Utilities
// Formal quantification of numerical error for V&V

#pragma once
#include <cmath>
#include <stdexcept>
#include <vector>


namespace realis {
namespace verification {

class ErrorNorms {
public:
  // Discrete L2 norm: sqrt( (1/n) * sum( (u_h - u_exact)^2 ) )
  static double compute_L2_error(const std::vector<double> &numerical,
                                 const std::vector<double> &analytical) {
    if (numerical.size() != analytical.size() || numerical.empty())
      throw std::invalid_argument("ErrorNorms: mismatched or empty vectors");

    double sum_sq = 0.0;
    for (size_t i = 0; i < numerical.size(); ++i) {
      double diff = numerical[i] - analytical[i];
      sum_sq += diff * diff;
    }
    return std::sqrt(sum_sq / static_cast<double>(numerical.size()));
  }

  // Energy norm: sqrt( sum( K_i * (u_h_i - u_exact_i)^2 ) )
  // Weighted by physical stiffness to emphasize structurally important errors
  static double
  compute_energy_norm_error(const std::vector<double> &numerical,
                            const std::vector<double> &analytical,
                            const std::vector<double> &stiffness_weights) {
    if (numerical.size() != analytical.size() ||
        numerical.size() != stiffness_weights.size())
      throw std::invalid_argument(
          "ErrorNorms: mismatched vectors for energy norm");

    double sum = 0.0;
    for (size_t i = 0; i < numerical.size(); ++i) {
      double diff = numerical[i] - analytical[i];
      sum += stiffness_weights[i] * diff * diff;
    }
    return std::sqrt(sum);
  }

  // Scalar relative error: |numerical - analytical| / |analytical|
  static double compute_relative_error(double numerical, double analytical) {
    if (std::abs(analytical) < 1e-15)
      return std::abs(numerical); // Avoid division by zero
    return std::abs(numerical - analytical) / std::abs(analytical);
  }

  // Observed convergence rate: p = log(e_coarse / e_fine) / log(h_coarse /
  // h_fine) For mesh refinement: h is element size. For timestep: h is dt.
  static double compute_convergence_rate(double error_coarse, double error_fine,
                                         double h_coarse, double h_fine) {
    if (error_fine < 1e-15 || h_fine < 1e-15)
      return 0.0; // Exact solution reached or degenerate input
    return std::log(error_coarse / error_fine) / std::log(h_coarse / h_fine);
  }
};

} // namespace verification
} // namespace realis
