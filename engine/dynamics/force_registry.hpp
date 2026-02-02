// Force accumulation
#pragma once
#include <vector>
#include "rigid_body.hpp"

namespace realis {

class ForceGenerator {
public:
    virtual void update_force(RigidBody* body, float dt) = 0;
    virtual ~ForceGenerator() = default;
};

class ForceRegistry {
protected:
    struct ForceRegistration {
        RigidBody* body;
        ForceGenerator* fg;
    };
    std::vector<ForceRegistration> registrations;

public:
    void add(RigidBody* body, ForceGenerator* fg);
    void remove(RigidBody* body, ForceGenerator* fg);
    void clear();
    void update_forces(float dt);
};

} // namespace realis