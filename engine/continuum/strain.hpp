// Continuum Strain Tensor (Small Strain)
// Represents deformation: epsilon = 0.5 * (grad(u) + grad(u)^T)
// Valid only for small deformations (typically < 5%)
#pragma once
#include "../math/mat3.hpp"

namespace realis {
namespace continuum {

class StrainTensor {
public:
    Mat3 data;

    StrainTensor() : data() {}
    explicit StrainTensor(const Mat3& m) : data(m) {}

    // Trace (Volumetric Strain)
    float trace() const {
        return data.data[0] + data.data[4] + data.data[8];
    }
    
    // Deviatoric Strain
    Mat3 deviatoric() const {
        float mean = trace() / 3.0f;
        Mat3 dev = data;
        dev.data[0] -= mean;
        dev.data[4] -= mean;
        dev.data[8] -= mean;
        return dev;
    }
};

} // namespace continuum
} // namespace realis
