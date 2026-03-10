// Constraint Solver implementation
#include "constraint_solver.hpp"
#include "../math/matrix_solver.hpp"
#include <cmath>

namespace realis {

void ConstraintSolver::solve(std::vector<Constraint *> &constraints, float dt) {
  if (constraints.empty())
    return;

  int n = constraints.size();

  // 1. Pre-step: compute Jacobians, C_val, J_dot_v, and Effective Mass
  for (auto c : constraints) {
    c->pre_step(dt);

    // Compute J M^-1 J^T for this single constraint
    float invMass = 0.0f;
    if (c->bodyA && c->bodyA->inv_mass > 0) {
      invMass += c->linearA.dot(c->linearA) * c->bodyA->inv_mass;
      invMass += c->angularA.dot(c->bodyA->inv_inertia_tensor * c->angularA);
    }
    if (c->bodyB && c->bodyB->inv_mass > 0) {
      invMass += c->linearB.dot(c->linearB) * c->bodyB->inv_mass;
      invMass += c->angularB.dot(c->bodyB->inv_inertia_tensor * c->angularB);
    }
    c->effectiveMass = (invMass > 0.0f) ? 1.0f / invMass : 0.0f;

    // Standard Baumgarte stabilization
    float kp = 400.0f;
    c->bias = (kp * c->C_val) / dt;

    // Warm starting: Apply previous lambda if any (optional, but good for
    // stability) For now, reset lambda per step unless we implement persistent
    // constraints
    c->lambda = 0.0f;
  }

  // 2. Iterative Solve (Projected Gauss-Seidel)
  const int iterations = 20;
  for (int iter = 0; iter < iterations; ++iter) {
    for (auto c : constraints) {
      // Relative velocity J * v
      float jv = 0.0f;
      if (c->bodyA) {
        jv += c->linearA.dot(c->bodyA->velocity);
        jv += c->angularA.dot(c->bodyA->angular_velocity);
      }
      if (c->bodyB) {
        jv += c->linearB.dot(c->bodyB->velocity);
        jv += c->angularB.dot(c->bodyB->angular_velocity);
      }

      // Compute lambda impulse/force
      // If it's a motor, we want jv to approach targetVelocity
      float motorBias = c->motorEnabled ? -c->targetVelocity : 0.0f;

      float deltaLambda = c->effectiveMass * (-(jv + c->bias + motorBias));

      // Clamping (Projected part of PGS)
      float oldLambda = c->lambda;
      c->lambda += deltaLambda;

      // Enforce limits
      float minL = c->motorEnabled ? -c->maxForce : c->minLambda;
      float maxL = c->motorEnabled ? c->maxForce : c->maxLambda;

      if (c->lambda < minL)
        c->lambda = minL;
      if (c->lambda > maxL)
        c->lambda = maxL;

      deltaLambda = c->lambda - oldLambda;

      // Apply impulses immediately to velocities (integrator will use these
      // updated velocities)
      if (c->bodyA && c->bodyA->inv_mass > 0) {
        c->bodyA->velocity = c->bodyA->velocity +
                             c->linearA * (deltaLambda * c->bodyA->inv_mass);
        c->bodyA->angular_velocity =
            c->bodyA->angular_velocity +
            c->bodyA->inv_inertia_tensor * (c->angularA * deltaLambda);
      }
      if (c->bodyB && c->bodyB->inv_mass > 0) {
        c->bodyB->velocity = c->bodyB->velocity +
                             c->linearB * (c->bodyB->inv_mass * deltaLambda);
        c->bodyB->angular_velocity =
            c->bodyB->angular_velocity +
            c->bodyB->inv_inertia_tensor * (c->angularB * deltaLambda);
      }
    }
  }
}

} // namespace realis
