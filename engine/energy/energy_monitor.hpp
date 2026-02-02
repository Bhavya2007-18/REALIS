// Energy monitoring
#pragma once
#include <vector>
#include "../dynamics/rigid_body.hpp"

namespace realis {

class EnergyMonitor {
public:
    static float compute_total_energy(const std::vector<RigidBody*>& bodies, const Vec3& gravity);
};

} // namespace realis