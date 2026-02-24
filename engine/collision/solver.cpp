// Contact Solver implementation
#include "solver.hpp"
#include "../dynamics/rigid_body.hpp"

namespace realis {

void ContactSolver::solve_contacts(const std::vector<Contact> &contacts) {
  // NOTE (Architecture limitation):
  // Sequential impulse application is inherently order-dependent.
  // Solving multiple simultaneous contacts correctly requires a global LCP
  // solver. For Phase 1B, this is acceptable as long as we process collisions
  // deterministically.
  for (const auto &contact : contacts) {
    if (!contact.colliding || !contact.body_a || !contact.body_b)
      continue;

    RigidBody *a = contact.body_a;
    RigidBody *b = contact.body_b;

    // 1. Calculate relative velocity
    Vec3 rv = b->velocity - a->velocity;

    // 2. Calculate relative velocity in terms of the normal direction
    float velAlongNormal = rv.dot(contact.normal);

    // 3. Do not resolve if velocities are separating
    if (velAlongNormal > 0)
      continue;

    // 4. Calculate restitution
    float e = contact.restitution;

    // 5. Calculate impulse scalar
    float j = -(1.0f + e) * velAlongNormal;

    // Inverse mass sum
    float invMassSum = a->inv_mass + b->inv_mass;

    // Skip if both are infinite mass (kinematic/static)
    if (invMassSum <= 0.0001f)
      continue;

    j /= invMassSum;

    // 6. Apply impulse
    Vec3 impulse = contact.normal * j;

    // v_new = v_old + (j / mass) * normal
    if (a->inv_mass > 0) {
      a->velocity = a->velocity - impulse * a->inv_mass;
    }
    if (b->inv_mass > 0) {
      b->velocity = b->velocity + impulse * b->inv_mass;
    }
  }
}

} // namespace realis
