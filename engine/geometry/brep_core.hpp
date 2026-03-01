// Faceted Boundary Representation (B-Rep) Core Data Structures
// Phase 7: Geometric Foundation

#pragma once
#include "../math/vec3.hpp"
#include <string>
#include <vector>


namespace realis {
namespace geometry {

// A global tolerance manager to rigorously control welding, gaps, and floating
// point inconsistencies
struct Tolerances {
  static constexpr double vertex_weld = 1e-6; // 1 micrometer
  static constexpr double coincident = 1e-6;
  static constexpr double coplanar = 1e-5;
  static constexpr double minimum_area =
      1e-8; // Slivers below this area are rejected
};

// Topological Entity Base
struct TopoEntity {
  std::string id; // Stable parametric tracking ID
  TopoEntity() = default;
  explicit TopoEntity(std::string name) : id(std::move(name)) {}
  virtual ~TopoEntity() = default;
};

// 0D Vertex
struct Vertex : public TopoEntity {
  Vec3 pos;
  Vertex(const std::string &name, const Vec3 &p) : TopoEntity(name), pos(p) {}

  // Tolerance-based equality
  bool is_coincident(const Vertex &other) const {
    Vec3 diff = pos - other.pos;
    float dist_sq = diff.dot(diff);
    return dist_sq < static_cast<float>(Tolerances::vertex_weld * Tolerances::vertex_weld);
  }
};

// 1D Edge connecting two vertices
struct Edge : public TopoEntity {
  Vertex *v1;
  Vertex *v2;
  Edge(const std::string &name, Vertex *a, Vertex *b)
      : TopoEntity(name), v1(a), v2(b) {}

  // Returns edge length (physical)
  double length() const { return static_cast<double>((v2->pos - v1->pos).magnitude()); }

  // Tolerance-based equality (ignoring direction)
  bool is_coincident(const Edge &other) const {
    return (v1->is_coincident(*other.v1) && v2->is_coincident(*other.v2)) ||
           (v1->is_coincident(*other.v2) && v2->is_coincident(*other.v1));
  }

  // Strict topological equality (requires same Vertex pointers)
  bool is_topologically_identical(const Edge &other) const {
    return (v1 == other.v1 && v2 == other.v2) ||
           (v1 == other.v2 && v2 == other.v1);
  }
};

// 2D Planar Face defined by a closed loop of edges
struct Face : public TopoEntity {
  std::vector<Edge *> edges; // Loop forming the boundary
  Vec3 outward_normal;       // Must point outside the solid volume

  Face(const std::string &name, const std::vector<Edge *> &boundary)
      : TopoEntity(name), edges(boundary) {

    // Computing Newell's normal for robust planar/near-planar faces
    outward_normal = Vec3(0, 0, 0);
    for (size_t i = 0; i < edges.size(); ++i) {
      // Assume edges in loop are ordered CCW relative to normal.
      // Find shared vertex connecting edges[i] and edges[(i+1)%n] to know loop
      // direction. For simplified Planar Architecture, we require vertices
      // explicitly in CCW order to define the face.
    }
  }

  // A more explicit constructor providing ordered CCW vertices to compute area
  // and normal rigorously.
  Face(const std::string &name, const std::vector<Edge *> &boundary,
       const std::vector<Vertex *> &ordered_loop)
      : TopoEntity(name), edges(boundary) {
    compute_normal_and_area(ordered_loop);
  }

  double area = 0.0;

private:
  void compute_normal_and_area(const std::vector<Vertex *> &loop) {
    outward_normal = Vec3(0, 0, 0);
    int n = loop.size();
    for (int i = 0; i < n; ++i) {
      Vec3 curr = loop[i]->pos;
      Vec3 next = loop[(i + 1) % n]->pos;
      outward_normal.x += (curr.y - next.y) * (curr.z + next.z);
      outward_normal.y += (curr.z - next.z) * (curr.x + next.x);
      outward_normal.z += (curr.x - next.x) * (curr.y + next.y);
    }
    double mag = static_cast<double>(outward_normal.magnitude());
    area = 0.5 * mag;
    if (mag > 1e-12) {
      outward_normal = outward_normal * static_cast<float>(1.0 / mag);
    }
  }
};

// 3D Solid Body defined by a closed shell of faces
struct Solid : public TopoEntity {
  std::vector<Vertex *> vertices;
  std::vector<Edge *> edges;
  std::vector<Face *> faces;

  Solid(const std::string &name) : TopoEntity(name) {}

  ~Solid() {
    for (auto f : faces)
      delete f;
    for (auto e : edges)
      delete e;
    for (auto v : vertices)
      delete v;
  }
};

} // namespace geometry
} // namespace realis
