// Topological Validation and Integrity Checks
// Physics Engine must refuse invalid, broken, or non-manifold topology

#pragma once
#include "brep_core.hpp"
#include <string>
#include <vector>
#include <stdexcept>

namespace realis {
namespace geometry {

struct ValidationReport {
  bool is_valid = true;
  std::vector<std::string> errors;

  void fail(const std::string &reason) {
    is_valid = false;
    errors.push_back(reason);
  }
};

class TopologyValidator {
public:
  // 1. Manifold Check: Every edge in a Solid must be shared by EXACTLY two
  // faces. Throws or logs failure if open boundaries (holes) or non-manifold
  // intersections exist.
  static void validate_manifold(const Solid &solid, ValidationReport &report);

  // 2. Tolerance Check: Identifies micro-gaps, coincident vertices not welded,
  // or zero-length edges.
  static void validate_tolerances(const Solid &solid, ValidationReport &report);

  // 3. Normal Consistency & Volume Check: Ensures faces are oriented correctly
  // and define positive volume.
  static void validate_normals_and_volume(const Solid &solid,
                                          ValidationReport &report);

  // Composite strict validation throwing an exception if any topology
  // requirement breaks.
  static void strictly_validate_for_physics(const Solid &solid) {
    ValidationReport report;
    validate_manifold(solid, report);
    validate_tolerances(solid, report);
    validate_normals_and_volume(solid, report);

    if (!report.is_valid) {
      std::string msg = "Topology Validation Failed (" + solid.id + "):\n";
      for (const auto &err : report.errors) {
        msg += "- " + err + "\n";
      }
      throw std::runtime_error(msg);
    }
  }
};

} // namespace geometry
} // namespace realis
