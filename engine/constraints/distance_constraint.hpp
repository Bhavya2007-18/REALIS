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

  DistanceConstraint(RigidBody *a, RigidBody *b, float dist)
      : Constraint(a, b), distance(dist), frequency(0.0f), damping(0.0f) {}

  void pre_step(float dt) override {
    if (!bodyA || !bodyB)
      return;

    // Vector from A to B
    Vec3 pA = bodyA->position;
    Vec3 pB = bodyB->position;
    Vec3 n = pB - pA;
    float d = n.magnitude();

    if (d > 0.0001f) {
      n = n * (1.0f / d);
    } else {
      n = Vec3(0, 1, 0); // Default direction
    }

    // 1. Linear Jacobians
    // C = ||pB - pA|| - L = 0
    // \dot{C} = n \cdot (vB - vA) = J v
    // J_A = -n^T, J_B = n^T
    linearA = n * -1.0f;
    linearB = n;

    // 2. Angular Jacobians (Simplified: anchor at COM for now)
    angularA = Vec3(0, 0, 0);
    angularB = Vec3(0, 0, 0);

    // 3. C_val: C(q)
    C_val = d - distance;

    // 4. J_dot_v: \dot{J} * v
    // \dot{n} = (vB - vA - n * (n \cdot (vB - vA))) / d
    // \dot{J}_A = -\dot{n}^T, \dot{J}_B = \dot{n}^T
    // \dot{J} v = \dot{J}_A vA + \dot{J}_B vB = \dot{n} \cdot (vB - vA)
    Vec3 vA = bodyA->velocity;
    Vec3 vB = bodyB->velocity;
    Vec3 rel_v = vB - vA;
    Vec3 n_dot = (rel_v - n * n.dot(rel_v)) * (1.0f / d);

    J_dot_v = n_dot.dot(rel_v);

    // 5. Bias (Optional Baumgarte term handled in solver, but we can pre-calc
    // it here if we want) Here we just let solver read C_val directly. Bias is
    // kept 0 for now.
    bias = 0.0f;
  }
};

} // namespace realis
