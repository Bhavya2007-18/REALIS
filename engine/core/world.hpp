// Physics world container
#pragma once
#include <vector>
#include "../math/vec3.hpp"
#include "timestep.hpp"
#include "../constraints/constraint.hpp"
#include "../constraints/constraint_solver.hpp"

namespace realis {

class RigidBody; // Forward declaration

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
    Vec3 get_gravity() const { return gravity; }
    
    // Rigid Body Management (Phase 9 Integration)
    void add_body(RigidBody* body);
    void remove_body(RigidBody* body);
    
    // Public for easy access in demos/adapters for now
    std::vector<RigidBody*> bodies;
    std::vector<Constraint*> constraints;

private:
    Timestep timestep;
    ConstraintSolver constraint_solver;
    
    // Point mass state (Legacy Phase 1/2) 
    Vec3 position;
    Vec3 velocity;
    float mass;
    
    // Forces
    Vec3 gravity;
};

} // namespace realis