

#pragma once
#include <vector>
#include <string>
#include "../math/vec3.hpp"

namespace realis {
namespace cad {


struct CADTolerances {
    float linear_tolerance = 1e-4f;  
    float angular_tolerance = 1e-3f; 
};

enum class TopoType {
    VERTEX,
    EDGE,
    FACE,
    SOLID,
    COMPOUND
};


struct TopoDS_Shape {
    TopoType type;
    std::string id;
    
    virtual ~TopoDS_Shape() = default;
    TopoDS_Shape(TopoType t) : type(t) {}
};

struct Vertex : public TopoDS_Shape {
    Vec3 position;
    
    Vertex(const Vec3& p) : TopoDS_Shape(TopoType::VERTEX), position(p) {}
};

struct Edge : public TopoDS_Shape {
    Vertex* v1;
    Vertex* v2;
    
    
    
    Edge(Vertex* start, Vertex* end) : TopoDS_Shape(TopoType::EDGE), v1(start), v2(end) {}
};

struct Face : public TopoDS_Shape {
    std::vector<Edge*> edges; 
    Vec3 normal; 
    
    Face() : TopoDS_Shape(TopoType::FACE) {}
};

struct Solid : public TopoDS_Shape {
    std::vector<Face*> faces;
    bool is_closed;
    
    Solid() : TopoDS_Shape(TopoType::SOLID), is_closed(false) {}
};

} 
} 