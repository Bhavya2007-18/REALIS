// Constitutive Law Interface
// Defines the relationship between Stress and Strain
// Sigma = C : Epsilon
#pragma once
#include "stress.hpp"
#include "strain.hpp"

namespace realis {
namespace continuum {

class ConstitutiveLaw {
public:
    virtual ~ConstitutiveLaw() = default;

    // Compute Stress from Strain
    // Explicit time integration might require strain rate too (viscosity)
    virtual StressTensor compute_stress(const StrainTensor& strain, float dt) const = 0;

    // Energy Density (Strain Energy per unit volume)
    // U = 0.5 * sigma : epsilon (for linear elastic)
    virtual float compute_energy_density(const StrainTensor& strain) const = 0;

    // Material Limits (Sanity Check)
    virtual bool is_valid(const StrainTensor& strain) const {
        // Default check: small strain assumption violation
        // E.g., if strain > 5%, warn or fail?
        // For Phase 7, we just document it.
        return true; 
    }
};

} // namespace continuum
} // namespace realis
