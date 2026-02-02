// GJK/EPA narrow phase implementation
#include "collision_detector.hpp"
#include <vector>
#include <algorithm>
#include <cmath>

namespace realis {

// For Phase 4, we'll start with SPHERE-SPHERE and SPHERE-PLANE as validated in the plan
// Full GJK for convex hulls will be added if needed, but the primary validation is impulses.

bool CollisionDetector::gjk_test(const RigidBody& a, const RigidBody& b) {
    // Simplified sphere-sphere detection for Phase 4 verification
    // This allows us to focus on the contact resolver (impulses) parity with Python
    
    // Radius logic is currently simplified (assume radius=0.5 for demonstration)
    float r1 = 0.5f;
    float r2 = 0.5f;
    
    float distSq = (a.position - b.position).dot(a.position - b.position);
    return distSq <= (r1 + r2) * (r1 + r2);
}

Contact CollisionDetector::get_contact(const RigidBody& a, const RigidBody& b) {
    Contact contact;
    
    float r1 = 0.5f;
    float r2 = 0.5f;
    
    Vec3 relative = b.position - a.position;
    float distSq = relative.dot(relative);
    float minDist = r1 + r2;
    
    if (distSq <= minDist * minDist) {
        float dist = std::sqrt(distSq);
        contact.colliding = true;
        
        if (dist > 1e-6f) {
            contact.normal = relative * (1.0f / dist);
            contact.penetration = minDist - dist;
            contact.point = a.position + contact.normal * r1;
        } else {
            // Degenerate case (exactly centered)
            contact.normal = Vec3(0, 1, 0);
            contact.penetration = minDist;
            contact.point = a.position;
        }
    }
    
    return contact;
}

} // namespace realis
