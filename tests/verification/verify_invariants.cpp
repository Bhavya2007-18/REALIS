// Invariant Verification Suite
// Validates the foundational energy framework.
// Runs a managed simulation and proves energy conservation.

#include "../../engine/core/world.hpp"
#include "../../engine/dynamics/rigid_body.hpp"
#include "../../engine/dynamics/force_registry.hpp"
#include "../../engine/dynamics/spring_model.hpp"
#include "../../engine/verification/invariant_monitor.hpp"
#include <iostream>
#include <fstream>
#include <iomanip>

using namespace realis;
using namespace realis::dynamics;
using namespace realis::verification;

int main() {
    std::cout << "=== REALIS Invariant Framework Verification ===" << std::endl;
    
    // 1. Setup Simulation
    RigidBody mass;
    mass.mass = 2.0f;
    mass.inv_mass = 0.5f;
    mass.position = Vec3(2.0, 0, 0); // 2m displacement
    mass.velocity = Vec3(0, 0, 0);
    
    // Spring (K=10, Rest=0)
    // PE = 0.5 * 10 * 2^2 = 20 J
    SpringModel spring(&mass, Vec3(0,0,0), 10.0f, 0.0f);
    
    ForceRegistry forces;
    forces.add(&mass, &spring);
    
    // 2. Setup Invariant Monitor
    InvariantMonitor monitor(0.1); // 0.1% tolerance
    monitor.add_source(&spring); // Spring knows about the mass and the potential
    // Wait, kinetic energy is usually tracked by the body itself?
    // SpringModel::get_kinetic_energy() reads the body.
    // So adding the spring covers both K (from mass) and U (from spring).
    // This assumes SpringModel "owns" the mass for energy reporting.
    // In a complex scene, we might add Bodies and Forces separately as sources.
    // But SpringModel encapsulates the SYSTEM here. Correct.
    
    // 3. Run Simulation
    float dt = 0.01f;
    int steps = 200; // 2 seconds
    
    std::ofstream ledger_csv("invariant_ledger.csv");
    ledger_csv << "time,total,kinetic,potential,drift,status\n";

    std::cout << "Baseline Energy: " << monitor.capture_ledger(0.0).total_energy() << " J (Expected ~20.0)\n";
    
    bool all_valid = true;
    
    for (int i = 0; i <= steps; ++i) {
        float time = i * dt;
        
        // A. Verify BEFORE Step (Pre-Integration State)
        InvariantReport report = monitor.check_invariants(time);
        
        // Log to CSV
        ledger_csv << std::fixed << std::setprecision(6)
                   << report.ledger.time << ","
                   << report.ledger.total_energy() << ","
                   << report.ledger.kinetic_energy << ","
                   << report.ledger.potential_energy << ","
                   << report.drift_percent << ","
                   << (int)report.status << "\n";
                   
        if (i % 20 == 0) {
            monitor.print_ledger(report);
        }
        
        if (report.status == InvariantStatus::VIOLATION) {
            all_valid = false;
            std::cout << "!!! SIMULATION INVALIDATED BY INVARIANT CHECK !!!" << std::endl;
            break;
        }
        
        // B. Step Physics
        forces.update_forces(dt);
        mass.integrate(dt); // Semi-Implicit Euler
    }
    
    ledger_csv.close();
    
    if (all_valid) {
        std::cout << "SUCCESS: Invariant Verification Passed." << std::endl;
        std::cout << "Ledger saved to 'invariant_ledger.csv'." << std::endl;
        return 0;
    } else {
        std::cout << "FAILURE: Invariant Violation Detected." << std::endl;
        return 1;
    }
}
