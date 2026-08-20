


#pragma once
#include <string>
#include <vector>


namespace realis {
namespace geometry {


struct TetElement {
  std::string id;
  double coords[4][3]; 
};

class MeshQualityValidator {
public:
  
  static constexpr double MIN_ASPECT_RATIO = 0.01;
  static constexpr double MIN_JACOBIAN = 1e-9;

  struct QualityReport {
    bool is_valid = true;
    std::vector<std::string> errors;
    void fail(const std::string &msg) {
      is_valid = false;
      errors.push_back(msg);
    }
  };

  static void validate_tetrahedrons(const std::vector<TetElement> &mesh,
                                    QualityReport &report);

private:
  
  
  static double compute_jacobian_determinant(const TetElement &el);

  
  static double compute_aspect_ratio(const TetElement &el);
};

} 
} 