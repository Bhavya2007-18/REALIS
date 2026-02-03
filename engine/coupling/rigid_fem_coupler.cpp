// Rigid-FEM Coupler Implementation
#include "rigid_fem_coupler.hpp"
#include "../geometry/sphere.hpp" 
#include "../geometry/box.hpp"

namespace realis {
namespace coupling {

void RigidFEMCoupler::generate_contacts(
    RigidBody* rigidBody, 
    fem::FEMMesh* mesh, 
    std::vector<std::unique_ptr<Constraint>>& out_constraints,
    std::vector<std::unique_ptr<RigidBody>>& out_proxies
) {
    if (!rigidBody || !rigidBody->shape) return;
    
    // Naive Broadphase: Check every surface node
    // For Phase 7 validation, this suffices for small meshes.
    for (auto& node : mesh->nodes) {
        // Optimization: AABB check first
        // ...
        
        check_node_collision(rigidBody, node.get(), out_constraints, out_proxies);
    }
}

void RigidFEMCoupler::check_node_collision(
    RigidBody* rb, 
    fem::Node* node, 
    std::vector<std::unique_ptr<Constraint>>& out_constraints,
    std::vector<std::unique_ptr<RigidBody>>& out_proxies
) {
    // Transform Node to RigidBody Local Space
    // p_local = R^T * (p_world - pos)
    Mat3 R = rb->orientation.to_mat3();
    Mat3 RT = R.transpose();
    Vec3 p_local = RT * (node->position - rb->position);
    
    // Check against shape (SDF logic needed preferably)
    // Using Support function for convex shapes is for separation, 
    // for containment we need SDF or simple primitive checks.
    
    bool inside = false;
    float penetration = 0.0f;
    Vec3 normal; // Contact normal pointing OUT of rigid body
    
    if (rb->shape->type == geometry::ShapeType::SPHERE) {
        auto sphere = static_cast<geometry::Sphere*>(rb->shape);
        float distSq = p_local.dot(p_local);
        if (distSq < sphere->radius * sphere->radius) {
            inside = true;
            float dist = std::sqrt(distSq);
            penetration = sphere->radius - dist;
            normal = (R * p_local) * (1.0f / dist); // Rotate normal back to world
        }
    }
    // Add BOX support if needed for demos
    // ...

    if (inside) {
        // Create Proxy RigidBody for the Node
        // This allows us to use the existing Solver logic
        auto proxy = std::make_unique<RigidBody>();
        proxy->position = node->position;
        proxy->velocity = node->velocity;
        proxy->mass = node->mass;
        proxy->inv_mass = (node->mass > 0) ? 1.0f / node->mass : 0.0f;
        
        // Proxy has no rotation for a point node
        
        // Create Constraint
        geometry::ContactPoint cp;
        cp.position = node->position;
        cp.normal = normal;
        cp.penetration = penetration;
        
        // Constraint: RigidBody vs Proxy
        auto c = std::make_unique<ContactConstraint>(rb, proxy.get(), cp);
        
        // Store
        out_constraints.push_back(std::move(c));
        out_proxies.push_back(std::move(proxy));
        
        // NOTE: After solver step, we must sync Proxy velocity back to Node!
        // This requires a post-solve callback or we modify the World loop.
        // For Phase 7 Part D, we establish the Structure.
        // The World loop needs to handle this sync.
    }
}

} // namespace coupling
} // namespace realis
