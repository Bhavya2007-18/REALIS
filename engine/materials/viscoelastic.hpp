// Viscoelastic Material (Kelvin-Voigt)
// Sigma = Sigma_elastic + eta * dEpsilon/dt
#pragma once
#include "linear_elastic.hpp"

namespace realis {
namespace materials {

class ViscoElastic : public LinearElastic {
public:
    float viscosity; // eta (Pa*s)
    mutable continuum::StrainTensor prev_strain; // Internal state for rate
    mutable bool first_step = true;

    ViscoElastic(float E, float nu, float rho, float eta) 
        : LinearElastic(E, nu, rho), viscosity(eta) {}

    continuum::StressTensor compute_stress(const continuum::StrainTensor& strain, float dt) const override {
        // Elastic Part
        continuum::StressTensor elastic = LinearElastic::compute_stress(strain, dt);
        
        if (dt <= 1e-9f || first_step) {
            prev_strain = strain;
            first_step = false;
            return elastic;
        }
        
        // Viscous Part: eta * (strain - prev)/dt
        // Strain rate
        Mat3 dEps = (strain.data + (prev_strain.data * -1.0f)) * (1.0f / dt);
        
        Mat3 viscous = dEps * viscosity;
        
        // Update state
        prev_strain = strain;
        
        // Total
        return continuum::StressTensor(elastic.data + viscous);
    }
    
    // Energy density includes finding dissipated energy?
    // The base method returns stored potential energy.
    // Dissipation is path dependent. 
    // For Phase 7, we stick to potential energy report.
};

} // namespace materials
} // namespace realis
