


#pragma once
#include <cmath>
#include <stdexcept>
#include <vector>


namespace realis {
namespace verification {

class ErrorNorms {
public:
  
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

  
  static double compute_relative_error(double numerical, double analytical) {
    if (std::abs(analytical) < 1e-15)
      return std::abs(numerical); 
    return std::abs(numerical - analytical) / std::abs(analytical);
  }

  
  
  static double compute_convergence_rate(double error_coarse, double error_fine,
                                         double h_coarse, double h_fine) {
    if (error_fine < 1e-15 || h_fine < 1e-15)
      return 0.0; 
    return std::log(error_coarse / error_fine) / std::log(h_coarse / h_fine);
  }
};

} 
} 