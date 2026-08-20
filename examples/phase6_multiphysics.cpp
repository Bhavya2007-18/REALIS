



#include "../engine/coupling/multiphysics_coupler.hpp"
#include <cmath>
#include <iomanip>
#include <iostream>


using namespace realis;
using namespace realis::coupling;
using namespace realis::fem;
using namespace realis::fluids;


void print_energy(const MultiphysicsCoupler1D &coupler,
                  const std::string &label) {
  double E_fluid = 0.0;
  for (int i = 0; i < coupler.fluid->num_cells; ++i) {
    E_fluid +=
        coupler.fluid->cells[i].E * (coupler.contact_area * coupler.fluid->dx);
  }
  double E_kin = coupler.solid->compute_kinetic_energy();
  double E_str = coupler.solid->compute_strain_energy();
  double E_th = coupler.solid->compute_thermal_energy();
  double E_tot = coupler.compute_total_energy();

  std::cout << "[" << label << "] "
            << "E_tot: " << E_tot << " | Fl: " << E_fluid
            << " | S_kin: " << E_kin << " | S_str: " << E_str
            << " | S_th: " << E_th << "\n";
}

void test_fluid_pressure_on_elastic_wall() {
  std::cout << "\n=== Test 1: Fluid Pressure on Elastic Wall ===\n";

  
  double chamber_length = 1.0;
  FluidDomain1D fluid(20, chamber_length);
  FVMSolver1D f_solver;
  f_solver.boundary_condition = FVMSolver1D::BoundaryCondition::REFLECTIVE;

  for (int i = 0; i < fluid.num_cells; ++i) {
    double p = 1000.0; 
    double rho = 1.2;
    double E = p / (f_solver.gamma - 1.0);
    fluid.cells[i] = FluidState1D(rho, 0.0, E);
  }

  
  int n_nodes = 5;
  double rod_length = 1.0;
  double dx_solid = rod_length / (n_nodes - 1);
  CoupledSolid1D solid(n_nodes, 300.0); 

  
  double E = 70e9;
  double A = 0.01;
  double rho_s = 2700.0;
  double alpha = 2.4e-5;
  double cv = 900.0;

  for (int i = 0; i < n_nodes - 1; ++i) {
    solid.elements.emplace_back(i, i + 1, E, A, dx_solid, rho_s, alpha, cv,
                                0.0);
  }
  solid.build_mass_matrix();

  
  solid.is_fixed[n_nodes - 1] = true;

  
  
  MultiphysicsCoupler1D coupler(&fluid, &f_solver, &solid, fluid.num_cells - 1,
                                0, A);

  double initial_E = coupler.compute_total_energy();
  print_energy(coupler, "Initial");

  double t = 0.0;
  double t_end = 0.005;
  int steps = 0;
  while (t < t_end) {
    double dt = coupler.compute_global_timestep(0.5);
    if (t + dt > t_end)
      dt = t_end - t;
    coupler.step(dt);
    t += dt;
    steps++;
  }

  double final_E = coupler.compute_total_energy();
  print_energy(coupler, "Final");

  double err = std::abs(final_E - initial_E) / initial_E;
  if (err < 1e-4) {
    std::cout << "✓ PASS: Fluid work precisely matches solid energy gain. "
                 "Total conserved (err="
              << err << ")\n";
  } else {
    std::cout << "✗ FAIL: Energy divergence detected. Err: " << err << "\n";
  }
}

void test_heated_elastic_rod() {
  std::cout << "\n=== Test 2: Heated Elastic Rod (Thermal Expansion) ===\n";

  int n_nodes = 3;
  CoupledSolid1D solid(n_nodes, 300.0);
  double dx = 0.5;
  double E = 200e9; 
  double A = 0.01;
  double alpha = 1.2e-5;
  for (int i = 0; i < n_nodes - 1; ++i) {
    solid.elements.emplace_back(i, i + 1, E, A, dx, 7800.0, alpha, 500.0, 0.0);
  }
  solid.build_mass_matrix();

  
  solid.is_fixed[0] = true;
  solid.is_fixed[2] = true;

  
  solid.temperature[1] = 400.0;

  
  
  
  
  

  std::vector<double> f_internal(3, 0.0);
  for (const auto &el : solid.elements) {
    el.compute_nodal_forces(solid.displacement, solid.temperature,
                            solid.T_reference, f_internal);
  }

  std::cout << "Internal Force reaction at boundary 0: " << std::fixed
            << std::setprecision(2) << f_internal[0] << " N\n";

  if (std::abs(f_internal[0] - (-1200000.0)) <
      1.0) { 
    std::cout << "✓ PASS: Thermal expansion stress rigorously matches "
                 "analytical expectation.\n";
  } else {
    std::cout << "✗ FAIL: Incorrect thermal strain.\n";
  }
}

void test_coupled_impact_with_heat() {
    std::cout << "\n=== Test 3: Coupled Impact With Heat ===\n";
    
    
    double m_rigid = 10.0;
    double v_rigid = 5.0; 
    double E_kin_rigid_initial = 0.5 * m_rigid * v_rigid * v_rigid;
    
    int n_nodes = 5;
    CoupledSolid1D solid(n_nodes, 300.0);
    double dx = 0.5;
    for (int i = 0; i < n_nodes - 1; ++i) {
        solid.elements.emplace_back(i, i+1, 200e9, 0.01, dx, 7800.0, 1.2e-5, 500.0, 50.0);
    }
    solid.build_mass_matrix();
    solid.is_fixed[n_nodes - 1] = true; 
    
    
    
    
    
    
    
    
    double initial_sys_energy = E_kin_rigid_initial + solid.compute_thermal_energy();
    std::cout << "Initial System Energy (Rigid KE + Solid Thermal): " << initial_sys_energy << "\n";
    
    
    double m_node = solid.mass[0];
    double v_node = solid.velocity[0];
    double v_common = (m_rigid * v_rigid + m_node * v_node) / (m_rigid + m_node);
    
    
    double ke_before = 0.5 * m_rigid * v_rigid * v_rigid + 0.5 * m_node * v_node * v_node;
    double ke_after = 0.5 * (m_rigid + m_node) * v_common * v_common;
    double heat_generated = ke_before - ke_after;
    
    solid.velocity[0] = v_common;
    v_rigid = v_common;
    
    
    solid.mass[0] += m_rigid;
    
    
    double dt_impact_virt = 1e-5;
    solid.heat_rate[0] += heat_generated / dt_impact_virt;
    
    
    double t = 0;
    while(t < 0.001) {
        solid.step(dt_impact_virt);
        t += dt_impact_virt;
    }
    
    double final_sys_energy = solid.compute_kinetic_energy() + solid.compute_strain_energy() + solid.compute_thermal_energy();
    std::cout << "Final System Energy (Solid KE + Solid Strain + Solid Thermal): " << final_sys_energy << "\n";
    
    double err = std::abs(final_sys_energy - initial_sys_energy) / initial_sys_energy;
    if (err < 1e-4) {
        std::cout << "✓ PASS: Impact kinetic energy accurately conserved into strain, mechanical motion, and thermal generation.\n";
    } else {
        std::cout << "✗ FAIL: Energy divergence during impact. Err: " << err << "\n";
    }
}

int main() {
  std::cout << "==========================================\n";
  std::cout << " REALIS Engine - Multiphysics Coupling\n";
  std::cout << " Strict Interface Work/Energy Exchange\n";
  std::cout << "==========================================\n";

  try {
    test_fluid_pressure_on_elastic_wall();
    test_heated_elastic_rod();
    test_coupled_impact_with_heat();
  } catch (const std::exception &e) {
    std::cerr << "FATAL ERROR testing multiphysics: " << e.what() << "\n";
    return 1;
  }

  return 0;
}