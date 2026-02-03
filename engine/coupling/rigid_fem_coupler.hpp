// Rigid-FEM Coupler
// Manages interactions between Rigid Bodies and Deformable Meshes
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
    // Generate constraints for Rigid-FEM collision
    // Returns a list of constraints handling the interaction
    // The caller (World) is responsible for solving them and deleting them
    static void generate_contacts(
        RigidBody* rigidBody, 
        fem::FEMMesh* mesh, 
        std::vector<std::unique_ptr<Constraint>>& out_constraints,
        std::vector<std::unique_ptr<RigidBody>>& out_proxies // To keep proxies alive during solve
    );

private:
    static void check_node_collision(
        RigidBody* rb, 
        fem::Node* node, 
        std::vector<std::unique_ptr<Constraint>>& out_constraints,
        std::vector<std::unique_ptr<RigidBody>>& out_proxies
    );
};

} // namespace coupling
} // namespace realis
