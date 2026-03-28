

#pragma once
#include <string>
#include <vector>
#include <functional>
#include "../../engine/core/world.hpp"
#include "../../engine/dynamics/rigid_body.hpp"
#include "../../engine/geometry/sphere.hpp"
#include "../../engine/geometry/box.hpp"
#include "../../engine/constraints/distance_constraint.hpp"
#include "../../engine/geometry/contact_generator.hpp" 

namespace realis {
namespace viewer {


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
        
        auto floor = new RigidBody();
        floor->position = Vec3(0, -2, 0);
        floor->inv_mass = 0.0f; 
        auto boxShape = new geometry::Box(Vec3(5, 0.5, 5)); 
        floor->shape = boxShape;
        world.add_body(floor);
        
        
        
        
        auto box = new RigidBody();
        box->position = Vec3(0, 3, 0); 
        box->orientation = Quat::from_axis_angle(Vec3(0,0,1), 0.5f); 
        box->mass = 1.0f; box->inv_mass = 1.0f;
        auto bShape = new geometry::Box(Vec3(0.5, 0.5, 0.5));
        box->shape = bShape;
        world.add_body(box);
    }
    
    static void setup_pendulum(World& world) {
        
        auto pivot = new RigidBody();
        pivot->position = Vec3(0, 2, 0);
        pivot->inv_mass = 0.0f;
        pivot->shape = new geometry::Sphere(0.1f);
        world.add_body(pivot);
        
        
        auto bob = new RigidBody();
        bob->position = Vec3(2, 2, 0); 
        bob->mass = 1.0f; bob->inv_mass = 1.0f;
        bob->shape = new geometry::Sphere(0.2f);
        world.add_body(bob);
        
        
        auto c = new DistanceConstraint(pivot, bob, 2.0f);
        world.add_constraint(c);
        
        
    }
    
    static void setup_stacking(World& world) {
        
    }
    
    static void setup_double_pendulum(World& world) {
        
        auto p1 = new RigidBody();
        p1->position = Vec3(0, 3, 0);
        p1->inv_mass = 0.0f;
        p1->shape = new geometry::Sphere(0.1f);
        world.add_body(p1);
        
        
        auto b1 = new RigidBody();
        b1->position = Vec3(1, 3, 0); 
        b1->mass = 1.0f; b1->inv_mass = 1.0f;
        b1->shape = new geometry::Sphere(0.2f);
        world.add_body(b1);
        
        
        auto b2 = new RigidBody();
        b2->position = Vec3(2, 3, 0);
        b2->mass = 1.0f; b2->inv_mass = 1.0f;
        b2->shape = new geometry::Sphere(0.2f);
        world.add_body(b2);
        
        world.add_constraint(new DistanceConstraint(p1, b1, 1.0f));
        world.add_constraint(new DistanceConstraint(b1, b2, 1.0f));
    }
};

} 
} 