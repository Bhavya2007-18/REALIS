// World - simulation container
// Ported from: physics_lab/kinematics/point_motion.py (simulate_projectile_motion)

#include "world.hpp"
#include "integrator.hpp"
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
    // Calculate acceleration (F = ma, so a = F/m)
    Vec3 acceleration = gravity;  // Only gravity for now (mass=1 simplifies to a=g)
    
    // Semi-implicit Euler integration
    integrate_semi_implicit_euler(position, velocity, acceleration, timestep.get_dt());
    
    // Advance time
    timestep.advance();
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
