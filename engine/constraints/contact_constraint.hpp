// Contact Constraint
// Enforces non-penetration and friction
#pragma once
#include "constraint.hpp"
#include "../geometry/contact_generator.hpp" // For ContactPoint

namespace realis {

class ContactConstraint : public Constraint {
public:
    geometry::ContactPoint contact;
    
    ContactConstraint(RigidBody* a, RigidBody* b, const geometry::ContactPoint& cp);
    
    void pre_step(float dt) override;
};

class FrictionConstraint : public Constraint {
public:
    geometry::ContactPoint contact;
    Vec3 tangent;
    float friction_coeff;
    ContactConstraint* normal_constraint; // To clamp against normal load
    
    FrictionConstraint(RigidBody* a, RigidBody* b, const geometry::ContactPoint& cp, 
                       const Vec3& tan, float mu, ContactConstraint* nc);
                       
    void pre_step(float dt) override;
};

} // namespace realis
