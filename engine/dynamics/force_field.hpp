#pragma once
#include "../math/vec3.hpp"

namespace realis {

class RigidBody; // Forward declare

class ForceField {
public:
    virtual ~ForceField() = default;
    
    // Compute the force applied by this field on a specific body
    virtual Vec3 compute_force(const RigidBody& body) const = 0;
    
    // Compute the potential energy for a specific body in this field
    virtual float compute_potential_energy(const RigidBody& body) const = 0;
};

} // namespace realis
