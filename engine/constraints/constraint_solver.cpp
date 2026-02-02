// Constraint Solver implementation
#include "constraint_solver.hpp"

namespace realis {

void ConstraintSolver::solve(std::vector<Constraint*>& constraints, float dt) {
    // 1. Pre-step: compute Jacobians and Effective Masses
    for (auto c : constraints) {
        c->pre_step(dt);
    }

    // 2. Iteratively solve for impulses (PGS)
    for (int i = 0; i < iterations; ++i) {
        for (auto c : constraints) {
            // Relative velocity along Jacobian (J * v)
            float jv = 0.0f;
            if (c->bodyA) {
                jv += c->linearA.dot(c->bodyA->velocity);
                jv += c->angularA.dot(c->bodyA->angular_velocity);
            }
            if (c->bodyB) {
                jv += c->linearB.dot(c->bodyB->velocity);
                jv += c->angularB.dot(c->bodyB->angular_velocity);
            }

            // Delta lambda: dL = -(Jv + b) / (J * M^-1 * J^T)
            // effectiveMass is already 1 / (J * M^-1 * J^T)
            float dLambda = -(jv + c->bias) * c->effectiveMass;

            // Clamp accumulated impulse (for inequality constraints/friction)
            float oldLambda = c->lambda;
            c->lambda = std::max(c->minLambda, std::min(c->maxLambda, oldLambda + dLambda));
            dLambda = c->lambda - oldLambda;

            // Apply impulse to bodies
            c->apply_impulse(dLambda);
        }
    }
}

} // namespace realis
