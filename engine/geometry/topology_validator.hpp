


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
  
  
  
  static void validate_manifold(const Solid &solid, ValidationReport &report);

  
  
  static void validate_tolerances(const Solid &solid, ValidationReport &report);

  
  
  static void validate_normals_and_volume(const Solid &solid,
                                          ValidationReport &report);

  
  
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

} 
} 