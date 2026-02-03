// Demo Factory
// Sets up Physics World for specific validation scenarios
#pragma once
#include <string>
#include <vector>
#include <functional>
#include "../../engine/core/world.hpp"
#include "../../engine/dynamics/rigid_body.hpp"
#include "../../engine/geometry/sphere.hpp"
#include "../../engine/geometry/box.hpp"
#include "../../engine/constraints/distance_constraint.hpp"
#include "../../engine/geometry/contact_generator.hpp" // For shapes

namespace realis {
namespace viewer {

// Demo Setup Function Signature
using DemoSetup = std::function<void(World&)>;

struct DemoInfo {
    std::string name;
    DemoSetup setup;
};

class DemoFactory {
public:
    static std::vector<DemoInfo> get_demos() {
        return {
            {"Falling Box (Gravity)", setup_falling_box},
            {"Pendulum (Constraint)", setup_pendulum},
            {"Stacking (Collision)", setup_stacking},
            {"Double Pendulum (Chaos)", setup_double_pendulum}
        };
    }
    
private:
    static void setup_falling_box(World& world) {
        // Floor
        auto floor = new RigidBody();
        floor->position = Vec3(0, -2, 0);
        floor->inv_mass = 0.0f; // Static
        auto boxShape = new geometry::Box(Vec3(5, 0.5, 5)); // 10m wide floor
        floor->shape = boxShape;
        world.add_body(floor);
        // Leak: we should manage memory via unique_ptr or World owns it.
        // For Phase 9 demo, we accept leaks or assuming World destructor cleans up (current impl doesn't).
        
        // Falling Box
        auto box = new RigidBody();
        box->position = Vec3(0, 3, 0); 
        box->orientation = Quat::from_axis_angle(Vec3(0,0,1), 0.5f); // Tilted
        box->mass = 1.0f; box->inv_mass = 1.0f;
        auto bShape = new geometry::Box(Vec3(0.5, 0.5, 0.5));
        box->shape = bShape;
        world.add_body(box);
    }
    
    static void setup_pendulum(World& world) {
        // Pivot (Static)
        auto pivot = new RigidBody();
        pivot->position = Vec3(0, 2, 0);
        pivot->inv_mass = 0.0f;
        pivot->shape = new geometry::Sphere(0.1f);
        world.add_body(pivot);
        
        // Bob
        auto bob = new RigidBody();
        bob->position = Vec3(2, 2, 0); // L=2
        bob->mass = 1.0f; bob->inv_mass = 1.0f;
        bob->shape = new geometry::Sphere(0.2f);
        world.add_body(bob);
        
        // Distance Constraint
        auto c = new DistanceConstraint(pivot, bob, 2.0f);
        world.add_constraint(c);
        
        // Start with 0 velocity -> Fall and swing
    }
    
    static void setup_stacking(World& world) {
        // Disabled for minimal build
    }
    
    static void setup_double_pendulum(World& world) {
        // Pivot
        auto p1 = new RigidBody();
        p1->position = Vec3(0, 3, 0);
        p1->inv_mass = 0.0f;
        p1->shape = new geometry::Sphere(0.1f);
        world.add_body(p1);
        
        // Bob 1
        auto b1 = new RigidBody();
        b1->position = Vec3(1, 3, 0); 
        b1->mass = 1.0f; b1->inv_mass = 1.0f;
        b1->shape = new geometry::Sphere(0.2f);
        world.add_body(b1);
        
        // Bob 2
        auto b2 = new RigidBody();
        b2->position = Vec3(2, 3, 0);
        b2->mass = 1.0f; b2->inv_mass = 1.0f;
        b2->shape = new geometry::Sphere(0.2f);
        world.add_body(b2);
        
        world.add_constraint(new DistanceConstraint(p1, b1, 1.0f));
        world.add_constraint(new DistanceConstraint(b1, b2, 1.0f));
    }
};

} // namespace viewer
} // namespace realis
