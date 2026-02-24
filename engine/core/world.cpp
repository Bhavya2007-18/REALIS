#include "world.hpp"
#include "../collision/broadphase.hpp"
#include "../collision/narrowphase.hpp"
#include "../dynamics/rigid_body.hpp"
#include "integrator.hpp"
#include <cmath>
#include <iostream>
#include <vector>

namespace realis {

World::World(float dt) : timestep(dt), integrator(nullptr) {}

World::~World() {}

void World::step() {
  float dt = timestep.get_dt();

  // 1. Clear forces
  for (auto *b : bodies) {
    b->clear_forces();
  }

  // 2. Accumulate external forces
  for (auto *b : bodies) {
    if (b->inv_mass > 0) {
      for (auto *f : force_fields) {
        b->apply_force(f->compute_force(*b));
      }
    }
  }

  // Constraints are now solved internally within the Integrator's evaluation
  // of compute_derivatives() to ensure RK4 and Euler get correct forces at each
  // sub-step.

  // 4. Integrate System State
  if (integrator) {
    integrator->step(*this, dt);
  }

  // 5. Detect and Resolve Collisions (Impulses)
  std::vector<Contact> contacts;

  // BroadPhase: Prune distant pairs
  std::vector<BroadPhasePair> potential_pairs = BroadPhase::detect(bodies);

  // NarrowPhase: Generate precise contacts
  for (const auto &pair : potential_pairs) {
    Contact contact = NarrowPhase::generate_contact(pair.a, pair.b);
    if (contact.colliding) {
      contacts.push_back(contact);
    }
  }
  contact_solver.solve_contacts(contacts);

  timestep.advance();
}

void World::add_constraint(Constraint *c) { constraints.push_back(c); }

void World::add_body(RigidBody *body) { bodies.push_back(body); }

void World::remove_body(RigidBody *body) {
  for (auto it = bodies.begin(); it != bodies.end(); ++it) {
    if (*it == body) {
      bodies.erase(it);
      break;
    }
  }
}

void World::add_force_field(ForceField *field) {
  force_fields.push_back(field);
}

void World::set_integrator(Integrator *integ) { integrator = integ; }

float World::compute_energy() const {
  float kinetic = 0.0f;
  float potential = 0.0f;

  for (const auto *b : bodies) {
    // Translational Kinetic: 1/2 m v^2
    if (b->inv_mass > 0) {
      kinetic += 0.5f * b->mass * b->velocity.dot(b->velocity);

      // Rotational Kinetic: 1/2 w^T I w  (All in body frame, invariant under
      // rotation)
      Vec3 Iw = b->inertia_tensor * b->angular_velocity;
      kinetic += 0.5f * b->angular_velocity.dot(Iw);
    }

    // Potential Energy (from fields)
    if (b->inv_mass > 0) {
      for (const auto *f : force_fields) {
        potential += f->compute_potential_energy(*b);
      }
    }
  }

  return kinetic + potential;
}

Vec3 World::compute_linear_momentum() const {
  Vec3 p(0, 0, 0);
  for (const auto *b : bodies) {
    if (b->inv_mass > 0) {
      p = p + b->velocity * b->mass;
    }
  }
  return p;
}

Vec3 World::compute_angular_momentum() const {
  Vec3 L_total(0, 0, 0);
  for (const auto *b : bodies) {
    if (b->inv_mass > 0) {
      // L_body = I_body * w_body
      Vec3 L_body = b->inertia_tensor * b->angular_velocity;

      // L_world = R * L_body
      // Since `orientation` maps local to world, multiplying by quaternion
      // performs rotation:
      Quat q = b->orientation;
      // q * L_body * q^-1
      // Simplified quaternion vector rotation via Quat math mapping natively:
      Quat v_q(0, L_body.x, L_body.y, L_body.z);
      Quat q_inv(q.w, -q.x, -q.y, -q.z); // conjugate of unit quaternion
      Quat v_rot = q * v_q * q_inv;

      Vec3 L_world(v_rot.x, v_rot.y, v_rot.z);
      L_total = L_total + L_world;
    }
  }
  return L_total;
}

// -----------------------------------------------------------------------------
// System State Interface
// -----------------------------------------------------------------------------
std::vector<float> World::get_state() const {
  // State length: 13 floats per body (px, py, pz, vx, vy, vz, qw, qx, qy, qz,
  // wx, wy, wz)
  std::vector<float> state(bodies.size() * 13);

  for (size_t i = 0; i < bodies.size(); ++i) {
    const auto *b = bodies[i];
    size_t offset = i * 13;
    // Translation
    state[offset + 0] = b->position.x;
    state[offset + 1] = b->position.y;
    state[offset + 2] = b->position.z;
    state[offset + 3] = b->velocity.x;
    state[offset + 4] = b->velocity.y;
    state[offset + 5] = b->velocity.z;

    // Rotation
    state[offset + 6] = b->orientation.w;
    state[offset + 7] = b->orientation.x;
    state[offset + 8] = b->orientation.y;
    state[offset + 9] = b->orientation.z;
    state[offset + 10] = b->angular_velocity.x;
    state[offset + 11] = b->angular_velocity.y;
    state[offset + 12] = b->angular_velocity.z;
  }
  return state;
}

void World::set_state(const std::vector<float> &state) {
  if (state.size() != bodies.size() * 13)
    return;

  for (size_t i = 0; i < bodies.size(); ++i) {
    auto *b = bodies[i];
    size_t offset = i * 13;

    // Translation
    b->position.x = state[offset + 0];
    b->position.y = state[offset + 1];
    b->position.z = state[offset + 2];
    b->velocity.x = state[offset + 3];
    b->velocity.y = state[offset + 4];
    b->velocity.z = state[offset + 5];

    // Rotation
    b->orientation.w = state[offset + 6];
    b->orientation.x = state[offset + 7];
    b->orientation.y = state[offset + 8];
    b->orientation.z = state[offset + 9];
    // Enforce rigid body SO(3) normalization independently of integration
    // errors
    b->orientation.normalize();

    b->angular_velocity.x = state[offset + 10];
    b->angular_velocity.y = state[offset + 11];
    b->angular_velocity.z = state[offset + 12];
  }
}

std::vector<float> World::compute_derivatives(const std::vector<float> &state,
                                              float t) {
  // 1. Snapshot current true state
  std::vector<float> current_state = get_state();

  // 2. Load the test state into bodies for physics evaluation
  set_state(state);

  // 3. Clear forces and accumulate new forces based on this test state
  for (auto *b : bodies) {
    b->clear_forces();
    if (b->inv_mass > 0) {
      for (auto *f : force_fields) {
        b->apply_force(f->compute_force(*b));
      }
    }
  }

  // Phase 2A: Solve constraints for this evaluation state so constraint forces
  // are included
  if (!constraints.empty()) {
    constraint_solver.solve(constraints, timestep.get_dt());
  }

  // 4. Assemble derivative vector
  // dq/dt = [v_x, v_y, v_z, F_x/m, F_y/m, F_z/m, q_dot(w,x,y,z), alpha(x,y,z)]
  std::vector<float> derivs(bodies.size() * 13, 0.0f);
  for (size_t i = 0; i < bodies.size(); ++i) {
    auto *b = bodies[i];
    size_t offset = i * 13;

    // --- TRANSLATION ---
    // dx/dt = v
    derivs[offset + 0] = b->velocity.x;
    derivs[offset + 1] = b->velocity.y;
    derivs[offset + 2] = b->velocity.z;

    // dv/dt = F / m
    if (b->inv_mass > 0) {
      Vec3 accel = b->force * b->inv_mass;
      derivs[offset + 3] = accel.x;
      derivs[offset + 4] = accel.y;
      derivs[offset + 5] = accel.z;
    } else {
      derivs[offset + 3] = 0.0f;
      derivs[offset + 4] = 0.0f;
      derivs[offset + 5] = 0.0f;
    }

    // --- ROTATION ---
    // dq/dt = 0.5 * q * (0, w)
    Quat w_pure(0.0f, b->angular_velocity.x, b->angular_velocity.y,
                b->angular_velocity.z);
    Quat q_dot = b->orientation * w_pure;

    derivs[offset + 6] = 0.5f * q_dot.w;
    derivs[offset + 7] = 0.5f * q_dot.x;
    derivs[offset + 8] = 0.5f * q_dot.y;
    derivs[offset + 9] = 0.5f * q_dot.z;

    // dw/dt = I^-1 * (tau - w x (Iw))
    if (b->inv_mass > 0) {
      Vec3 Iw = b->inertia_tensor * b->angular_velocity;
      Vec3 w_x_Iw = b->angular_velocity.cross(Iw);
      Vec3 tau_effective = b->torque - w_x_Iw;
      Vec3 alpha = b->inv_inertia_tensor * tau_effective;

      derivs[offset + 10] = alpha.x;
      derivs[offset + 11] = alpha.y;
      derivs[offset + 12] = alpha.z;
    } else {
      derivs[offset + 10] = 0.0f;
      derivs[offset + 11] = 0.0f;
      derivs[offset + 12] = 0.0f;
    }
  }

  // 5. Restore true state so evaluation didn't corrupt the actual world
  set_state(current_state);

  return derivs;
}

void World::log_state() const {
  std::cout << "t=" << timestep.get_current_time() << " E=" << compute_energy()
            << std::endl;
}

float World::get_time() const { return timestep.get_current_time(); }

} // namespace realis
