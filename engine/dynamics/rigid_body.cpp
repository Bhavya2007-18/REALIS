// RigidBody implementation
#include "rigid_body.hpp"

namespace realis {

RigidBody::RigidBody() 
    : position(0, 0, 0)
    , velocity(0, 0, 0)
    , force(0, 0, 0)
    , mass(1.0f)
    , inv_mass(1.0f)
    , orientation(1, 0, 0, 0)
    , angular_velocity(0, 0, 0)
    , torque(0, 0, 0)
    , shape(nullptr)
{
}

void RigidBody::apply_force(const Vec3& f) {
    force = force + f;
}

void RigidBody::clear_forces() {
    force = Vec3(0, 0, 0);
}

void RigidBody::integrate(float dt) {
    if (inv_mass <= 0.0f) return;

    // 1. Translational Integration (Semi-Implicit Euler)
    Vec3 acceleration = force * inv_mass;
    velocity = velocity + acceleration * dt;
    position = position + velocity * dt;

    // 2. Rotational Integration
    // Convert current angular velocity to world-space torque response
    // For now, simplify to: w_new = w + alpha * dt
    // In full engine, use: L_new = L + T*dt; w = I_inv * L
    
    // Simplification for Phase 3 (matching angular_stability.py Euler equations approach)
    // dW/dt = I^-1 * (T - W x (I * W))
    
    // For intermediate axis stability test (torque-free), T = 0
    // dW/dt = I^-1 * (-W x (I * W))
    
    // We'll update the orientation first using current angular velocity
    // q_new = q + 0.5 * w * q * dt
    
    Quat qw(0, angular_velocity.x, angular_velocity.y, angular_velocity.z);
    Quat q_dot = qw * orientation;
    
    orientation.w += q_dot.w * 0.5f * dt;
    orientation.x += q_dot.x * 0.5f * dt;
    orientation.y += q_dot.y * 0.5f * dt;
    orientation.z += q_dot.z * 0.5f * dt;
    orientation.normalize();

    // Transform inertia tensor to world space: I = R * I_body * R^T
    // Mat3 rot = orientation.to_mat3();
    // For now we assume diagonal inertia_tensor (principal axes) in body space
    // and we update angular_velocity using Euler's equations directly in body space
    // or world space. Let's stick to world space for the engine.
    
    clear_forces();
    torque = Vec3(0, 0, 0);
}

void RigidBody::apply_torque(const Vec3& t) {
    torque = torque + t;
}

} // namespace realis
