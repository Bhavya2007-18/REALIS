// 3x3 matrix implementation
#include "mat3.hpp"
#include <cmath> // for std::abs if needed, though simple math here

namespace realis {

Mat3::Mat3() {
    for (int i = 0; i < 9; ++i) data[i] = 0.0f;
}

Mat3 Mat3::identity() {
    Mat3 res;
    res.data[0] = res.data[4] = res.data[8] = 1.0f;
    return res;
}

Mat3 Mat3::operator*(const Mat3& other) const {
    Mat3 res;
    for (int i = 0; i < 3; ++i) {
        for (int j = 0; j < 3; ++j) {
            res.data[i * 3 + j] = 
                data[i * 3 + 0] * other.data[0 * 3 + j] +
                data[i * 3 + 1] * other.data[1 * 3 + j] +
                data[i * 3 + 2] * other.data[2 * 3 + j];
        }
    }
    return res;
}

Vec3 Mat3::operator*(const Vec3& v) const {
    return Vec3(
        data[0] * v.x + data[1] * v.y + data[2] * v.z,
        data[3] * v.x + data[4] * v.y + data[5] * v.z,
        data[6] * v.x + data[7] * v.y + data[8] * v.z
    );
}

Mat3 Mat3::operator+(const Mat3& other) const {
    Mat3 res;
    for (int i = 0; i < 9; ++i) {
        res.data[i] = data[i] + other.data[i];
    }
    return res;
}

Mat3 Mat3::operator*(float s) const {
    Mat3 res;
    for (int i = 0; i < 9; ++i) {
        res.data[i] = data[i] * s;
    }
    return res;
}

Mat3 Mat3::transpose() const {
    Mat3 res;
    res.data[0] = data[0]; res.data[1] = data[3]; res.data[2] = data[6];
    res.data[3] = data[1]; res.data[4] = data[4]; res.data[5] = data[7];
    res.data[6] = data[2]; res.data[7] = data[5]; res.data[8] = data[8];
    return res;
}

float Mat3::determinant() const {
    // Rule of Sarrus
    return data[0] * (data[4] * data[8] - data[5] * data[7]) -
           data[1] * (data[3] * data[8] - data[5] * data[6]) +
           data[2] * (data[3] * data[7] - data[4] * data[6]);
}

Mat3 Mat3::inverse() const {
    float invDet = 1.0f / determinant();
    // Assuming non-singular for now (FEM elements shouldn't be degenerate)
    
    Mat3 res;
    // Cofactor matrix transposed
    res.data[0] = (data[4] * data[8] - data[5] * data[7]) * invDet;
    res.data[1] = (data[2] * data[7] - data[1] * data[8]) * invDet; // Transposed 1,0 -> 0,1
    res.data[2] = (data[1] * data[5] - data[2] * data[4]) * invDet;
    
    res.data[3] = (data[5] * data[6] - data[3] * data[8]) * invDet;
    res.data[4] = (data[0] * data[8] - data[2] * data[6]) * invDet;
    res.data[5] = (data[2] * data[3] - data[0] * data[5]) * invDet;
    
    res.data[6] = (data[3] * data[7] - data[4] * data[6]) * invDet;
    res.data[7] = (data[1] * data[6] - data[0] * data[7]) * invDet;
    res.data[8] = (data[0] * data[4] - data[1] * data[3]) * invDet;
    
    return res;
}

void Mat3::set_column(int col, const Vec3& v) {
    data[0 * 3 + col] = v.x;
    data[1 * 3 + col] = v.y;
    data[2 * 3 + col] = v.z;
}

Vec3 Mat3::row(int r) const {
    return Vec3(data[r * 3 + 0], data[r * 3 + 1], data[r * 3 + 2]);
}

} // namespace realis
