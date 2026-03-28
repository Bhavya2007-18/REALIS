



#include "../../engine/core/integrator.hpp"
#include "../../engine/core/world.hpp"
#include "../../engine/dynamics/force_registry.hpp"
#include "../../engine/dynamics/rigid_body.hpp"
#include "../../engine/dynamics/spring_model.hpp"
#include "../../engine/verification/invariant_monitor.hpp"
#include <fstream>
#include <iomanip>
#include <iostream>

using namespace realis;
using namespace realis::dynamics;
using namespace realis::verification;

int main() {
  std::cout << "=== REALIS Invariant Framework Verification ===" << std::endl;

  
  RigidBody mass;
  mass.mass = 2.0f;
  mass.inv_mass = 0.5f;
  mass.position = Vec3(2.0, 0, 0); 
  mass.velocity = Vec3(0, 0, 0);

  
  
  SpringModel spring(&mass, Vec3(0, 0, 0), 10.0f, 0.0f);

  ForceRegistry forces;
  forces.add(&mass, &spring);

  
  InvariantMonitor monitor(0.1); 
  monitor.add_source(&spring); 
  
  
  
  
  
  

  
  float dt = 0.01f;
  int steps = 200; 

  std::ofstream ledger_csv("invariant_ledger.csv");
  ledger_csv << "time,total,kinetic,potential,drift,status\n";

  std::cout << "Baseline Energy: " << monitor.capture_ledger(0.0).total_energy()
            << " J (Expected ~20.0)\n";

  bool all_valid = true;

  for (int i = 0; i <= steps; ++i) {
    float time = i * dt;

    
    InvariantReport report = monitor.check_invariants(time);

    
    ledger_csv << std::fixed << std::setprecision(6) << report.ledger.time
               << "," << report.ledger.total_energy() << ","
               << report.ledger.kinetic_energy << ","
               << report.ledger.potential_energy << "," << report.drift_percent
               << "," << (int)report.status << "\n";

    if (i % 20 == 0) {
      monitor.print_ledger(report);
    }

    if (report.status == InvariantStatus::VIOLATION) {
      all_valid = false;
      std::cout << "!!! SIMULATION INVALIDATED BY INVARIANT CHECK !!!"
                << std::endl;
      break;
    }

    
    forces.update_forces(dt);

    std::vector<RigidBody *> sim_bodies = {&mass};
    SemiImplicitEuler integrator;
    integrator.step(sim_bodies, dt);
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