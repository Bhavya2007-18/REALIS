// Box Primitive
#pragma once
#include "shape.hpp"
#include <cmath>
#include <algorithm>

namespace realis {
namespace geometry {

class Box : public Shape {
public:
    Vec3 half_extents; // Half-width, Half-height, Half-depth

    Box(const Vec3& half_dims) : Shape(ShapeType::BOX), half_extents(half_dims) {
        aabb_min = half_extents * -1.0f;
        aabb_max = half_extents;
    }

    Vec3 support(const Vec3& direction) const override {
        // Sign function for each component
        return Vec3(
            (direction.x > 0) ? half_extents.x : -half_extents.x,
            (direction.y > 0) ? half_extents.y : -half_extents.y,
            (direction.z > 0) ? half_extents.z : -half_extents.z
        );
    }

    Mat3 compute_inertia_tensor(float mass) const override {
        // Ixx = 1/12 * m * (h^2 + d^2) ...
        // Dimensions are 2 * half_extents
        float w = 2.0f * half_extents.x;
        float h = 2.0f * half_extents.y;
        float d = 2.0f * half_extents.z;
        
        float ixx = (1.0f / 12.0f) * mass * (h * h + d * d);
        float iyy = (1.0f / 12.0f) * mass * (w * w + d * d);
        float izz = (1.0f / 12.0f) * mass * (w * w + h * h);
        
        Mat3 tensor;
        tensor.data[0] = ixx;
        tensor.data[4] = iyy;
        tensor.data[8] = izz;
        return tensor;
    }
};

} // namespace geometry
} // namespace realis
