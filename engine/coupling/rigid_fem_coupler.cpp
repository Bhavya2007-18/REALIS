
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
    
    
    
    for (auto& node : mesh->nodes) {
        
        
        
        check_node_collision(rigidBody, node.get(), out_constraints, out_proxies);
    }
}

void RigidFEMCoupler::check_node_collision(
    RigidBody* rb, 
    fem::Node* node, 
    std::vector<std::unique_ptr<Constraint>>& out_constraints,
    std::vector<std::unique_ptr<RigidBody>>& out_proxies
) {
    
    
    Mat3 R = rb->orientation.to_mat3();
    Mat3 RT = R.transpose();
    Vec3 p_local = RT * (node->position - rb->position);
    
    
    
    
    
    bool inside = false;
    float penetration = 0.0f;
    Vec3 normal; 
    
    if (rb->shape->type == geometry::ShapeType::SPHERE) {
        auto sphere = static_cast<geometry::Sphere*>(rb->shape);
        float distSq = p_local.dot(p_local);
        if (distSq < sphere->radius * sphere->radius) {
            inside = true;
            float dist = std::sqrt(distSq);
            penetration = sphere->radius - dist;
            normal = (R * p_local) * (1.0f / dist); 
        }
    }
    
    

    if (inside) {
        
        
        auto proxy = std::make_unique<RigidBody>();
        proxy->position = node->position;
        proxy->velocity = node->velocity;
        proxy->mass = node->mass;
        proxy->inv_mass = (node->mass > 0) ? 1.0f / node->mass : 0.0f;
        
        
        
        
        geometry::ContactPoint cp;
        cp.position = node->position;
        cp.normal = normal;
        cp.penetration = penetration;
        
        
        auto c = std::make_unique<ContactConstraint>(rb, proxy.get(), cp);
        
        
        out_constraints.push_back(std::move(c));
        out_proxies.push_back(std::move(proxy));
        
        
        
        
        
    }
}

} 
} 