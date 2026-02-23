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
    integrator->step(bodies, dt);
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

void World::log_state() const {
  std::cout << "t=" << timestep.get_current_time() << " E=" << compute_energy()
            << std::endl;
}

float World::get_time() const { return timestep.get_current_time(); }

} // namespace realis
