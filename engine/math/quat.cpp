// Quaternion implementation
#include "quat.hpp"
#include <cmath>

namespace realis {

Quat Quat::operator*(const Quat &other) const {
  return Quat(w * other.w - x * other.x - y * other.y - z * other.z,
              w * other.x + x * other.w + y * other.z - z * other.y,
              w * other.y - x * other.z + y * other.w + z * other.x,
              w * other.z + x * other.y - y * other.x + z * other.w);
}

void Quat::normalize() {
  float magSq = w * w + x * x + y * y + z * z;
  if (magSq > 0.0f) {
    float mag = std::sqrt(magSq);
    w /= mag;
    x /= mag;
    y /= mag;
    z /= mag;
  }
}

Quat Quat::from_axis_angle(const Vec3 &axis, float angle) {
  Vec3 unitAxis = axis.normalized();
  float halfAngle = angle * 0.5f;
  float s = std::sin(halfAngle);
  return Quat(std::cos(halfAngle), unitAxis.x * s, unitAxis.y * s,
              unitAxis.z * s);
}

Quat Quat::from_euler(float x, float y, float z) {
  // ZYX Euler angles
  float cx = std::cos(x * 0.5f), sx = std::sin(x * 0.5f);
  float cy = std::cos(y * 0.5f), sy = std::sin(y * 0.5f);
  float cz = std::cos(z * 0.5f), sz = std::sin(z * 0.5f);

  return Quat(cx * cy * cz + sx * sy * sz, sx * cy * cz - cx * sy * sz,
              cx * sy * cz + sx * cy * sz, cx * cy * sz - sx * sy * cz);
}

Vec3 Quat::rotate(const Vec3 &v) const {
  Quat p(0, v.x, v.y, v.z);
  Quat result = (*this) * p * conjugate();
  return Vec3(result.x, result.y, result.z);
}

Mat3 Quat::to_mat3() const {
  float x2 = x + x, y2 = y + y, z2 = z + z;
  float xx = x * x2, xy = x * y2, xz = x * z2;
  float yy = y * y2, yz = y * z2, zz = z * z2;
  float wx = w * x2, wy = w * y2, wz = w * z2;

  Mat3 m;
  m.data[0] = 1.0f - (yy + zz);
  m.data[1] = xy - wz;
  m.data[2] = xz + wy;

  m.data[3] = xy + wz;
  m.data[4] = 1.0f - (xx + zz);
  m.data[5] = yz - wx;

  m.data[6] = xz - wy;
  m.data[7] = yz + wx;
  m.data[8] = 1.0f - (xx + yy);

  return m;
}

} // namespace realis
