// ForceRegistry implementation
#include "force_registry.hpp"
#include <algorithm>

namespace realis {

void ForceRegistry::add(RigidBody* body, ForceGenerator* fg) {
    registrations.push_back({body, fg});
}

void ForceRegistry::remove(RigidBody* body, ForceGenerator* fg) {
    registrations.erase(
        std::remove_if(registrations.begin(), registrations.end(),
            [&](const ForceRegistration& reg) {
                return reg.body == body && reg.fg == fg;
            }),
        registrations.end());
}

void ForceRegistry::clear() {
    registrations.clear();
}

void ForceRegistry::update_forces(float dt) {
    for (auto& reg : registrations) {
        reg.fg->update_force(reg.body, dt);
    }
}

} // namespace realis
