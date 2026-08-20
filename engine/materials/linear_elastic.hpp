

#pragma once
#include "../continuum/constitutive_law.hpp"
#include <cmath>

namespace realis {
namespace materials {

class LinearElastic : public continuum::ConstitutiveLaw {
public:
    float youngs_modulus; 
    float poisson_ratio;  
    float density;        
    
    
    float mu;    
    float lambda; 

    LinearElastic(float E, float nu, float rho) 
        : youngs_modulus(E), poisson_ratio(nu), density(rho) 
    {
        
        
        
        mu = E / (2.0f * (1.0f + nu));
        lambda = (E * nu) / ((1.0f + nu) * (1.0f - 2.0f * nu));
    }

    continuum::StressTensor compute_stress(const continuum::StrainTensor& strain, float ) const override {
        
        
        
        float tr = strain.trace();
        
        
        Mat3 stress_mat = strain.data * (2.0f * mu);
        
        
        Mat3 identity = Mat3::identity();
        stress_mat = stress_mat + (identity * (lambda * tr));
        
        return continuum::StressTensor(stress_mat);
    }

    float compute_energy_density(const continuum::StrainTensor& strain) const override {
        
        
        
        
        
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
        
        if (std::abs(strain.trace()) > 0.5f) return false;
        return true;
    }
};

} 
} 