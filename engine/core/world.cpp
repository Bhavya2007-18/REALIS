// World - simulation container
// Ported from: physics_lab/kinematics/point_motion.py (simulate_projectile_motion)

#include "world.hpp"
#include "integrator.hpp"
#include "../dynamics/rigid_body.hpp"
#include <cmath>
#include <iostream>

namespace realis {

World::World(float dt) 
    : timestep(dt)
    , position(0.0f, 0.0f, 0.0f)
    , velocity(0.0f, 0.0f, 0.0f)
    , mass(1.0f)
    , gravity(0.0f, -9.81f, 0.0f)  // Standard gravity
{
}

void World::step() {
    float dt = timestep.get_dt();
    
    // 1. Point Mass Integration (Legacy)
    Vec3 accel = gravity;
    velocity = velocity + accel * dt;
    position = position + velocity * dt;
    
    // 2. Rigid Body Integration
    // Explicit Euler for velocity, Symplectic for position
    for (auto* b : bodies) {
        if (b->inv_mass > 0) { // Dynamic
            // F = mg (plus others if applied)
            Vec3 force = gravity * b->mass; // Simple gravity only for now
            // v += (F/m) * dt
            b->velocity = b->velocity + (force * b->inv_mass) * dt;
            b->position = b->position + b->velocity * dt;
            
            // Rotation? Need torque. Assuming zero torque for simple gravity falling.
            // b->orientation integration matches phase 6 logic.
        }
    }
    
    // 3. Solve Constraints
    // Need to collect all constraints (Persistent + Contact)
    // For Phase 9 Demos, we will rely on external contact generators adding to `constraints`
    // OR World needs to run collision detection.
    // For now, solve registered constraints.
    if (!constraints.empty()) {
        constraint_solver.solve(constraints, dt);
    }
    
    timestep.advance();
}

void World::add_constraint(Constraint* c) {
    constraints.push_back(c);
}

void World::add_body(RigidBody* body) {
    bodies.push_back(body);
}

void World::remove_body(RigidBody* body) {
    // Linear scan remove
    for (auto it = bodies.begin(); it != bodies.end(); ++it) {
        if (*it == body) {
            bodies.erase(it);
            break;
        }
    }
}

float World::compute_energy() const {
    // Kinetic energy: KE = 0.5 * m * v²
    float v_squared = velocity.dot(velocity);
    float KE = 0.5f * mass * v_squared;
    
    // Potential energy: PE = m * g * h (height above reference)
    // Reference is y=0, gravity magnitude is 9.81
    float PE = mass * 9.81f * position.y;
    
    // Total energy
    return KE + PE;
}

void World::log_state() const {
    std::cout << "t=" << timestep.get_current_time() 
              << " pos=(" << position.x << ", " << position.y << ", " << position.z << ")"
              << " vel=(" << velocity.x << ", " << velocity.y << ", " << velocity.z << ")"
              << " E=" << compute_energy() << std::endl;
}

void World::set_position(const Vec3& pos) {
    position = pos;
}

void World::set_velocity(const Vec3& vel) {
    velocity = vel;
}

Vec3 World::get_position() const {
    return position;
}

Vec3 World::get_velocity() const {
    return velocity;
}

float World::get_time() const {
    return timestep.get_current_time();
}

} // namespace realis
