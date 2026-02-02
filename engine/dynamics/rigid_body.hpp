// Rigid body dynamics
#pragma once
#include "../math/vec3.hpp"
#include "../math/quat.hpp"
#include "../math/mat3.hpp"

namespace realis {

class RigidBody {
public:
    // Translational state
    Vec3 position;
    Vec3 velocity;
    Vec3 force;
    float mass;
    float inv_mass;
    
    // Rotational state
    Quat orientation;
    Vec3 angular_velocity;
    Vec3 torque;
    Mat3 inertia_tensor;
    Mat3 inv_inertia_tensor;
    
    RigidBody();
    
    void integrate(float dt);
    void apply_force(const Vec3& f);
    void apply_torque(const Vec3& t);
    void clear_forces();
};

} // namespace realis
