// Numerical integrators
#include "integrator.hpp"

namespace realis {

void SemiImplicitEuler::step(std::vector<RigidBody *> &bodies, float dt) {
  for (auto *body : bodies) {
    if (body->inv_mass <= 0.0f)
      continue;

    Vec3 acceleration = body->force * body->inv_mass;
    body->velocity = body->velocity + acceleration * dt;
    body->position = body->position + body->velocity * dt;

    // Simple rotation update
    Quat qw(0, body->angular_velocity.x, body->angular_velocity.y,
            body->angular_velocity.z);
    Quat q_dot = qw * body->orientation;

    body->orientation.w += q_dot.w * 0.5f * dt;
    body->orientation.x += q_dot.x * 0.5f * dt;
    body->orientation.y += q_dot.y * 0.5f * dt;
    body->orientation.z += q_dot.z * 0.5f * dt;
    body->orientation.normalize();
  }
}

void ForwardEuler::step(std::vector<RigidBody *> &bodies, float dt) {
  for (auto *body : bodies) {
    if (body->inv_mass <= 0.0f)
      continue;

    Vec3 acceleration = body->force * body->inv_mass;
    body->position = body->position + body->velocity * dt;
    body->velocity = body->velocity + acceleration * dt;

    Quat qw(0, body->angular_velocity.x, body->angular_velocity.y,
            body->angular_velocity.z);
    Quat q_dot = qw * body->orientation;

    body->orientation.w += q_dot.w * 0.5f * dt;
    body->orientation.x += q_dot.x * 0.5f * dt;
    body->orientation.y += q_dot.y * 0.5f * dt;
    body->orientation.z += q_dot.z * 0.5f * dt;
    body->orientation.normalize();
  }
}

} // namespace realis
