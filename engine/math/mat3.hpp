// 3x3 matrix class
#pragma once
#include "vec3.hpp"

namespace realis {

struct Mat3 {
    float data[9];

    Mat3();

    static Mat3 identity();
    
    Mat3 operator*(const Mat3& other) const;
    Vec3 operator*(const Vec3& v) const;
    Mat3 transpose() const;
};

} // namespace realis