// Narrow phase collision detection
#pragma once
#include "../dynamics/rigid_body.hpp"
#include "contact.hpp"
#include <cstddef>

namespace realis {

class NarrowPhase {
public:
  static Contact generate_contact(RigidBody *a, RigidBody *b);
};

} // namespace realis