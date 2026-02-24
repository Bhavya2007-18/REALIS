// Rigid body dynamics
#pragma once
#include "../math/mat3.hpp"
#include "../math/quat.hpp"
#include "../math/vec3.hpp"

// Forward declare Shape to avoid circular dependency
namespace realis {
namespace geometry {
class Shape;
}
} // namespace realis

namespace realis {

class RigidBody {
public:
  // Material
  float restitution = 1.0f; // Coefficient of restitution

  // State
  Vec3 position;
  Vec3 velocity;
  Vec3 force;
  float mass;
  float inv_mass;

  // Rotation
  Quat orientation;
  Vec3 angular_velocity;
  Vec3 torque;

  // Geometry
  geometry::Shape *shape;
  Mat3 inertia_tensor;
  Mat3 inv_inertia_tensor;

  RigidBody();

  void apply_force(const Vec3 &f);
  void apply_torque(const Vec3 &t);
  void clear_forces();
};

} // namespace realis
