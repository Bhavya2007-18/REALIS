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
    Mat3 operator*(float s) const;
    Mat3 operator+(const Mat3& other) const;
    Mat3 transpose() const;
    
    float determinant() const;
    Mat3 inverse() const;
    
    void set_column(int col, const Vec3& v);
    Vec3 row(int r) const;
};

} // namespace realis