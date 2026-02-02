// Contact information
#pragma once
#include "../math/vec3.hpp"

namespace realis {

struct Contact {
    Vec3 normal;         // Direction of collision (from A to B)
    float penetration;   // Distance of overlap
    Vec3 point;          // Contact point in world space
    
    bool colliding;      // Validation flag
    
    Contact() : penetration(0), colliding(false) {}
};

} // namespace realis
