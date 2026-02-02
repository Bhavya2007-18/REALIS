// Impulse-based contact resolution implementation
#include "contact_resolver.hpp"
#include <cmath>
#include <algorithm>

namespace realis {

void ContactResolver::resolve_contact(RigidBody& a, RigidBody& b, const Contact& contact) {
    // 1. Resolve penetration (Positional Correction)
    // To prevent "pulsing" or overlapping, we push them apart slightly
    const float percent = 0.2f; // penetration allowance
    const float slop = 0.01f;    // penetration slop
    
    Vec3 correction = contact.normal * (std::max(contact.penetration - slop, 0.0f) / (a.inv_mass + b.inv_mass) * percent);
    a.position = a.position - correction * a.inv_mass;
    b.position = b.position + correction * b.inv_mass;

    // 2. Resolve velocity (Impulse Resolution)
    // Calculate relative velocity along the normal
    Vec3 relative_velocity = b.velocity - a.velocity;
    float velocity_along_normal = relative_velocity.dot(contact.normal);
    
    // Do not resolve if velocities are separating
    if (velocity_along_normal > 0) return;
    
    // Restitution (elasticity) - e=1 for elastic, e=0 for inelastic
    float e = 0.5f; // Should be a property of the bodies/material
    
    // Impulse magnitude: j = -(1+e)*v_rel / (1/m1 + 1/m2)
    float j = -(1.0f + e) * velocity_along_normal;
    j /= (a.inv_mass + b.inv_mass);
    
    // Apply impulse
    Vec3 impulse = contact.normal * j;
    a.velocity = a.velocity - impulse * a.inv_mass;
    b.velocity = b.velocity + impulse * b.inv_mass;
}

} // namespace realis
