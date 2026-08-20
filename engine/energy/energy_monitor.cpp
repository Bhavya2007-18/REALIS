
#include "energy_monitor.hpp"

namespace realis {

float EnergyMonitor::compute_total_energy(const std::vector<RigidBody*>& bodies, const Vec3& gravity) {
    float total_ke = 0.0f;
    float total_pe = 0.0f;
    
    
    float g_mag = -gravity.y; 

    for (const auto* body : bodies) {
        
        float v_sq = body->velocity.dot(body->velocity);
        total_ke += 0.5f * body->mass * v_sq;
        
        
        total_pe += body->mass * g_mag * body->position.y;
    }
    
    return total_ke + total_pe;
}

} 