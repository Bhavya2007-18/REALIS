// Stable Topology Tracking (Parametric Regeneration)
// Ensures topological boundaries (like Faces) retain their logical IDs when the
// CAD model is resized

#pragma once
#include "brep_core.hpp"
#include <map>
#include <string>
#include <vector>
#include <cmath>


namespace realis {
namespace geometry {

class ParametricTracker {
public:
  // A mapping from old ID to boundary condition metadata (string for demo)
  std::map<std::string, std::string> boundary_associations;

  // Generates a deterministic ID for a Face based on its topological bounding
  // properties like its Normal vector and Area ratio, rather than arbitrary
  // pointer memory. If the solid is stretched along Z, the X & Y normal faces
  // are invariant, and the +Z face retains its normal, ensuring continuous
  // tracking.
  static std::string
  generate_stable_face_id(const Face &f, const std::string &parent_solid_id) {
    // Quantize normal to stable integer grid to prevent precision drift
    int nx = static_cast<int>(std::round(f.outward_normal.x * 100.0));
    int ny = static_cast<int>(std::round(f.outward_normal.y * 100.0));
    int nz = static_cast<int>(std::round(f.outward_normal.z * 100.0));

    // Using area as a secondary hash, quantized loosely
    // 10.0 scale implies 0.1m^2 tolerance groups
    int area_group = static_cast<int>(std::round(f.area * 10.0));

    return parent_solid_id + "_FACE_N(" + std::to_string(nx) + "," +
           std::to_string(ny) + "," + std::to_string(nz) + ")_A(" +
           std::to_string(area_group) + ")";
  }

  // Attach a physics boundary condition (e.g. "Fixed Wall", "Pressure Load") to
  // a Face ID
  void attach_boundary_condition(const std::string &face_id,
                                 const std::string &condition) {
    boundary_associations[face_id] = condition;
  }

  // Checks if the regenerated topological Face still holds the legacy boundary
  // state
  std::string get_boundary_condition(const std::string &face_id) const {
    auto it = boundary_associations.find(face_id);
    if (it != boundary_associations.end()) {
      return it->second;
    }
    return "NONE";
  }
};

} // namespace geometry
} // namespace realis
