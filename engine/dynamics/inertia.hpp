// Inertia Tensor Helpers
#pragma once
#include "../math/mat3.hpp"

namespace realis {

class Inertia {
public:
    static Mat3 box(float mass, float width, float height, float depth);
    static Mat3 sphere(float mass, float radius);
    static Mat3 cylinder(float mass, float radius, float height);
};

} // namespace realis
