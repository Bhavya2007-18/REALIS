// FEM Verification: Uniaxial Tension
// Stretches a single element and verifies Stress = E * Strain
#include "fem/fem_mesh.hpp"
#include "fem/tetra_element.hpp"
#include "materials/linear_elastic.hpp"
#include "tests/test_harness.hpp"
#include <iostream>
#include <iomanip>

using namespace realis;
using namespace realis::fem;
using namespace realis::materials;
using namespace realis::test;

bool test_uniaxial_stress() {
    FEMMesh mesh;
    // Single Tetra
    // Nodes at (0,0,0), (1,0,0), (0,1,0), (0,0,1) Reference
    // Regular tetra volume = 1/6
    
    auto n0 = mesh.add_node(Vec3(0,0,0), 1.0f);
    auto n1 = mesh.add_node(Vec3(1,0,0), 1.0f);
    auto n2 = mesh.add_node(Vec3(0,1,0), 1.0f);
    auto n3 = mesh.add_node(Vec3(0,0,1), 1.0f);
    
    mesh.elements.push_back(std::make_unique<TetraElement>(n0, n1, n2, n3));
    auto& elem = static_cast<TetraElement&>(*mesh.elements[0]);
    
    // Stretch in X by 1% (x = 1.01)
    n1->position = Vec3(1.01f, 0, 0); 
    // Fix others
    n0->position = Vec3(0,0,0);
    n2->position = Vec3(0,1,0); 
    n3->position = Vec3(0,0,1);
    
    // Note: Poisson effect isn't automatic unless we solve for equilibrium.
    // If we just MOVE nodes, we impose a strain state.
    // Strain xx should be 0.01.
    // Strain yy, zz should be 0 (constrained).
    // This is NOT uniaxial stress state (where lateral boundaries are free),
    // this is Uniaxial Strain state (constrained lateral).
    
    // For Uniaxial Strain:
    // sigma_xx = (lambda + 2mu) * eps_xx
    
    float E = 1e6f; // 1 MPa
    float nu = 0.3f;
    LinearElastic mat(E, nu, 1000.0f);
    
    elem.compute_forces(mat);
    
    float eps_xx = elem.current_strain.data.data[0]; // data[0] is (0,0)
    std::cout << "Strain XX: " << eps_xx << std::endl;
    
    if (std::abs(eps_xx - 0.01f) > 1e-5f) {
        std::cout << "FAIL: Strain computation wrong." << std::endl;
        return false;
    }
    
    // Verify Stress using Lame parameters
    float expected_stress = (mat.lambda + 2.0f * mat.mu) * eps_xx;
    float actual_stress = elem.current_stress.data.data[0];
    
    std::cout << "Stress XX Expected: " << expected_stress << " Actual: " << actual_stress << std::endl;
    
    float error = std::abs(expected_stress - actual_stress);
    return error < 1e-3f; // Pascal tolerance
}

int main() {
    TestRunner runner;
    runner.run("Uniaxial Strain", test_uniaxial_stress);
    runner.summary();
    return runner.all_passed() ? 0 : 1;
}
