
#include "mesh_quality.hpp"
#include "../math/vec3.hpp"
#include <algorithm>
#include <cmath>
#include <sstream>


namespace realis {
namespace geometry {

void MeshQualityValidator::validate_tetrahedrons(
    const std::vector<TetElement> &mesh, QualityReport &report) {
  for (const auto &tet : mesh) {

    // 1. Jacobian positive check (No inverted elements)
    double J = compute_jacobian_determinant(tet);
    if (J < MIN_JACOBIAN) {
      std::stringstream ss;
      ss << "Inverted or highly collapsed element detected! ID: " << tet.id
         << " (Jacobian = " << J << ")";
      report.fail(ss.str());
    }

    // 2. Aspect Ratio Check
    double AR = compute_aspect_ratio(tet);
    if (AR < MIN_ASPECT_RATIO) {
      std::stringstream ss;
      ss << "Poor aspect ratio element detected! ID: " << tet.id
         << " (Aspect Ratio = " << AR << ")";
      report.fail(ss.str());
    }
  }
}

double
MeshQualityValidator::compute_jacobian_determinant(const TetElement &el) {
  // For a 4-node tetrahedron, Jacobian matrix J maps reference element to
  // physical space. Det(J) = Volume * 6 Coordinates: p0, p1, p2, p3
  Vec3 p0(el.coords[0][0], el.coords[0][1], el.coords[0][2]);
  Vec3 p1(el.coords[1][0], el.coords[1][1], el.coords[1][2]);
  Vec3 p2(el.coords[2][0], el.coords[2][1], el.coords[2][2]);
  Vec3 p3(el.coords[3][0], el.coords[3][1], el.coords[3][2]);

  // Edges from p0
  Vec3 e1 = p1 - p0;
  Vec3 e2 = p2 - p0;
  Vec3 e3 = p3 - p0;

  // Scalar triple product: (e1 x e2) \cdot e3
  double det_J = (e1.cross(e2)).dot(e3);
  return det_J;
}

double MeshQualityValidator::compute_aspect_ratio(const TetElement &el) {
  // 6 edges in a tetrahedron
  Vec3 p[4];
  for (int i = 0; i < 4; ++i) {
    p[i] = Vec3(el.coords[i][0], el.coords[i][1], el.coords[i][2]);
  }

  double min_len = 1e12;
  double max_len = 0.0;

  for (int i = 0; i < 4; ++i) {
    for (int j = i + 1; j < 4; ++j) {
      double len = static_cast<double>((p[i] - p[j]).magnitude());
      if (len < min_len)
        min_len = len;
      if (len > max_len)
        max_len = len;
    }
  }

  if (max_len == 0.0)
    return 0.0; // Point mass masquerading as Tet
  return min_len / max_len;
}

} // namespace geometry
} // namespace realis
