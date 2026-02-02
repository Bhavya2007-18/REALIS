// Physics world container
#pragma once
#include "../math/vec3.hpp"
#include "timestep.hpp"

namespace realis {

class World {
public:
    // Construction
    World(float dt = 0.01f);
    
    // Simulation
    void step();
    float compute_energy() const;
    void log_state() const;
    
    // State access
    void set_position(const Vec3& pos);
    void set_velocity(const Vec3& vel);
    Vec3 get_position() const;
    Vec3 get_velocity() const;
    float get_time() const;
    
private:
    Timestep timestep;
    
    // Point mass state
    Vec3 position;
    Vec3 velocity;
    float mass;
    
    // Forces
    Vec3 gravity;
};

} // namespace realis