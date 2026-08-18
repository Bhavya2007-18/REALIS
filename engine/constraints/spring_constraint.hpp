#pragma once
#include "constraint.hpp"
#include <cmath>

namespace realis {

class SpringConstraint : public Constraint {
public:
    float rest_length;
    float stiffness;
    float damping;
    float min_length;
    float max_length;

    SpringConstraint(RigidBody* a, RigidBody* b)
        : Constraint(a, b), rest_length(1.0f), stiffness(100.0f), 
          damping(5.0f), min_length(0.0f), max_length(1e20f) {}

    void pre_step(float dt) override {
        if (!bodyA || !bodyB) return;

        Vec3 pA = bodyA->position;
        Vec3 pB = bodyB->position;
        Vec3 n = pB - pA;
        float d = n.magnitude();

        if (d > 0.0001f) {
            n = n * (1.0f / d);
        } else {
            n = Vec3(0, 1, 0);
        }

        linearA = n * -1.0f;
        linearB = n;

        angularA = Vec3(0, 0, 0);
        angularB = Vec3(0, 0, 0);

        float clamped = std::max(min_length, std::min(max_length, d));
        C_val = d - clamped;

        float kp = stiffness * dt;
        float kd = damping * dt;
        bias = (kp * C_val) / dt;
    }
};

} // namespace realis