// Physics world container
#pragma once
#include <vector>
#include "../math/vec3.hpp"
#include "timestep.hpp"
#include "../constraints/constraint.hpp"
#include "../constraints/constraint_solver.hpp"

namespace realis {

class World {
public:
    // Construction
    World(float dt = 0.01f);
    
    // Simulation
    void step();
    float compute_energy() const;
    void log_state() const;
    
    // Constraints
    void add_constraint(Constraint* c);
    
    // State access
    void set_position(const Vec3& pos);
    void set_velocity(const Vec3& vel);
    Vec3 get_position() const;
    Vec3 get_velocity() const;
    float get_time() const;
    
private:
    Timestep timestep;
    ConstraintSolver constraint_solver;
    
    // Bodies and Constraints
    // For Phase 6A, we manage a simplified list
    std::vector<Constraint*> constraints;
    
    // Point mass state (Legacy Phase 1/2) 
    // We should transition to managing RigidBody objects
    Vec3 position;
    Vec3 velocity;
    float mass;
    
    // Forces
    Vec3 gravity;
};

} // namespace realis