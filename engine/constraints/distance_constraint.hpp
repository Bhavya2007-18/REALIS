// Distance Constraint implementation
#pragma once
#include "constraint.hpp"
#include <cmath>

namespace realis {

/**
 * C(q) = ||pB - pA|| - length = 0
 * Jacobian J = [ -n, -(rA x n), n, (rB x n) ]
 * where n = (pB - pA) / ||pB - pA||
 */
class DistanceConstraint : public Constraint {
public:
    float distance;
    float frequency; // For soft constraints (optional for now)
    float damping;

    DistanceConstraint(RigidBody* a, RigidBody* b, float dist)
        : Constraint(a, b), distance(dist), frequency(0.0f), damping(0.0f) {}

    void pre_step(float dt) override {
        if (!bodyA || !bodyB) return;

        // Vector from A to B
        Vec3 n = bodyB->position - bodyA->position;
        float d = n.magnitude();
        
        if (d > 0.0001f) {
            n = n * (1.0f / d);
        } else {
            n = Vec3(0, 1, 0); // Default direction
        }

        // 1. Linear Jacobians
        linearA = n * -1.0f;
        linearB = n;

        // 2. Angular Jacobians (Simplified: no rotation integration for anchor points yet)
        angularA = Vec3(0, 0, 0);
        angularB = Vec3(0, 0, 0);

        // 3. Effective Mass: W = J * M^-1 * J^T
        // W = linearA^2 * invMa + linearB^2 * invMb = 1*invMa + 1*invMb
        float invEffMass = bodyA->inv_mass + bodyB->inv_mass;
        effectiveMass = (invEffMass > 0.0f) ? 1.0f / invEffMass : 0.0f;

        // 4. Bias: b = (Baumgarte / dt) * C(q)
        // Helps fight constraint drift
        float beta = 0.2f; // Baumgarte stabilization factor
        float C = d - distance;
        bias = (beta / dt) * C;
    }
};

} // namespace realis
