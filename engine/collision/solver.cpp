// Contact Solver implementation
#include "solver.hpp"
#include "../dynamics/rigid_body.hpp"
#include <algorithm>
#include <cmath>

namespace realis {

void ContactSolver::solve_contacts(std::vector<Contact> &contacts) {
  if (contacts.empty())
    return;

  const int NUM_ITERATIONS = 10;

  for (int iter = 0; iter < NUM_ITERATIONS; ++iter) {
    for (auto &contact : contacts) {
      if (!contact.colliding || !contact.body_a || !contact.body_b)
        continue;

      RigidBody *a = contact.body_a;
      RigidBody *b = contact.body_b;

      float invMassSum = a->inv_mass + b->inv_mass;
      if (invMassSum <= 0.0001f)
        continue;

      // 1. Calculate relative velocity
      Vec3 rv = b->velocity - a->velocity;

      // --- NORMAL IMPULSE ---
      float velAlongNormal = rv.dot(contact.normal);

      // Only compute bounce on first iteration? Or just incorporate restitution
      // once Standard sequential impulse bias velocity:
      float bias = 0.0f;
      // We apply restitution bias only if velocity is significantly separating
      // to avoid jitter
      if (velAlongNormal < -0.1f) {
        bias = contact.restitution * velAlongNormal;
      }

      float normal_j = -(velAlongNormal + bias) / invMassSum;

      // Accumulate normal impulse
      float old_normal_impulse = contact.accumulated_normal_impulse;
      contact.accumulated_normal_impulse =
          std::max(old_normal_impulse + normal_j, 0.0f);
      float iter_normal_j =
          contact.accumulated_normal_impulse - old_normal_impulse;

      Vec3 impulse_normal = contact.normal * iter_normal_j;

      // Apply normal impulse
      if (a->inv_mass > 0)
        a->velocity = a->velocity - impulse_normal * a->inv_mass;
      if (b->inv_mass > 0)
        b->velocity = b->velocity + impulse_normal * b->inv_mass;

      // 2. Re-evaluate relative velocity for friction
      rv = b->velocity - a->velocity;

      // --- FRICTION IMPULSE ---
      // Tangent 1
      float rv_t1 = rv.dot(contact.tangent1);
      float jt1 = -rv_t1 / invMassSum;

      // Tangent 2
      float rv_t2 = rv.dot(contact.tangent2);
      float jt2 = -rv_t2 / invMassSum;

      // Accumulate and clamp friction impulses
      float max_friction =
          contact.friction * contact.accumulated_normal_impulse;

      // Tangent 1 limit
      float old_tangent1_impulse = contact.accumulated_tangent1_impulse;
      contact.accumulated_tangent1_impulse = std::max(
          -max_friction, std::min(old_tangent1_impulse + jt1, max_friction));
      float iter_jt1 =
          contact.accumulated_tangent1_impulse - old_tangent1_impulse;

      // Tangent 2 limit
      float old_tangent2_impulse = contact.accumulated_tangent2_impulse;
      contact.accumulated_tangent2_impulse = std::max(
          -max_friction, std::min(old_tangent2_impulse + jt2, max_friction));
      float iter_jt2 =
          contact.accumulated_tangent2_impulse - old_tangent2_impulse;

      // Apply friction impulse
      Vec3 impulse_friction =
          contact.tangent1 * iter_jt1 + contact.tangent2 * iter_jt2;

      if (a->inv_mass > 0)
        a->velocity = a->velocity - impulse_friction * a->inv_mass;
      if (b->inv_mass > 0)
        b->velocity = b->velocity + impulse_friction * b->inv_mass;
    }
  }
}

} // namespace realis
