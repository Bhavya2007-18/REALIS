#pragma once
#include "../math/vec3.hpp"
#include "force_field.hpp"


namespace realis {

class LinearSpringField : public ForceField {
public:
  LinearSpringField(float stiffness, float rest_pos = 0.0f)
      : k(stiffness), rest(rest_pos) {}

  Vec3 compute_force(const RigidBody &body) const override {
    
    return Vec3(-k * (body.position.x - rest), 0, 0);
  }

  float compute_potential_energy(const RigidBody &body) const override {
    
    float x = body.position.x - rest;
    return 0.5f * k * x * x;
  }

private:
  float k;
  float rest;
};

} 