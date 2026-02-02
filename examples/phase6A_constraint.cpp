// Phase 6A Demonstration: General Constraint Framework
// Validates stability of math-based distance constraints

#include "../engine/core/world.hpp"
#include "../engine/dynamics/rigid_body.hpp"
#include "../engine/constraints/distance_constraint.hpp"
#include <iostream>
#include <iomanip>
#include <cmath>

using namespace realis;

void run_constraint_stability_test() {
    std::cout << "=== Phase 6 (Part A): Constraint Stability Test ===" << std::endl;
    std::cout << "Scenario: Two bodies joined by a 2.0m Distance Constraint" << std::endl;
    std::cout << "Body A is fixed at the origin (inv_mass = 0)" << std::endl;
    std::cout << "Body B starts at (2, -1, 0) and falls under gravity" << std::endl;

    // 1. Setup World
    float dt = 0.01f;
    World world(dt);

    // 2. Setup Bodies
    RigidBody bodyA;
    bodyA.position = Vec3(0, 0, 0);
    bodyA.velocity = Vec3(0, 0, 0);
    bodyA.mass = 1.0f;
    bodyA.inv_mass = 0.0f; // Static/Infinite mass

    RigidBody bodyB;
    bodyB.position = Vec3(2.0f, 0.0f, 0.0f); // Horizontal to start
    bodyB.velocity = Vec3(0, 0, 0);
    bodyB.mass = 1.0f;
    bodyB.inv_mass = 1.0f;

    // 3. Add Distance Constraint (Linker)
    float targetDist = 2.0f;
    DistanceConstraint link(&bodyA, &bodyB, targetDist);
    
    // We need a way to pass these bodies to the solver.
    // In Phase 6A we'll manually step them for the demo since the World legacy
    // code only handles one point mass.
    
    ConstraintSolver solver(15); // 15 iterations for better stability
    std::vector<Constraint*> constraints = { &link };

    std::cout << std::fixed << std::setprecision(6);
    std::cout << "Initial Distance: " << (bodyB.position - bodyA.position).magnitude() << " m" << std::endl;

    Vec3 gravity(0, -9.81f, 0);

    for (int i = 0; i < 200; ++i) {
        // Step A: Dynamics (Integrate velocity)
        if (bodyB.inv_mass > 0) {
            bodyB.velocity = bodyB.velocity + gravity * dt;
            bodyB.position = bodyB.position + bodyB.velocity * dt;
        }

        // Step B: Resolve Constraints
        solver.solve(constraints, dt);

        if (i % 40 == 0) {
            float d = (bodyB.position - bodyA.position).magnitude();
            std::cout << "[Step " << i << "] t=" << i*dt << "s, Distance=" << d 
                      << " m, PosB=(" << bodyB.position.x << ", " << bodyB.position.y << ")" << std::endl;
        }
    }

    float finalDist = (bodyB.position - bodyA.position).magnitude();
    float error = std::abs(finalDist - targetDist);
    
    std::cout << std::endl << "=== Results ===" << std::endl;
    std::cout << "Final Distance: " << finalDist << " m" << std::endl;
    std::cout << "Constraint Error: " << error << " m" << std::endl;

    if (error < 0.01f) {
        std::cout << "✓ PASS: Constraint stability within tolerance (Baumgarte stabilization works)" << std::endl;
    } else {
        std::cout << "✗ FAIL: Significant constraint drift detected" << std::endl;
    }
}

int main() {
    run_constraint_stability_test();
    return 0;
}
