
#include "topology_validator.hpp"
#include <algorithm>
#include <cmath>
#include <map>
#include <set>
#include <sstream>


namespace realis {
namespace geometry {

void TopologyValidator::validate_manifold(const Solid &solid,
                                          ValidationReport &report) {
  // 1. Manifold Check: Every edge must be shared by exactly TWO faces.
  // If < 2: Open shell / hole.
  // If > 2: Non-manifold geometry (e.g. valid graphically, invalid physically).

  // Quick topological test using explicit pointers
  std::map<Edge *, int> edge_usage;
  for (const auto &face : solid.faces) {
    for (Edge *e : face->edges) {
      edge_usage[e]++;
    }
  }

  for (const auto &pair : edge_usage) {
    if (pair.second != 2) {
      std::stringstream ss;
      ss << "Non-manifold or Open Edge detected: " << pair.first->id
         << " (Shared by " << pair.second << " faces)";
      report.fail(ss.str());
    }
  }
}

void TopologyValidator::validate_tolerances(const Solid &solid,
                                            ValidationReport &report) {
  // 1. Zero-Length Edge Check
  for (const auto &edge : solid.edges) {
    if (edge->length() < Tolerances::vertex_weld) {
      report.fail("Micro-edge / Zero-length edge detected: " + edge->id);
    }
  }

  // 2. Degenerate Face Check (Slivers)
  for (const auto &face : solid.faces) {
    if (face->area < Tolerances::minimum_area) {
      report.fail("Degenerate or Sliver face detected: " + face->id);
    }
  }

  // 3. Unwelded Coincident Vertex Check
  // If two separate vertices exist within the weld tolerance, the B-rep is
  // shattered.
  for (size_t i = 0; i < solid.vertices.size(); ++i) {
    for (size_t j = i + 1; j < solid.vertices.size(); ++j) {
      if (solid.vertices[i]->is_coincident(*solid.vertices[j])) {
        report.fail("Unwelded coincident vertices detected: " +
                    solid.vertices[i]->id + " and " + solid.vertices[j]->id);
      }
    }
  }
}

void TopologyValidator::validate_normals_and_volume(const Solid &solid,
                                                    ValidationReport &report) {
  // Using the divergence theorem (Gauss's Theorem) to compute volume of a
  // closed polyhedron V = (1/3) * sum( (pos \cdot n) * Area )

  double volume = 0.0;
  for (const auto &face : solid.faces) {
    // Assume first vertex in face is on the plane
    // A more rigorous B-rep tracks the exact plane definition, but this works
    // for planar facets.
    if (face->edges.empty()) {
      report.fail("Face with no edges: " + face->id);
      continue;
    }

    Vec3 pt0 = face->edges[0]->v1->pos; // A point on the face

    // Signed volume contribution of this face pyramid from origin
    double d_volume = (pt0.dot(face->outward_normal)) * face->area;
    volume += d_volume / 3.0;
  }

  if (volume < 0.0) {
    report.fail("Negative volume. Normals are inverted (pointing inwards). "
                "Expected positive solid.");
  }

  if (std::abs(volume) < 1e-12) {
    report.fail("Zero volume shell detected.");
  }
}

} // namespace geometry
} // namespace realis
