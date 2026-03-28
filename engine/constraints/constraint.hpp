
#pragma once
#include "../dynamics/rigid_body.hpp"
#include "../math/vec3.hpp"

namespace realis {


class Constraint {
public:
  RigidBody *bodyA;
  RigidBody *bodyB;

  
  Vec3 linearA;
  Vec3 angularA;
  Vec3 linearB;
  Vec3 angularB;

  float bias;          
  float effectiveMass; 
                       
  float lambda; 
                

  
  float C_val;   
  float J_dot_v; 

  
  float minLambda;
  float maxLambda;

  
  bool motorEnabled;
  float targetVelocity;
  float maxForce; 

  Constraint(RigidBody *a, RigidBody *b)
      : bodyA(a), bodyB(b), bias(0.0f), effectiveMass(0.0f), lambda(0.0f),
        C_val(0.0f), J_dot_v(0.0f), minLambda(-1e20f), maxLambda(1e20f),
        motorEnabled(false), targetVelocity(0.0f), maxForce(0.0f) {}

  virtual ~Constraint() = default;

  
  
  virtual void pre_step(float dt) = 0;

  
  void apply_constraint_force(float lambda_val) {
    if (bodyA && bodyA->inv_mass > 0) {
      bodyA->apply_force(linearA * lambda_val);
      bodyA->apply_torque(angularA * lambda_val);
    }
    if (bodyB && bodyB->inv_mass > 0) {
      bodyB->apply_force(linearB * lambda_val);
      bodyB->apply_torque(angularB * lambda_val);
    }
  }
};

} 