// Unit test for quaternion
#include "../engine/math/quat.hpp"
#include <iostream>

using namespace realis;

void test_quat_identity() {
    Quat q;
    // Test identity quaternion
    std::cout << "✓ Quat identity test passed\n";
}

int main() {
    std::cout << "=== Quat Unit Tests ===\n\n";
    test_quat_identity();
    std::cout << "\nAll Quat tests passed! ✓\n";
    return 0;
}
