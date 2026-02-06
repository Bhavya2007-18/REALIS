// Invariant Monitor
// The "Veto Power" class. Checks energy conservation.
// Deterministic accounting.

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

    // Capture the current system state
    EnergyLedger capture_ledger(double time) {
        EnergyLedger ledger = {0};
        ledger.time = time;

        for (auto* s : sources) {
            ledger.kinetic_energy += s->get_kinetic_energy();
            ledger.potential_energy += s->get_potential_energy();
            ledger.internal_energy += s->get_internal_energy();
            ledger.dissipated_energy += s->get_dissipated_energy();
        }
        
        // Auto-set baseline on first capture if not set (or manual set required?)
        // Usually first frame is t=0
        if (!baseline_set) {
            initial_total_energy = ledger.total_energy();
            baseline_set = true;
        }

        return ledger;
    }

    // Capture state and verify against baseline
    InvariantReport check_invariants(double time) {
        EnergyLedger ledger = capture_ledger(time);
        double current_total = ledger.total_energy();
        
        double diff = current_total - initial_total_energy;
        double drift = 0.0;
        
        // Avoid div by zero
        if (std::abs(initial_total_energy) > 1e-9) {
            drift = (diff / initial_total_energy) * 100.0;
        } else if (std::abs(current_total) > 1e-9) {
            // Started at 0, now have energy -> Infinite error (Spontaneous creation)
            drift = 100.0; 
        }

        InvariantReport report;
        report.ledger = ledger;
        report.drift_percent = drift;
        
        if (std::abs(drift) > 5.0) { // Gross Violation
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
    
    // Printer helper
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

} // namespace verification
} // namespace realis
