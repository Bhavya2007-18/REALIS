// Invariant Framework Core Interfaces
// Defines specific contracts for Energy and Verified Simulation.
// Strict separation: Physics Engine DOES NOT compute energy. Verification DOES.

#pragma once
#include <vector>
#include <string>

namespace realis {

// The immutable ledger of a single simulation step
struct EnergyLedger {
    double time;
    double kinetic_energy;
    double potential_energy;
    double internal_energy;   // Thermodynamics (Placeholder)
    double dissipated_energy; // Loss (e.g. friction/damping)
    double work_done;         // External work input
    
    double total_energy() const {
        // E_tot = K + U + U_int - W_work
        // Dissipated is purely tracked for checking "where did it go"
        // In a closed system, Total should be constant.
        // In a damped system, K+U decreases, Dissipated increases.
        // Total (System) = K + U + U_int. 
        // Total (Universe) = Total (System) + Dissipated.
        return kinetic_energy + potential_energy + internal_energy + dissipated_energy;
    }

    double error(double baseline_total) const {
        return (total_energy() - baseline_total); // Absolute error
    }
};

// Interface for any physical component that holds energy
class EnergySource {
public:
    virtual ~EnergySource() = default;
    
    // Reports strictly the Kinetic Energy (Motion)
    virtual double get_kinetic_energy() const = 0;
    
    // Reports strictly the Potential Energy (Position/Deformation)
    virtual double get_potential_energy() const = 0;
    
    // Reports Internal Energy (Temperature/Phase) - Default 0
    virtual double get_internal_energy() const { return 0.0; }
    
    // Reports Dissipated Energy (Accumulated loss) - Default 0
    // Note: Models must track their own history of dissipation if applicable
    virtual double get_dissipated_energy() const { return 0.0; }
};

// Interface for global invariant verification
enum class InvariantStatus {
    VALID,
    NUMERICAL_ERROR, // Acceptable drift within tolerance
    VIOLATION        // Fundamental physics breakdown
};

struct InvariantReport {
    InvariantStatus status;
    EnergyLedger ledger;
    double drift_percent;
    std::string message;
};

} // namespace realis
