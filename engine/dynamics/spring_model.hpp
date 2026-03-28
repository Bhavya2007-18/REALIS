


#pragma once
#include "../dynamics/force_registry.hpp"
#include "../core/invariant.hpp"
#include "../math/vec3.hpp"
#include "../dynamics/rigid_body.hpp"

namespace realis {
namespace dynamics {



class SpringModel : public ForceGenerator, public EnergySource {
private:
    RigidBody* body; 
    Vec3 anchor;     
    double k;        
    double rest_length;

public:
    SpringModel(RigidBody* b, const Vec3& anchor_pos, double stiffness, double length = 0.0)
        : body(b), anchor(anchor_pos), k(stiffness), rest_length(length) {}

    
    void update_force(RigidBody* b, float ) override {
        
        if (b != body) return;

        
        Vec3 d = body->position - anchor;
        double dist = d.magnitude();
        
        
        if (dist < 1e-6) return;
        
        double displacement = dist - rest_length;
        Vec3 dir = d * (1.0 / dist);
        
        Vec3 force = dir * (-k * displacement);
        body->apply_force(force);
    }

    
    double get_kinetic_energy() const override {
        
        if (!body) return 0.0;
        double v_sq = body->velocity.dot(body->velocity);
        return 0.5 * body->mass * v_sq;
    }

    double get_potential_energy() const override {
        
        if (!body) return 0.0;
        Vec3 d = body->position - anchor;
        double dist = d.magnitude();
        double displacement = dist - rest_length;
        return 0.5 * k * displacement * displacement;
    }
};

} 
} 