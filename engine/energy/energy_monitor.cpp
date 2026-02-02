// EnergyMonitor implementation
#include "energy_monitor.hpp"

namespace realis {

float EnergyMonitor::compute_total_energy(const std::vector<RigidBody*>& bodies, const Vec3& gravity) {
    float total_ke = 0.0f;
    float total_pe = 0.0f;
    
    // Gravity magnitude for potential energy calculation relative to y=0
    float g_mag = -gravity.y; // Assuming gravity is primarily along -y

    for (const auto* body : bodies) {
        // KE = 0.5 * m * v^2
        float v_sq = body->velocity.dot(body->velocity);
        total_ke += 0.5f * body->mass * v_sq;
        
        // PE = m * g * h
        total_pe += body->mass * g_mag * body->position.y;
    }
    
    return total_ke + total_pe;
}

} // namespace realis
