



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
  
  std::map<std::string, std::string> boundary_associations;

  
  
  
  
  
  static std::string
  generate_stable_face_id(const Face &f, const std::string &parent_solid_id) {
    
    int nx = static_cast<int>(std::round(f.outward_normal.x * 100.0));
    int ny = static_cast<int>(std::round(f.outward_normal.y * 100.0));
    int nz = static_cast<int>(std::round(f.outward_normal.z * 100.0));

    
    
    int area_group = static_cast<int>(std::round(f.area * 10.0));

    return parent_solid_id + "_FACE_N(" + std::to_string(nx) + "," +
           std::to_string(ny) + "," + std::to_string(nz) + ")_A(" +
           std::to_string(area_group) + ")";
  }

  
  
  void attach_boundary_condition(const std::string &face_id,
                                 const std::string &condition) {
    boundary_associations[face_id] = condition;
  }

  
  
  std::string get_boundary_condition(const std::string &face_id) const {
    auto it = boundary_associations.find(face_id);
    if (it != boundary_associations.end()) {
      return it->second;
    }
    return "NONE";
  }
};

} 
} 