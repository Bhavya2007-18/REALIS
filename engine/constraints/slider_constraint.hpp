#pragma once
#include "constraint.hpp"
#include <cmath>

namespace realis {

class SliderConstraint : public Constraint {
public:
    Vec3 anchor_a;
    Vec3 anchor_b;
    Vec3 axis;
    float min_limit;
    float max_limit;
    float stiffness;
    float damping;

    SliderConstraint(RigidBody* a, RigidBody* b)
        : Constraint(a, b), anchor_a(0, 0, 0), anchor_b(0, 0, 0),
          axis(1, 0, 0), min_limit(-1e20f), max_limit(1e20f),
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

        Vec3 perp1, perp2;
        compute_tangents(world_axis_a, perp1, perp2);

        linearA = perp1 * -1.0f;
        linearB = perp1;

        angularA = r_a.cross(perp1) * -1.0f;
        angularB = r_b.cross(perp1);

        float pos_along_axis = (world_anchor_b - world_anchor_a).dot(world_axis_a);
        float clamped = std::max(min_limit, std::min(max_limit, pos_along_axis));
        C_val = pos_along_axis - clamped;

        float kp = stiffness * dt;
        float kd = damping * dt;
        bias = (kp * C_val) / dt;
    }

private:
    static void compute_tangents(const Vec3& normal, Vec3& t1, Vec3& t2) {
        if (std::abs(normal.x) >= 0.57735f) {
            t1 = Vec3(normal.y, -normal.x, 0.0f).normalized();
        } else {
            t1 = Vec3(0.0f, normal.z, -normal.y).normalized();
        }
        t2 = normal.cross(t1).normalized();
    }
};

} // namespace realis