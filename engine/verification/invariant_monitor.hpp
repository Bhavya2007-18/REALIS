



#pragma once
#include <vector>
#include <iostream>
#include <iomanip>
#include <cmath>
#include "../core/invariant.hpp"

namespace realis {
namespace verification {

class InvariantMonitor {
private:
    std::vector<EnergySource*> sources;
    double initial_total_energy;
    bool baseline_set;
    double tolerance_percent;

public:
    InvariantMonitor(double tolerance = 0.1) 
        : initial_total_energy(0.0)
        , baseline_set(false)
        , tolerance_percent(tolerance) {}

    void add_source(EnergySource* source) {
        sources.push_back(source);
    }

    void reset() {
        sources.clear();
        baseline_set = false;
        initial_total_energy = 0.0;
    }

    
    EnergyLedger capture_ledger(double time) {
        EnergyLedger ledger = {0};
        ledger.time = time;

        for (auto* s : sources) {
            ledger.kinetic_energy += s->get_kinetic_energy();
            ledger.potential_energy += s->get_potential_energy();
            ledger.internal_energy += s->get_internal_energy();
            ledger.dissipated_energy += s->get_dissipated_energy();
        }
        
        
        
        if (!baseline_set) {
            initial_total_energy = ledger.total_energy();
            baseline_set = true;
        }

        return ledger;
    }

    
    InvariantReport check_invariants(double time) {
        EnergyLedger ledger = capture_ledger(time);
        double current_total = ledger.total_energy();
        
        double diff = current_total - initial_total_energy;
        double drift = 0.0;
        
        
        if (std::abs(initial_total_energy) > 1e-9) {
            drift = (diff / initial_total_energy) * 100.0;
        } else if (std::abs(current_total) > 1e-9) {
            
            drift = 100.0; 
        }

        InvariantReport report;
        report.ledger = ledger;
        report.drift_percent = drift;
        
        if (std::abs(drift) > 5.0) { 
             report.status = InvariantStatus::VIOLATION;
             report.message = "CRITICAL: Energy Conservation Violation > 5%";
        } else if (std::abs(drift) > tolerance_percent) {
             report.status = InvariantStatus::NUMERICAL_ERROR;
             report.message = "WARNING: Energy Drift exceeds tolerance";
        } else {
             report.status = InvariantStatus::VALID;
             report.message = "OK";
        }
        
        return report;
    }
    
    
    void print_ledger(const InvariantReport& report) {
        std::cout << std::fixed << std::setprecision(6);
        std::cout << "[T=" << report.ledger.time << "] ";
        std::cout << "E_tot=" << report.ledger.total_energy() << " ";
        std::cout << "(K=" << report.ledger.kinetic_energy << ", ";
        std::cout << "U=" << report.ledger.potential_energy << ") ";
        std::cout << "Drift=" << report.drift_percent << "% ";
        std::cout << "[" << report.message << "]" << std::endl;
    }
};

} 
} 