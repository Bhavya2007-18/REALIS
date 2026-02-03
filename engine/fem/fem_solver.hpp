// FEM Explicit Solver
// Time integration for deformable bodies
// Uses Symplectic Euler (Semi-implicit) or Central Difference
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
    float damping_factor = 0.5f; // Simple damping for stability
    
    explicit FEMSolver(FEMMesh* m) : mesh(m) {}

    void step(float dt, const continuum::ConstitutiveLaw& material) {
        // 1. Clear Forces
        mesh->clear_forces();
        
        // 2. Compute Internal Forces (System Stiffness)
        for (auto& element : mesh->elements) {
            element->compute_forces(material);
        }
        
        // 3. Integrate (Symplectic Euler)
        // v_{t+1} = v_t + (f/m) * dt
        // x_{t+1} = x_t + v_{t+1} * dt
        
        for (auto& node : mesh->nodes) {
            if (node->is_fixed) continue; // Boundary condition
            
            // Apply Damping force (f_d = -c * v)
            Vec3 damping = node->velocity * -damping_factor * node->mass;
            Vec3 total_force = node->force + damping;
            
            // Gravity? (Optional, can be added externally or here)
            Vec3 gravity(0, -9.81f, 0);
            total_force = total_force + (gravity * node->mass); // F = ma
            
            Vec3 accel = total_force * (1.0f / node->mass);
            
            node->velocity = node->velocity + accel * dt;
            node->position = node->position + node->velocity * dt;
        }
    }
    
    // Safety check
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

} // namespace fem
} // namespace realis
