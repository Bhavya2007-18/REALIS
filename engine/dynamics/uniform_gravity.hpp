#pragma once
#include "force_field.hpp"
#include "rigid_body.hpp"

namespace realis {

class UniformGravityField : public ForceField {
public:
  UniformGravityField(float g = 9.81f) : g_accel(g) {}

  Vec3 compute_force(const RigidBody &body) const override {
    
    return Vec3(0, -g_accel * body.mass, 0);
  }

  float compute_potential_energy(const RigidBody &body) const override {
    
    return body.mass * g_accel * body.position.y;
  }

  float get_g() const { return g_accel; }

private:
  float g_accel;
};

} 