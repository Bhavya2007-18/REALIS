#pragma once
#include "../math/vec3.hpp"

namespace realis {

class RigidBody; 

class ForceField {
public:
    virtual ~ForceField() = default;
    
    
    virtual Vec3 compute_force(const RigidBody& body) const = 0;
    
    
    virtual float compute_potential_energy(const RigidBody& body) const = 0;
};

} 