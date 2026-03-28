
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

      
      Vec3 rv = b->velocity - a->velocity;

      
      float velAlongNormal = rv.dot(contact.normal);

      
      
      float bias = 0.0f;
      
      
      if (velAlongNormal < -0.1f) {
        bias = contact.restitution * velAlongNormal;
      }

      float normal_j = -(velAlongNormal + bias) / invMassSum;

      
      float old_normal_impulse = contact.accumulated_normal_impulse;
      contact.accumulated_normal_impulse =
          std::max(old_normal_impulse + normal_j, 0.0f);
      float iter_normal_j =
          contact.accumulated_normal_impulse - old_normal_impulse;

      Vec3 impulse_normal = contact.normal * iter_normal_j;

      
      if (a->inv_mass > 0)
        a->velocity = a->velocity - impulse_normal * a->inv_mass;
      if (b->inv_mass > 0)
        b->velocity = b->velocity + impulse_normal * b->inv_mass;

      
      rv = b->velocity - a->velocity;

      
      
      float rv_t1 = rv.dot(contact.tangent1);
      float jt1 = -rv_t1 / invMassSum;

      
      float rv_t2 = rv.dot(contact.tangent2);
      float jt2 = -rv_t2 / invMassSum;

      
      float max_friction =
          contact.friction * contact.accumulated_normal_impulse;

      
      float old_tangent1_impulse = contact.accumulated_tangent1_impulse;
      contact.accumulated_tangent1_impulse = std::max(
          -max_friction, std::min(old_tangent1_impulse + jt1, max_friction));
      float iter_jt1 =
          contact.accumulated_tangent1_impulse - old_tangent1_impulse;

      
      float old_tangent2_impulse = contact.accumulated_tangent2_impulse;
      contact.accumulated_tangent2_impulse = std::max(
          -max_friction, std::min(old_tangent2_impulse + jt2, max_friction));
      float iter_jt2 =
          contact.accumulated_tangent2_impulse - old_tangent2_impulse;

      
      Vec3 impulse_friction =
          contact.tangent1 * iter_jt1 + contact.tangent2 * iter_jt2;

      if (a->inv_mass > 0)
        a->velocity = a->velocity - impulse_friction * a->inv_mass;
      if (b->inv_mass > 0)
        b->velocity = b->velocity + impulse_friction * b->inv_mass;
    }
  }
}

} 