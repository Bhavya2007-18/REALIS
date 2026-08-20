


#include "timestep.hpp"

namespace realis {

Timestep::Timestep(float dt) : dt(dt), current_time(0.0f) {
    
}

void Timestep::advance() {
    current_time += dt;
}

float Timestep::get_dt() const {
    return dt;
}

float Timestep::get_current_time() const {
    return current_time;
}

void Timestep::reset() {
    current_time = 0.0f;
}

} 