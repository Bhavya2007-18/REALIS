
#pragma once
#include "../math/mat3.hpp"
#include "../math/quat.hpp"
#include "../math/vec3.hpp"


namespace realis {
namespace geometry {
class Shape;
}
} 

namespace realis {

class RigidBody {
public:
  
  float restitution = 1.0f; 
  float friction = 0.5f;    

  
  Vec3 position;
  Vec3 velocity;
  Vec3 force;
  float mass;
  float inv_mass;

  
  Quat orientation;
  Vec3 angular_velocity;
  Vec3 torque;

  
  geometry::Shape *shape;
  Mat3 inertia_tensor;
  Mat3 inv_inertia_tensor;

  RigidBody();

  void apply_force(const Vec3 &f);
  void apply_torque(const Vec3 &t);
  void clear_forces();
};

} 