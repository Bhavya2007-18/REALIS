// Sphere Primitive
#pragma once
#include "shape.hpp"
#include "../dynamics/inertia.hpp" // Utilizing existing helper if possible

namespace realis {
namespace geometry {

class Sphere : public Shape {
public:
    float radius;

    Sphere(float r) : Shape(ShapeType::SPHERE), radius(r) {
        aabb_min = Vec3(-r, -r, -r);
        aabb_max = Vec3(r, r, r);
    }

    Vec3 support(const Vec3& direction) const override {
        // Furthest point on a sphere is just radius * direction
        // Safe normalization
        Vec3 dir = direction;
        float len = dir.magnitude();
        if (len > 1e-6f) {
            dir = dir * (1.0f / len);
        } else {
            return Vec3(radius, 0, 0);
        }
        return dir * radius;
    }

    Mat3 compute_inertia_tensor(float mass) const override {
        // I = 2/5 * m * r^2 * Identity
        float i = (2.0f / 5.0f) * mass * radius * radius;
        Mat3 tensor;
        tensor.data[0] = i; tensor.data[4] = i; tensor.data[8] = i;
        return tensor;
    }
};

} // namespace geometry
} // namespace realis
