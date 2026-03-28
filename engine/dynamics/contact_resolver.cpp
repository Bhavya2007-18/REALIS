
#include "contact_resolver.hpp"
#include <cmath>
#include <algorithm>

namespace realis {

void ContactResolver::resolve_contact(RigidBody& a, RigidBody& b, const Contact& contact) {
    
    
    const float percent = 0.2f; 
    const float slop = 0.01f;    
    
    Vec3 correction = contact.normal * (std::max(contact.penetration - slop, 0.0f) / (a.inv_mass + b.inv_mass) * percent);
    a.position = a.position - correction * a.inv_mass;
    b.position = b.position + correction * b.inv_mass;

    
    
    Vec3 relative_velocity = b.velocity - a.velocity;
    float velocity_along_normal = relative_velocity.dot(contact.normal);
    
    
    if (velocity_along_normal > 0) return;
    
    
    float e = 0.5f; 
    
    
    float j = -(1.0f + e) * velocity_along_normal;
    j /= (a.inv_mass + b.inv_mass);
    
    
    Vec3 impulse = contact.normal * j;
    a.velocity = a.velocity - impulse * a.inv_mass;
    b.velocity = b.velocity + impulse * b.inv_mass;
}

} 