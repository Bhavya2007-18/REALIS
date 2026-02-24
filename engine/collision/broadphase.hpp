// Broad phase collision detection
#pragma once
#include <vector>

namespace realis {

class RigidBody;

struct BroadPhasePair {
  RigidBody *a;
  RigidBody *b;

  BroadPhasePair(RigidBody *body_a, RigidBody *body_b) : a(body_a), b(body_b) {}
};

class BroadPhase {
public:
  static std::vector<BroadPhasePair>
  detect(const std::vector<RigidBody *> &bodies);
};

} // namespace realis