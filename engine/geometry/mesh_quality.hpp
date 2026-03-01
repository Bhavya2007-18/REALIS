// Mesh Quality Evaluator
// Verifies generated elements before passing them to the physical simulation

#pragma once
#include <string>
#include <vector>


namespace realis {
namespace geometry {

// Simple 3D Tetrahedron abstraction for quality checking
struct TetElement {
  std::string id;
  double coords[4][3]; // x,y,z for 4 nodes
};

class MeshQualityValidator {
public:
  // Minimum allowable quality standards for simulation stability
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
  // Checks if the determinant of the Jacobian matrix is rigidly positive
  // meaning the element isn't inverted or flattened.
  static double compute_jacobian_determinant(const TetElement &el);

  // Ratio of shortest edge to longest edge
  static double compute_aspect_ratio(const TetElement &el);
};

} // namespace geometry
} // namespace realis
