// Narrow phase collision detection
#pragma once
#include "../dynamics/rigid_body.hpp"
#include "contact.hpp"


namespace realis {

class CollisionDetector {
public:
  // GJK detection (boolean)
  static bool gjk_test(RigidBody *a, RigidBody *b);

  // EPA for penetration info
  static Contact get_contact(RigidBody *a, RigidBody *b);
};

} // namespace realis
