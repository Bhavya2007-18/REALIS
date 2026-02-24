// Abstract constraint base class
#pragma once
#include "../dynamics/rigid_body.hpp"
#include "../math/vec3.hpp"

namespace realis {

/**
 * Mathematical form: J*v + b = 0
 * Where J is the Jacobian matrix and v is the velocity vector.
 */
class Constraint {
public:
  RigidBody *bodyA;
  RigidBody *bodyB;

  // Jacobian components for 1D constraint between two bodies
  Vec3 linearA;
  Vec3 angularA;
  Vec3 linearB;
  Vec3 angularB;

  float bias;          // Baumgarte stabilization (or restitution bias)
  float effectiveMass; // Only used by PGS temporarily if needed, but not by
                       // exact solver if it builds global M
  float lambda; // The stored exact multiplier (can be used for warm-starting or
                // clamping)

  // Continuous constraint quantities
  float C_val;   // C(q) value
  float J_dot_v; // \dot{J} * v value

  // Limits for inequality constraints
  float minLambda;
  float maxLambda;

  Constraint(RigidBody *a, RigidBody *b)
      : bodyA(a), bodyB(b), bias(0.0f), effectiveMass(0.0f), lambda(0.0f),
        C_val(0.0f), J_dot_v(0.0f), minLambda(-1e20f), maxLambda(1e20f) {}

  virtual ~Constraint() = default;

  // Prepare solver data: compute Jacobian, C_val, J_dot_v, Effective Mass, and
  // Bias
  virtual void pre_step(float dt) = 0;

  // Apply the computed constraint force to bodies
  void apply_constraint_force(float lambda_val) {
    if (bodyA && bodyA->inv_mass > 0) {
      bodyA->apply_force(linearA * lambda_val);
      // Ignore angular force apply for now until full inertia maps are aligned
    }
    if (bodyB && bodyB->inv_mass > 0) {
      bodyB->apply_force(linearB * lambda_val);
      // Ignore angular force apply for now
    }
  }
};

} // namespace realis