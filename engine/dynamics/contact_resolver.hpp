// Impulse-based contact resolution
#pragma once
#include "contact.hpp"
#include "../dynamics/rigid_body.hpp"

namespace realis {

class ContactResolver {
public:
    static void resolve_contact(RigidBody& a, RigidBody& b, const Contact& contact);
};

} // namespace realis
