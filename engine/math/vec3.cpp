// Vec3 implementation
// Ported from: physics_lab/core_math/vectors.py

#include "vec3.hpp"
#include <cmath>

namespace realis {

float Vec3::magnitude() const {
    return std::sqrt(x * x + y * y + z * z);
}

Vec3 Vec3::normalized() const {
    float mag = magnitude();
    if (mag < 1e-10f) {
        return Vec3(0.0f, 0.0f, 0.0f);
    }
    return Vec3(x / mag, y / mag, z / mag);
}

} // namespace realis
