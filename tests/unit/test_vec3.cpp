// Unit test for Vec3
#include "../engine/math/vec3.hpp"
#include <cassert>
#include <cmath>
#include <iostream>

using namespace realis;

void test_vec3_addition() {
    Vec3 v1(1, 2, 3);
    Vec3 v2(4, 5, 6);
    Vec3 result = v1 + v2;
    
    assert(result.x == 5);
    assert(result.y == 7);
    assert(result.z == 9);
    
    std::cout << "✓ Vec3 addition test passed\n";
}

void test_vec3_dot_product() {
    Vec3 v1(1, 0, 0);
    Vec3 v2(0, 1, 0);
    
    float dot = v1.dot(v2);
    assert(std::abs(dot) < 1e-6);
    
    std::cout << "✓ Vec3 dot product test passed\n";
}

void test_vec3_cross_product() {
    Vec3 x(1, 0, 0);
    Vec3 y(0, 1, 0);
    Vec3 z = x.cross(y);
    
    assert(std::abs(z.x) < 1e-6);
    assert(std::abs(z.y) < 1e-6);
    assert(std::abs(z.z - 1.0f) < 1e-6);
    
    std::cout << "✓ Vec3 cross product test passed\n";
}

int main() {
    std::cout << "=== Vec3 Unit Tests ===\n\n";
    
    test_vec3_addition();
    test_vec3_dot_product();
    test_vec3_cross_product();
    
    std::cout << "\nAll Vec3 tests passed! ✓\n";
    return 0;
}
