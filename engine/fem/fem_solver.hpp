


#pragma once
#include "fem_mesh.hpp"
#include "../core/timestep.hpp"
#include <vector>
#include <cmath>

namespace realis {
namespace fem {

class FEMSolver {
public:
    FEMMesh* mesh;
    float damping_factor = 0.5f; 
    
    explicit FEMSolver(FEMMesh* m) : mesh(m) {}

    void step(float dt, const continuum::ConstitutiveLaw& material) {
        
        mesh->clear_forces();
        
        
        for (auto& element : mesh->elements) {
            element->compute_forces(material);
        }
        
        
        
        
        
        for (auto& node : mesh->nodes) {
            if (node->is_fixed) continue; 
            
            
            Vec3 damping = node->velocity * -damping_factor * node->mass;
            Vec3 total_force = node->force + damping;
            
            
            Vec3 gravity(0, -9.81f, 0);
            total_force = total_force + (gravity * node->mass); 
            
            Vec3 accel = total_force * (1.0f / node->mass);
            
            node->velocity = node->velocity + accel * dt;
            node->position = node->position + node->velocity * dt;
        }
    }
    
    
    bool check_stability() const {
        for (const auto& node : mesh->nodes) {
             if (node->position.dot(node->position) > 1e6f || 
                 std::isnan(node->position.x)) {
                 return false;
             }
        }
        return true;
    }
};

} 
} 