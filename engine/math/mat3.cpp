// 3x3 matrix implementation
#include "mat3.hpp"

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

Mat3 Mat3::transpose() const {
    Mat3 res;
    res.data[0] = data[0]; res.data[1] = data[3]; res.data[2] = data[6];
    res.data[3] = data[1]; res.data[4] = data[4]; res.data[5] = data[7];
    res.data[6] = data[2]; res.data[7] = data[5]; res.data[8] = data[8];
    return res;
}

} // namespace realis
