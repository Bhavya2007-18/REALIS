// Physics conservation tests
#include "../test_harness.hpp"
#include "../../engine/dynamics/rigid_body.hpp"
#include "../../engine/collision/collision_detector.hpp"
#include "../../engine/dynamics/contact_resolver.hpp"

using namespace realis;
using namespace realis::test;

bool test_momentum_conservation() {
    RigidBody a, b;
    a.position = Vec3(-1, 0, 0); a.velocity = Vec3(2, 0, 0);
    b.position = Vec3(1, 0, 0); b.velocity = Vec3(0, 0, 0);
    
    float p_initial = a.mass * a.velocity.x + b.mass * b.velocity.x;
    
    Contact contact = CollisionDetector::get_contact(a, b);
    if(contact.colliding) {
        ContactResolver::resolve_contact(a, b, contact);
    }
    
    float p_final = a.mass * a.velocity.x + b.mass * b.velocity.x;
    ASSERT_NEAR(p_initial, p_final, 1e-5);
    
    return true;
}

int main() {
    TestRunner runner;
    runner.run("Momentum Conservation", test_momentum_conservation);
    runner.summary();
    return runner.all_passed() ? 0 : 1;
}
