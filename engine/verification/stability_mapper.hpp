// Timestep Stability Mapper
// Sweeps solver over dt range, records energy drift and error growth

#pragma once
#include <functional>
#include <iomanip>
#include <iostream>
#include <string>
#include <vector>


namespace realis {
namespace verification {

struct StabilityPoint {
  double dt;
  double energy_drift;
  double L2_error;
  bool stable;
};

class StabilityMapper {
public:
  // runner(dt) -> {energy_drift, L2_error}
  // The runner function runs the solver at timestep dt and returns the key
  // metrics
  using SolverRunner = std::function<std::pair<double, double>(double)>;

  static std::vector<StabilityPoint> sweep(SolverRunner runner, double dt_min,
                                           double dt_max, int num_points,
                                           double drift_threshold) {
    std::vector<StabilityPoint> map;

    double dt_step = (dt_max - dt_min) / static_cast<double>(num_points - 1);

    for (int i = 0; i < num_points; ++i) {
      double dt = dt_min + i * dt_step;
      std::pair<double, double> result = runner(dt);
      double drift = result.first;
      double error = result.second;
      bool stable = std::abs(drift) < drift_threshold;
      map.push_back({dt, drift, error, stable});
    }

    return map;
  }

  static double find_critical_dt(const std::vector<StabilityPoint> &map) {
    for (size_t i = 0; i < map.size(); ++i) {
      if (!map[i].stable) {
        return (i > 0) ? map[i - 1].dt : map[i].dt;
      }
    }
    return map.back().dt; // All stable
  }

  static void print_table(const std::vector<StabilityPoint> &map,
                          const std::string &label) {
    std::cout << "\n[Stability Map: " << label << "]\n";
    std::cout << std::setw(14) << "dt" << std::setw(16) << "energy_drift"
              << std::setw(16) << "L2_error" << std::setw(10) << "status"
              << "\n";
    std::cout << std::string(56, '-') << "\n";

    for (const auto &pt : map) {
      std::cout << std::scientific << std::setprecision(4) << std::setw(14)
                << pt.dt << std::setw(16) << pt.energy_drift << std::setw(16)
                << pt.L2_error << std::setw(10)
                << (pt.stable ? "STABLE" : "UNSTABLE") << "\n";
    }
  }
};

} // namespace verification
} // namespace realis
