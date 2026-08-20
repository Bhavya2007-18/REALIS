



#pragma once
#include <vector>
#include <string>

namespace realis {


struct EnergyLedger {
    double time;
    double kinetic_energy;
    double potential_energy;
    double internal_energy;   
    double dissipated_energy; 
    double work_done;         
    
    double total_energy() const {
        
        
        
        
        
        
        return kinetic_energy + potential_energy + internal_energy + dissipated_energy;
    }

    double error(double baseline_total) const {
        return (total_energy() - baseline_total); 
    }
};


class EnergySource {
public:
    virtual ~EnergySource() = default;
    
    
    virtual double get_kinetic_energy() const = 0;
    
    
    virtual double get_potential_energy() const = 0;
    
    
    virtual double get_internal_energy() const { return 0.0; }
    
    
    
    virtual double get_dissipated_energy() const { return 0.0; }
};


enum class InvariantStatus {
    VALID,
    NUMERICAL_ERROR, 
    VIOLATION        
};

struct InvariantReport {
    InvariantStatus status;
    EnergyLedger ledger;
    double drift_percent;
    std::string message;
};

} 