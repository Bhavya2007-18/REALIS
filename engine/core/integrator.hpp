// Numerical integrator
#pragma once
#include "../math/vec3.hpp"

namespace realis {

// Semi-implicit Euler (symplectic)
// v_new = v + a*dt
// x_new = x + v_new*dt  (uses updated velocity)
void integrate_semi_implicit_euler(Vec3& position, Vec3& velocity,
                                   const Vec3& acceleration, float dt);

} // namespace realis