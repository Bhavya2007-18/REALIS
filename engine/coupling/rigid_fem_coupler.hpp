

#pragma once
#include "../dynamics/rigid_body.hpp"
#include "../fem/fem_mesh.hpp"
#include "../constraints/contact_constraint.hpp"
#include "../geometry/contact_generator.hpp"
#include <vector>
#include <memory>

namespace realis {
namespace coupling {

class RigidFEMCoupler {
public:
    
    
    
    static void generate_contacts(
        RigidBody* rigidBody, 
        fem::FEMMesh* mesh, 
        std::vector<std::unique_ptr<Constraint>>& out_constraints,
        std::vector<std::unique_ptr<RigidBody>>& out_proxies 
    );

private:
    static void check_node_collision(
        RigidBody* rb, 
        fem::Node* node, 
        std::vector<std::unique_ptr<Constraint>>& out_constraints,
        std::vector<std::unique_ptr<RigidBody>>& out_proxies
    );
};

} 
} 