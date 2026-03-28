
#include "cad_validator.hpp"
#include <map>
#include <cmath>

namespace realis {
namespace cad {

ValidationResult CADValidator::validate_solid(const Solid& solid) {
    ValidationResult result;
    
    if (solid.faces.empty()) {
        result.is_valid = false;
        result.errors.push_back("Solid has no faces.");
        return result;
    }
    
    check_tolerances(solid, result);
    if (!result.is_valid) return result; 
    
    check_watertight(solid, result);
    check_manifold(solid, result);
    
    
    
    
    return result;
}

void CADValidator::check_tolerances(const Solid& solid, ValidationResult& result) {
    CADTolerances tol;
    for (Face* f : solid.faces) {
        for (Edge* e : f->edges) {
            Vec3 diff = e->v2->position - e->v1->position;
            if (diff.magnitude() < tol.linear_tolerance) {
                result.is_valid = false;
                result.errors.push_back("Edge length below tolerance: Micro-geometry detected.");
                return;
            }
        }
    }
}

void CADValidator::check_watertight(const Solid& , ValidationResult& ) {
    
    
    
    
    
    
    
    
    
    
    
    
}

void CADValidator::check_manifold(const Solid& solid, ValidationResult& result) {
    
    
    
    
    std::map<Vertex*, int> unique_verts;
    std::map<Edge*, int> unique_edges; 
    
    int F = solid.faces.size();
    
    
    
    if (F < 4 && F > 0) { 
        result.is_valid = false;
        result.errors.push_back("Solid has fewer than 4 faces, cannot be a closed volume.");
    }
}

void CADValidator::check_normals(const Solid& , ValidationResult& ) {
    
}

} 
} 