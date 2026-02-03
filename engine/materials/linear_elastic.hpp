// Linear Elastic Material (St. Venant-Kirchhoff or Corotational equivalent for small strain)
// Hooke's Law: sigma = 2*mu*epsilon + lambda*trace(epsilon)*I
#pragma once
#include "../continuum/constitutive_law.hpp"
#include <cmath>

namespace realis {
namespace materials {

class LinearElastic : public continuum::ConstitutiveLaw {
public:
    float youngs_modulus; // E (Pa)
    float poisson_ratio;  // nu
    float density;        // rho (kg/m^3)
    
    // Lame parameters
    float mu;    // Shear modulus
    float lambda; // Lame's first parameter

    LinearElastic(float E, float nu, float rho) 
        : youngs_modulus(E), poisson_ratio(nu), density(rho) 
    {
        // Compute Lame parameters
        // mu = E / (2 * (1 + nu))
        // lambda = (E * nu) / ((1 + nu) * (1 - 2 * nu))
        mu = E / (2.0f * (1.0f + nu));
        lambda = (E * nu) / ((1.0f + nu) * (1.0f - 2.0f * nu));
    }

    continuum::StressTensor compute_stress(const continuum::StrainTensor& strain, float /*dt*/) const override {
        // Sigma = 2*mu*Epsilon + lambda*tr(Epsilon)*I
        // Mat3 operations
        
        float tr = strain.trace();
        
        // 2*mu*eps
        Mat3 stress_mat = strain.data * (2.0f * mu);
        
        // + lambda*tr*I
        Mat3 identity = Mat3::identity();
        stress_mat = stress_mat + (identity * (lambda * tr));
        
        return continuum::StressTensor(stress_mat);
    }

    float compute_energy_density(const continuum::StrainTensor& strain) const override {
        // U = 0.5 * sigma : epsilon
        // For linear elastic: U = mu * eps:eps + 0.5 * lambda * tr(eps)^2
        // Let's use the stress tensor we compute.
        // U = 0.5 * Sum(sigma_ij * eps_ij)
        
        continuum::StressTensor sigma = compute_stress(strain, 0.0f);
        float energy = 0.0f;
        
        const float* s = sigma.data.data;
        const float* e = strain.data.data;
        
        for (int i = 0; i < 9; ++i) {
            energy += s[i] * e[i];
        }
        
        return 0.5f * energy;
    }
    
    bool is_valid(const continuum::StrainTensor& strain) const override {
        // Warn if trace is huge (Incompressibility violation usually, or just blowout)
        if (std::abs(strain.trace()) > 0.5f) return false;
        return true;
    }
};

} // namespace materials
} // namespace realis
