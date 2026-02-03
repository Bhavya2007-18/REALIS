// Continuum Stress Tensor (Cauchy)
// Represents the internal forces per unit area within a deformable body.
#pragma once
#include "../math/mat3.hpp"

namespace realis {
namespace continuum {

// Symmetric 3x3 Stress Tensor (Sigma)
// Units: Pascals (N/m^2)
class StressTensor {
public:
    Mat3 data;

    StressTensor() : data() {} // Zero initialized
    explicit StressTensor(const Mat3& m) : data(m) {}

    // Stress is symmetric: sigma_ij = sigma_ji
    // This wrapper enforces or assumes symmetry in operations
    
    // Voigt Notation Helper (3D)
    // Returns {XX, YY, ZZ, YZ, XZ, XY}
    // Useful for FEM assembly
    // Note: Engineering strain uses 2*gamma, be careful with conversions.
    
    static StressTensor from_voigt(float xx, float yy, float zz, float yz, float xz, float xy) {
        Mat3 m;
        m.data[0] = xx; m.data[1] = xy; m.data[2] = xz;
        m.data[3] = xy; m.data[4] = yy; m.data[5] = yz;
        m.data[6] = xz; m.data[7] = yz; m.data[8] = zz;
        return StressTensor(m);
    }
};

} // namespace continuum
} // namespace realis
