// World - simulation container
#include "world.hpp"
#include "../dynamics/rigid_body.hpp"
#include "integrator.hpp"
#include <cmath>
#include <iostream>

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

  // 3. Integrate System State
  if (integrator) {
    integrator->step(*this, dt);
  }

  // 4. Solve Constraints
  if (!constraints.empty()) {
    constraint_solver.solve(constraints, dt);
  }

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
  float total_KE = 0.0f;
  float total_PE = 0.0f;

  for (auto *b : bodies) {
    float v_squared = b->velocity.dot(b->velocity);
    total_KE += 0.5f * b->mass * v_squared;

    for (auto *f : force_fields) {
      total_PE += f->compute_potential_energy(*b);
    }
  }

  return total_KE + total_PE;
}

// -----------------------------------------------------------------------------
// System State Interface
// -----------------------------------------------------------------------------
std::vector<float> World::get_state() const {
  // State length: 6 floats per body (px, py, pz, vx, vy, vz)
  std::vector<float> state(bodies.size() * 6);

  for (size_t i = 0; i < bodies.size(); ++i) {
    const auto *b = bodies[i];
    size_t offset = i * 6;
    state[offset + 0] = b->position.x;
    state[offset + 1] = b->position.y;
    state[offset + 2] = b->position.z;
    state[offset + 3] = b->velocity.x;
    state[offset + 4] = b->velocity.y;
    state[offset + 5] = b->velocity.z;
  }
  return state;
}

void World::set_state(const std::vector<float> &state) {
  if (state.size() != bodies.size() * 6)
    return;

  for (size_t i = 0; i < bodies.size(); ++i) {
    auto *b = bodies[i];
    size_t offset = i * 6;
    b->position.x = state[offset + 0];
    b->position.y = state[offset + 1];
    b->position.z = state[offset + 2];
    b->velocity.x = state[offset + 3];
    b->velocity.y = state[offset + 4];
    b->velocity.z = state[offset + 5];
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

  // 4. Assemble derivative vector
  // dq/dt = [v_x, v_y, v_z, F_x/m, F_y/m, F_z/m]
  std::vector<float> derivs(bodies.size() * 6, 0.0f);
  for (size_t i = 0; i < bodies.size(); ++i) {
    auto *b = bodies[i];
    size_t offset = i * 6;

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
      // Kinematic or static object
      derivs[offset + 3] = 0.0f;
      derivs[offset + 4] = 0.0f;
      derivs[offset + 5] = 0.0f;
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
