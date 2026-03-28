


#pragma once
#include "../math/vec3.hpp"
#include <string>
#include <vector>


namespace realis {
namespace geometry {



struct Tolerances {
  static constexpr double vertex_weld = 1e-6; 
  static constexpr double coincident = 1e-6;
  static constexpr double coplanar = 1e-5;
  static constexpr double minimum_area =
      1e-8; 
};


struct TopoEntity {
  std::string id; 
  TopoEntity() = default;
  explicit TopoEntity(std::string name) : id(std::move(name)) {}
  virtual ~TopoEntity() = default;
};


struct Vertex : public TopoEntity {
  Vec3 pos;
  Vertex(const std::string &name, const Vec3 &p) : TopoEntity(name), pos(p) {}

  
  bool is_coincident(const Vertex &other) const {
    Vec3 diff = pos - other.pos;
    float dist_sq = diff.dot(diff);
    return dist_sq < static_cast<float>(Tolerances::vertex_weld * Tolerances::vertex_weld);
  }
};


struct Edge : public TopoEntity {
  Vertex *v1;
  Vertex *v2;
  Edge(const std::string &name, Vertex *a, Vertex *b)
      : TopoEntity(name), v1(a), v2(b) {}

  
  double length() const { return static_cast<double>((v2->pos - v1->pos).magnitude()); }

  
  bool is_coincident(const Edge &other) const {
    return (v1->is_coincident(*other.v1) && v2->is_coincident(*other.v2)) ||
           (v1->is_coincident(*other.v2) && v2->is_coincident(*other.v1));
  }

  
  bool is_topologically_identical(const Edge &other) const {
    return (v1 == other.v1 && v2 == other.v2) ||
           (v1 == other.v2 && v2 == other.v1);
  }
};


struct Face : public TopoEntity {
  std::vector<Edge *> edges; 
  Vec3 outward_normal;       

  Face(const std::string &name, const std::vector<Edge *> &boundary)
      : TopoEntity(name), edges(boundary) {

    
    outward_normal = Vec3(0, 0, 0);
    for (size_t i = 0; i < edges.size(); ++i) {
      
      
      
      
    }
  }

  
  
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

} 
} 