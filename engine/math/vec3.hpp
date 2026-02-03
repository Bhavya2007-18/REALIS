// 3D vector class
#pragma once

namespace realis {

struct Vec3 {
    float x, y, z;
    
    Vec3() : x(0), y(0), z(0) {}
    Vec3(float x_, float y_, float z_) : x(x_), y(y_), z(z_) {}
    
    // Vector operations
    Vec3 operator+(const Vec3& v) const { return Vec3(x + v.x, y + v.y, z + v.z); }
    Vec3 operator-(const Vec3& v) const { return Vec3(x - v.x, y - v.y, z - v.z); }
    Vec3 operator*(float s) const { return Vec3(x * s, y * s, z * s); }
    
    float dot(const Vec3& v) const { return x * v.x + y * v.y + z * v.z; }
    Vec3 cross(const Vec3& v) const {
        return Vec3(y * v.z - z * v.y, z * v.x - x * v.z, x * v.y - y * v.x);
    }
    
    float magnitude() const;
    Vec3 normalized() const;
    
    // Accessor
    float& operator[](int i) {
        if (i == 0) return x;
        if (i == 1) return y;
        return z;
    }
    float operator[](int i) const {
        if (i == 0) return x;
        if (i == 1) return y;
        return z;
    }
};

} // namespace realis