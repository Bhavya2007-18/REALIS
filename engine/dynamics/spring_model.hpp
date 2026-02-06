// Spring Model (Refactored Mass-Spring with Invariant Support)
// Implements both Force Generation (Physics) and Energy Reporting (Verification)

#pragma once
#include "../dynamics/force_registry.hpp"
#include "../core/invariant.hpp"
#include "../math/vec3.hpp"
#include "../dynamics/rigid_body.hpp"

namespace realis {
namespace dynamics {

// A complete Mass-Spring system model
// Owns the physics logic and the energy logic
class SpringModel : public ForceGenerator, public EnergySource {
private:
    RigidBody* body; // The mass
    Vec3 anchor;     // The fixed point
    double k;        // Spring constant (N/m)
    double rest_length;

public:
    SpringModel(RigidBody* b, const Vec3& anchor_pos, double stiffness, double length = 0.0)
        : body(b), anchor(anchor_pos), k(stiffness), rest_length(length) {}

    // --- Physics Interface (ForceGenerator) ---
    void update_force(RigidBody* b, float /*dt*/) override {
        // Strict check: only apply if it's our body (or allow shared spring logic)
        if (b != body) return;

        // F = -k * (|x| - rest) * norm(x)
        Vec3 d = body->position - anchor;
        double dist = d.magnitude();
        
        // Avoid singularity
        if (dist < 1e-6) return;
        
        double displacement = dist - rest_length;
        Vec3 dir = d * (1.0 / dist);
        
        Vec3 force = dir * (-k * displacement);
        body->apply_force(force);
    }

    // --- Verification Interface (EnergySource) ---
    double get_kinetic_energy() const override {
        // KE = 0.5 * m * v^2
        if (!body) return 0.0;
        double v_sq = body->velocity.dot(body->velocity);
        return 0.5 * body->mass * v_sq;
    }

    double get_potential_energy() const override {
        // PE_spring = 0.5 * k * x^2
        if (!body) return 0.0;
        Vec3 d = body->position - anchor;
        double dist = d.magnitude();
        double displacement = dist - rest_length;
        return 0.5 * k * displacement * displacement;
    }
};

} // namespace dynamics
} // namespace realis
