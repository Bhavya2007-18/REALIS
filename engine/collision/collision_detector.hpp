// Narrow phase collision detection
#pragma once
#include "contact.hpp"
#include "../dynamics/rigid_body.hpp"

namespace realis {

class CollisionDetector {
public:
    // GJK detection (boolean)
    static bool gjk_test(const RigidBody& a, const RigidBody& b);
    
    // EPA for penetration info
    static Contact get_contact(const RigidBody& a, const RigidBody& b);
};

} // namespace realis
