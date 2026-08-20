


#include "fem/fem_mesh.hpp"
#include "fem/tetra_element.hpp"
#include "fem/fem_solver.hpp" 

#include "materials/linear_elastic.hpp"
#include "tests/test_harness.hpp"
#include <iostream>
#include <cmath>

using namespace realis;
using namespace realis::fem;
using namespace realis::materials;
using namespace realis::test;

bool test_cantilever_deflection() {
    FEMMesh mesh;
    
    
    
    
    
    
    
    
    
    float L = 2.0f;
    
    auto n0 = mesh.add_node(Vec3(0,0,0), 1.0f);
    auto n1 = mesh.add_node(Vec3(L,0,0), 1.0f);
    auto n2 = mesh.add_node(Vec3(L,1,0), 1.0f);
    auto n3 = mesh.add_node(Vec3(0,1,0), 1.0f);
    
    
    auto n4 = mesh.add_node(Vec3(0,0,1), 1.0f);
    auto n5 = mesh.add_node(Vec3(L,0,1), 1.0f);
    auto n6 = mesh.add_node(Vec3(L,1,1), 1.0f);
    auto n7 = mesh.add_node(Vec3(0,1,1), 1.0f);
    
    
    n0->is_fixed = true;
    n3->is_fixed = true;
    n4->is_fixed = true;
    n7->is_fixed = true;
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    return true; 
}

int main() {
    TestRunner runner;
    runner.run("Cantilever Deflection", test_cantilever_deflection);
    runner.summary();
    return 0; 
}