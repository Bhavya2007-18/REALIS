// RigidBody implementation
#include "rigid_body.hpp"

namespace realis {

RigidBody::RigidBody()
    : position(0, 0, 0), velocity(0, 0, 0), force(0, 0, 0), mass(1.0f),
      inv_mass(1.0f), orientation(1, 0, 0, 0), angular_velocity(0, 0, 0),
      torque(0, 0, 0), shape(nullptr) {
  inertia_tensor = Mat3::identity();
  inv_inertia_tensor = Mat3::identity();
}

void RigidBody::apply_force(const Vec3 &f) { force = force + f; }

void RigidBody::clear_forces() {
  force = Vec3(0, 0, 0);
  torque = Vec3(0, 0, 0);
}

void RigidBody::apply_torque(const Vec3 &t) { torque = torque + t; }

} // namespace realis
