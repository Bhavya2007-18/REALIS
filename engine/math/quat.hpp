// Quaternion for rotations
#pragma once
#include "vec3.hpp"
#include "mat3.hpp"

namespace realis {

struct Quat {
    float w, x, y, z;

    Quat(float w_ = 1.0f, float x_ = 0.0f, float y_ = 0.0f, float z_ = 0.0f)
        : w(w_), x(x_), y(y_), z(z_) {}

    Quat operator*(const Quat& other) const;
    void normalize();
    
    static Quat from_axis_angle(const Vec3& axis, float angle);
    Mat3 to_mat3() const;
};

} // namespace realis