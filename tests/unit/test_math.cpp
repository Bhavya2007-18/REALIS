// Unit tests for math components
#include "test_harness.hpp"
#include "../engine/math/vec3.hpp"
#include "../engine/math/quat.hpp"
#include "../engine/math/mat3.hpp"

using namespace realis;
using namespace realis::test;

bool test_vec3_ops() {
    Vec3 v1(1, 2, 3);
    Vec3 v2(4, 5, 6);
    
    // Add
    Vec3 v3 = v1 + v2;
    ASSERT_NEAR(v3.x, 5, 1e-6);
    ASSERT_NEAR(v3.y, 7, 1e-6);
    ASSERT_NEAR(v3.z, 9, 1e-6);
    
    // Dot
    float d = v1.dot(v2);
    ASSERT_NEAR(d, 32, 1e-6); // 1*4 + 2*5 + 3*6 = 4+10+18 = 32
    
    // Normalize
    Vec3 vn = Vec3(3, 0, 0).normalized();
    ASSERT_NEAR(vn.x, 1, 1e-6);
    ASSERT_NEAR(vn.y, 0, 1e-6);
    
    return true;
}

bool test_quat_rotation() {
    const float PI = 3.14159265f;
    // 90 deg rotation about Z
    Quat q = Quat::from_axis_angle(Vec3(0, 0, 1), PI/2.0f);
    Vec3 v(1, 0, 0);
    
    // rotate_vector logic check: q * v_as_quat * q_conj
    Quat vq(0, v.x, v.y, v.z);
    Quat res = q * vq * Quat(q.w, -q.x, -q.y, -q.z);
    
    // Expected: (0, 1, 0)
    ASSERT_NEAR(res.x, 0, 1e-6);
    ASSERT_NEAR(res.y, 1, 1e-6);
    ASSERT_NEAR(res.z, 0, 1e-6);
    
    return true;
}

int main() {
    TestRunner runner;
    runner.run("Vec3 Operations", test_vec3_ops);
    runner.run("Quaternion Rotation", test_quat_rotation);
    runner.summary();
    return runner.all_passed() ? 0 : 1;
}
