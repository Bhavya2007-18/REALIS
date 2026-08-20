#pragma once
#include "constraint.hpp"
#include <cmath>

namespace realis {

class HingeConstraint : public Constraint {
public:
    Vec3 anchor_a;
    Vec3 anchor_b;
    Vec3 axis;
    float angle;
    float min_angle;
    float max_angle;
    float stiffness;
    float damping;

    HingeConstraint(RigidBody* a, RigidBody* b)
        : Constraint(a, b), anchor_a(0, 0, 0), anchor_b(0, 0, 0), 
          axis(0, 0, 1), angle(0), min_angle(-3.14159f), max_angle(3.14159f),
          stiffness(100.0f), damping(5.0f) {}

    void pre_step(float dt) override {
        if (!bodyA || !bodyB) return;

        Quat qA = bodyA->orientation;
        Quat qB = bodyB->orientation;
        Quat qA_inv(qA.w, -qA.x, -qA.y, -qA.z);
        Quat qB_inv(qB.w, -qB.x, -qB.y, -qB.z);

        Vec3 world_axis_a = qA * axis * qA_inv;
        Vec3 world_axis_b = qB * axis * qB_inv;

        Vec3 world_anchor_a = bodyA->position + (qA * anchor_a * qA_inv);
        Vec3 world_anchor_b = bodyB->position + (qB * anchor_b * qB_inv);

        Vec3 r_a = world_anchor_a - bodyA->position;
        Vec3 r_b = world_anchor_b - bodyB->position;

        linearA = world_axis_a.cross(r_a) * -1.0f;
        linearB = world_axis_b.cross(r_b);

        angularA = world_axis_a * -1.0f;
        angularB = world_axis_b;

        float current_angle = std::atan2(
            (world_axis_a.cross(world_axis_b)).dot(world_axis_a),
            world_axis_a.dot(world_axis_b)
        );
        angle = current_angle;

        float clamped = std::max(min_angle, std::min(max_angle, current_angle));
        C_val = current_angle - clamped;

        float kp = stiffness * dt;
        float kd = damping * dt;
        bias = (kp * C_val) / dt;
    }
};

} // namespace realis