// Benchmark Problem Library
// Canonical analytical solutions for formal V&V comparison

#pragma once
#include <cmath>
#include <iomanip>
#include <iostream>
#include <string>
#include <vector>


namespace realis {
namespace verification {

struct BenchmarkResult {
  std::string name;
  double observed;
  double analytical;
  double relative_error;
  double pass_threshold;
  bool passed;

  void report() const {
    std::cout << std::scientific << std::setprecision(6);
    std::cout << "  [" << (passed ? "PASS" : "FAIL") << "] " << name
              << " | obs=" << observed << " ana=" << analytical
              << " rel_err=" << relative_error << "\n";
  }
};

class BenchmarkLibrary {
public:
  // ── Rigid Body ──

  // Free-fall: y(t) = 0.5 * g * t^2
  static BenchmarkResult freefall(double simulated_y, double g, double t,
                                  double tol = 1e-3) {
    double analytical = 0.5 * g * t * t;
    double rel_err = std::abs(simulated_y - analytical) / std::abs(analytical);
    return {"Rigid Body Free-Fall", simulated_y, analytical, rel_err, tol,
            rel_err <= tol};
  }

  // Elastic 1D collision: v1_f = ((m1-m2)/(m1+m2))*v1_i, v2_f =
  // (2*m1/(m1+m2))*v1_i
  static BenchmarkResult elastic_collision_v1(double sim_v1f, double m1,
                                              double m2, double v1i,
                                              double tol = 1e-3) {
    double ana = ((m1 - m2) / (m1 + m2)) * v1i;
    double rel_err = (std::abs(ana) > 1e-15)
                         ? std::abs(sim_v1f - ana) / std::abs(ana)
                         : std::abs(sim_v1f - ana);
    return {"Elastic Collision v1_final",
            sim_v1f,
            ana,
            rel_err,
            tol,
            rel_err <= tol};
  }

  // ── FEM ──

  // Cantilever tip displacement: delta = P*L^3 / (3*E*I)
  static BenchmarkResult cantilever_tip(double sim_delta, double P, double L,
                                        double E, double I, double tol = 1e-2) {
    double ana = P * L * L * L / (3.0 * E * I);
    double rel_err = std::abs(sim_delta - ana) / std::abs(ana);
    return {"FEM Cantilever Tip Displacement",
            sim_delta,
            ana,
            rel_err,
            tol,
            rel_err <= tol};
  }

  // FEM Patch test: uniform strain must be reproduced exactly
  static BenchmarkResult patch_test(double sim_strain, double applied_strain,
                                    double tol = 1e-6) {
    double rel_err = std::abs(sim_strain - applied_strain);
    return {"FEM Patch Test", sim_strain, applied_strain,
            rel_err,          tol,        rel_err <= tol};
  }

  // ── Fluid ──

  // Sod shock tube: density at midpoint at t=0.2 (approximate reference)
  static BenchmarkResult sod_midpoint_density(double sim_rho,
                                              double tol = 0.05) {
    double ana_rho = 0.42632; // Reference Sod solution at x=0.5, t=0.2
    double rel_err = std::abs(sim_rho - ana_rho) / ana_rho;
    return {"Sod Shock Tube Midpoint Density",
            sim_rho,
            ana_rho,
            rel_err,
            tol,
            rel_err <= tol};
  }

  // Uniform flow invariance: max deviation across cells
  static BenchmarkResult uniform_flow(double max_deviation,
                                      double tol = 1e-10) {
    return {"Uniform Flow Invariance", max_deviation, 0.0, max_deviation, tol,
            max_deviation <= tol};
  }

  // ── Multiphysics ──

  // Thermoelastic stress: sigma = E * alpha * delta_T
  static BenchmarkResult thermoelastic_stress(double sim_sigma, double E,
                                              double alpha, double delta_T,
                                              double tol = 1e-4) {
    double ana = E * alpha * delta_T;
    double rel_err = std::abs(sim_sigma - ana) / std::abs(ana);
    return {"Thermoelastic Expansion Stress",
            sim_sigma,
            ana,
            rel_err,
            tol,
            rel_err <= tol};
  }
};

} // namespace verification
} // namespace realis
