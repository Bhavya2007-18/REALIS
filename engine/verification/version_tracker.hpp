// Versioned Result Tracker
// Hash-based fingerprinting of simulation state with metadata

#pragma once
#include <cmath>
#include <functional>
#include <iomanip>
#include <iostream>
#include <string>
#include <vector>


namespace realis {
namespace verification {

struct SimulationFingerprint {
  std::string solver_version;
  double timestep;
  int mesh_size;
  std::string material_params; // Serialized key params

  // Hash of the final state vector (simple deterministic sum-based hash)
  double state_hash;

  static double compute_state_hash(const std::vector<double> &state) {
    // Deterministic hash: weighted sum with prime multipliers
    // Not cryptographic — just for detecting any numerical change
    double hash = 0.0;
    for (size_t i = 0; i < state.size(); ++i) {
      hash += state[i] * (1.0 + 0.001 * static_cast<double>(i));
    }
    return hash;
  }
};

struct FingerprintComparison {
  bool version_changed = false;
  bool timestep_changed = false;
  bool mesh_changed = false;
  bool material_changed = false;
  double state_diff = 0.0;
  bool state_matched = true;

  void report() const {
    std::cout << "[Version Tracker Comparison]\n";
    if (version_changed)
      std::cout << "  ** Solver version CHANGED\n";
    if (timestep_changed)
      std::cout << "  ** Timestep CHANGED\n";
    if (mesh_changed)
      std::cout << "  ** Mesh size CHANGED\n";
    if (material_changed)
      std::cout << "  ** Material params CHANGED\n";
    std::cout << "  State hash diff: " << std::scientific << state_diff << "\n";
    std::cout << "  State match: "
              << (state_matched ? "YES" : "NO — DRIFT DETECTED") << "\n";
  }
};

class VersionTracker {
public:
  static FingerprintComparison compare(const SimulationFingerprint &old_fp,
                                       const SimulationFingerprint &new_fp,
                                       double hash_tolerance = 1e-10) {
    FingerprintComparison cmp;
    cmp.version_changed = (old_fp.solver_version != new_fp.solver_version);
    cmp.timestep_changed =
        (std::abs(old_fp.timestep - new_fp.timestep) > 1e-15);
    cmp.mesh_changed = (old_fp.mesh_size != new_fp.mesh_size);
    cmp.material_changed = (old_fp.material_params != new_fp.material_params);
    cmp.state_diff = std::abs(old_fp.state_hash - new_fp.state_hash);
    cmp.state_matched = (cmp.state_diff < hash_tolerance);
    return cmp;
  }
};

} // namespace verification
} // namespace realis
