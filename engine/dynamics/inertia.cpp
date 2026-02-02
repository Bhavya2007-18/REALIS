// Inertia tensor helper functions
#include "mat3.hpp"
#include "../math/vec3.hpp"

namespace realis {

class Inertia {
public:
    static Mat3 box(float mass, float width, float height, float depth) {
        float ixx = (1.0f / 12.0f) * mass * (height * height + depth * depth);
        float iyy = (1.0f / 12.0f) * mass * (width * width + depth * depth);
        float izz = (1.0f / 12.0f) * mass * (width * width + height * height);
        
        Mat3 m;
        m.data[0] = ixx; m.data[1] = 0;   m.data[2] = 0;
        m.data[3] = 0;   m.data[4] = iyy; m.data[5] = 0;
        m.data[6] = 0;   m.data[7] = 0;   m.data[8] = izz;
        return m;
    }

    static Mat3 sphere(float mass, float radius) {
        float i = (2.0f / 5.0f) * mass * radius * radius;
        Mat3 m;
        m.data[0] = i; m.data[1] = 0; m.data[2] = 0;
        m.data[3] = 0; m.data[4] = i; m.data[5] = 0;
        m.data[6] = 0; m.data[7] = 0; m.data[8] = i;
        return m;
    }
};

} // namespace realis
