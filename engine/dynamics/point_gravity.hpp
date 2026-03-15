#pragma once
#include "force_field.hpp"
#include "rigid_body.hpp"
#include <cmath>

namespace realis {

class PointGravityField : public ForceField {
public:
    PointGravityField(Vec3 center, float strength = 1000.0f) 
        : center(center), strength(strength) {}

    Vec3 compute_force(const RigidBody &body) const override {
        Vec3 r = center - body.position;
        float distSq = r.dot(r);
        float dist = std::sqrt(distSq);
        if (dist < 0.1f) return Vec3(0, 0, 0); // Avoid singularity
        
        // F = G * m1 * m2 / r^2
        // We use a simplified 'strength' parameter instead of G*M
        return r * (strength * body.mass / (distSq * dist));
    }

    float compute_potential_energy(const RigidBody &body) const override {
        Vec3 r = center - body.position;
        float dist = std::sqrt(r.dot(r));
        if (dist < 0.1f) return 0.0f;
        // U = -strength * body.mass / dist
        return -strength * body.mass / dist;
    }

private:
    Vec3 center;
    float strength;
};

} // namespace realis
