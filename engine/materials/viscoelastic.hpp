

#pragma once
#include "linear_elastic.hpp"

namespace realis {
namespace materials {

class ViscoElastic : public LinearElastic {
public:
    float viscosity; 
    mutable continuum::StrainTensor prev_strain; 
    mutable bool first_step = true;

    ViscoElastic(float E, float nu, float rho, float eta) 
        : LinearElastic(E, nu, rho), viscosity(eta) {}

    continuum::StressTensor compute_stress(const continuum::StrainTensor& strain, float dt) const override {
        
        continuum::StressTensor elastic = LinearElastic::compute_stress(strain, dt);
        
        if (dt <= 1e-9f || first_step) {
            prev_strain = strain;
            first_step = false;
            return elastic;
        }
        
        
        
        Mat3 dEps = (strain.data + (prev_strain.data * -1.0f)) * (1.0f / dt);
        
        Mat3 viscous = dEps * viscosity;
        
        
        prev_strain = strain;
        
        
        return continuum::StressTensor(elastic.data + viscous);
    }
    
    
    
    
    
};

} 
} 