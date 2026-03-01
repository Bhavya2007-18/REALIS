// Deterministic Regression Harness
// Baseline comparison with automatic failure detection on solver drift

#pragma once
#include <cmath>
#include <functional>
#include <iomanip>
#include <iostream>
#include <string>
#include <vector>


namespace realis {
namespace verification {

struct RegressionResult {
  std::string name;
  double observed;
  double baseline;
  double tolerance;
  bool passed;
  double diff;
};

class RegressionHarness {
public:
  struct TestCase {
    std::string name;
    std::function<double()> runner; // Returns the key observable
    double baseline;                // Expected value
    double tolerance;               // Max allowed relative deviation
  };

  void register_test(const std::string &name, std::function<double()> runner,
                     double baseline, double tolerance) {
    tests_.push_back({name, runner, baseline, tolerance});
  }

  std::vector<RegressionResult> run_all() {
    std::vector<RegressionResult> results;

    std::cout << "\n╔══════════════════════════════════════════════╗\n";
    std::cout << "║     REALIS Regression Test Suite             ║\n";
    std::cout << "╚══════════════════════════════════════════════╝\n\n";

    int pass_count = 0;
    int fail_count = 0;

    for (const auto &test : tests_) {
      double observed = test.runner();
      double diff = std::abs(observed - test.baseline);
      double rel = (std::abs(test.baseline) > 1e-15)
                       ? diff / std::abs(test.baseline)
                       : diff;
      bool passed = rel <= test.tolerance;

      results.push_back(
          {test.name, observed, test.baseline, test.tolerance, passed, rel});

      std::cout << std::fixed << std::setprecision(8);
      if (passed) {
        std::cout << "  [PASS] " << test.name << " | obs=" << observed
                  << " base=" << test.baseline << " rel_err=" << std::scientific
                  << rel << "\n";
        pass_count++;
      } else {
        std::cout << "  [FAIL] " << test.name << " | obs=" << observed
                  << " base=" << test.baseline << " rel_err=" << std::scientific
                  << rel << " > tol=" << test.tolerance << "\n";
        fail_count++;
      }
    }

    std::cout << "\n  Summary: " << pass_count << " passed, " << fail_count
              << " failed out of " << tests_.size() << " tests.\n";

    if (fail_count > 0) {
      std::cout << "  *** REGRESSION DETECTED ***\n";
    }

    return results;
  }

private:
  std::vector<TestCase> tests_;
};

} // namespace verification
} // namespace realis
