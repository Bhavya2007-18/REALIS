// Phase 6 Validation Demo: Stacking Stability
// Verifies the complete pipeline: Geometry -> Contact -> Constraint -> Solver
#include "../engine/core/world.hpp"
#include "../engine/dynamics/rigid_body.hpp"
#include "../engine/geometry/sphere.hpp"
#include "../engine/geometry/box.hpp"
#include "../engine/geometry/contact_generator.hpp"
#include "../engine/constraints/contact_constraint.hpp"
#include "../engine/constraints/constraint_solver.hpp"
#include <iostream>
#include <vector>
#include <iomanip>

using namespace realis;
using namespace realis::geometry;

void run_stacking_test() {
    std::cout << "=== Phase 6 validation: Stacking Stability ===" << std::endl;
    // Scenario: Sphere falling on another Sphere (resting contact check)
    // 3 Spheres stack: Bottom (Fixed), Middle, Top.
    
    float dt = 0.01f;
    World world(dt); // Still manages integration
    
    // Shapes
    Sphere sphereShape(0.5f); // Radius 0.5
    
    // Bodies
    // 1. Bottom (Fixed) at Y=0
    RigidBody b1;
    b1.position = Vec3(0, 0, 0); 
    b1.shape = &sphereShape;
    b1.inv_mass = 0.0f; // Fixed
    
    // 2. Middle at Y=1.2 (0.2 drop)
    RigidBody b2;
    b2.position = Vec3(0, 1.2f, 0); 
    b2.shape = &sphereShape;
    b2.mass = 1.0f; b2.inv_mass = 1.0f;
    
    // 3. Top at Y=2.4 (0.4 drop)
    RigidBody b3;
    b3.position = Vec3(0, 2.4f, 0);
    b3.shape = &sphereShape;
    b3.mass = 1.0f; b3.inv_mass = 1.0f;
    
    std::vector<RigidBody*> bodies = { &b1, &b2, &b3 };
    ConstraintSolver solver(10);
    Vec3 gravity(0, -9.81f, 0);
    
    std::cout << std::fixed << std::setprecision(4);
    
    for (int step = 0; step < 200; ++step) {
        // 1. External Forces & Integration (Candidate Step)
        for (auto b : bodies) {
            if (b->inv_mass > 0) {
                b->velocity = b->velocity + gravity * dt;
                b->position = b->position + b->velocity * dt;
            }
        }
        
        // 2. Narrow Phase (Contact Generation)
        // Check n^2 pairs (Optimization: Broadphase removed for clarity)
        std::vector<std::unique_ptr<ContactConstraint>> constraints;
        std::vector<Constraint*> solver_input;
        
        for (size_t i = 0; i < bodies.size(); ++i) {
            for (size_t j = i + 1; j < bodies.size(); ++j) {
                RigidBody* A = bodies[i];
                RigidBody* B = bodies[j];
                
                ContactManifold manifold = ContactGenerator::generate(
                    A->shape, A->position, A->orientation,
                    B->shape, B->position, B->orientation
                );
                
                if (!manifold.points.empty()) {
                    // Create constraints for each point
                    for (const auto& pt : manifold.points) {
                        auto c = std::make_unique<ContactConstraint>(A, B, pt);
                        solver_input.push_back(c.get());
                        constraints.push_back(std::move(c));
                    }
                }
            }
        }
        
        // 3. Solver
        if (!solver_input.empty()) {
            solver.solve(solver_input, dt);
        }
        
        // Log State
        if (step % 20 == 0) {
            std::cout << "[Step " << step << "] "
                      << "Y_mid=" << b2.position.y << " "
                      << "Y_top=" << b3.position.y << " "
                      << "Constraints=" << constraints.size() << std::endl;
        }
    }
    
    // Validation
    // Radius sum = 1.0. Bottom at 0. Middle should rest at ~1.0. Top at ~2.0.
    float err2 = std::abs(b2.position.y - 1.0f);
    float err3 = std::abs(b3.position.y - 2.0f);
    
    std::cout << std::endl << "=== Results ===" << std::endl;
    std::cout << "Target Y: 1.0000, Actual Y: " << b2.position.y << std::endl;
    std::cout << "Target Y: 2.0000, Actual Y: " << b3.position.y << std::endl;
    
    if (err2 < 0.05f && err3 < 0.05f) {
        std::cout << "✓ PASS: Stable stacking achieved!" << std::endl;
    } else {
        std::cout << "✗ FAIL: Stacking unstable or penetration too high." << std::endl;
    }
}

int main() {
    run_stacking_test();
    return 0;
}
