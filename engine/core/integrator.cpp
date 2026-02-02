// Semi-implicit Euler integrator
// Ported from: physics_lab/integration/semi_implicit.py (lines 16-17, 40-41)
//
// Algorithm:
//   v(n+1) = v(n) + dt * a(n)     // Update velocity first
//   x(n+1) = x(n) + dt * v(n+1)   // Use updated velocity (symplectic!)

#include "integrator.hpp"

namespace realis {

void integrate_semi_implicit_euler(Vec3& position, Vec3& velocity, 
                                   const Vec3& acceleration, float dt) {
    // Step 1: Update velocity using current acceleration
    velocity = velocity + acceleration * dt;
    
    // Step 2: Update position using NEW velocity (this makes it symplectic)
    position = position + velocity * dt;
}

} // namespace realis
