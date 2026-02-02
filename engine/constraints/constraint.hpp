// Abstract constraint base class
#pragma once
#include "../math/vec3.hpp"
#include "../dynamics/rigid_body.hpp"

namespace realis {

/**
 * Mathematical form: J*v + b = 0
 * Where J is the Jacobian matrix and v is the velocity vector.
 */
class Constraint {
public:
    RigidBody* bodyA;
    RigidBody* bodyB;

    // Jacobian components for 1D constraint between two bodies
    Vec3 linearA;
    Vec3 angularA;
    Vec3 linearB;
    Vec3 angularB;

    float bias;          // b in J*v + b = 0 (Restitution, Baumgarte stabilization)
    float effectiveMass; // 1 / (J * M^-1 * J^T)
    float lambda;        // Accumulated impulse for PGS stability

    // Limits for inequality constraints
    float minLambda;
    float maxLambda;

    Constraint(RigidBody* a, RigidBody* b) 
        : bodyA(a), bodyB(b)
        , bias(0.0f)
        , effectiveMass(0.0f)
        , lambda(0.0f)
        , minLambda(-1e20f)
        , maxLambda(1e20f) 
    {}

    virtual ~Constraint() = default;

    // Prepare solver data: compute Jacobian, Effective Mass, and Bias
    virtual void pre_step(float dt) = 0;

    // Apply the computed impulse lambda to bodies
    void apply_impulse(float dLambda) {
        if (bodyA && bodyA->inv_mass > 0) {
            bodyA->velocity = bodyA->velocity + linearA * (bodyA->inv_mass * dLambda);
            bodyA->angular_velocity = bodyA->angular_velocity + angularA * (dLambda); // Simplified angular for now
        }
        if (bodyB && bodyB->inv_mass > 0) {
            bodyB->velocity = bodyB->velocity + linearB * (bodyB->inv_mass * dLambda);
            bodyB->angular_velocity = bodyB->angular_velocity + angularB * (dLambda);
        }
    }
};

} // namespace realis