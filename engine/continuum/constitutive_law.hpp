


#pragma once
#include "stress.hpp"
#include "strain.hpp"

namespace realis {
namespace continuum {

class ConstitutiveLaw {
public:
    virtual ~ConstitutiveLaw() = default;

    
    
    virtual StressTensor compute_stress(const StrainTensor& strain, float dt) const = 0;

    
    
    virtual float compute_energy_density(const StrainTensor& strain) const = 0;

    
    virtual bool is_valid(const StrainTensor& strain) const {
        
        
        
        return true; 
    }
};

} 
} 