// CAD Validation Test (Part F)
// Verify that the Integrity Gatekeeper rejects invalid geometry
#include "../engine/cad/cad_types.hpp"
#include "../engine/cad/cad_validator.hpp"
#include "../tests/test_harness.hpp"

using namespace realis;
using namespace realis::cad;
using namespace realis::test;

bool test_open_shell_rejection() {
    // Create an open solid (3 faces, effectively a triangle sheet, not closed)
    Solid bad_solid;
    
    // Face 1
    Face* f1 = new Face();
    Vertex* v1 = new Vertex(Vec3(0,0,0));
    Vertex* v2 = new Vertex(Vec3(1,0,0));
    Vertex* v3 = new Vertex(Vec3(0,1,0));
    f1->edges.push_back(new Edge(v1, v2));
    f1->edges.push_back(new Edge(v2, v3));
    f1->edges.push_back(new Edge(v3, v1));
    bad_solid.faces.push_back(f1);
    
    // Logic: A solid with 1 face is definitely not closed.
    
    ValidationResult res = CADValidator::validate_solid(bad_solid);
    
    if (res.is_valid) {
        std::cout << "FAIL: Open shell was accepted." << std::endl;
        return false;
    }
    
    // Check error message
    bool found_error = false;
    for (const auto& err : res.errors) {
        if (err.find("fewer than 4 faces") != std::string::npos) found_error = true;
    }
    
    return found_error;
}

bool test_micro_geometry_rejection() {
    Solid bad_solid;
    Face* f1 = new Face();
    Vertex* v1 = new Vertex(Vec3(0,0,0));
    Vertex* v2 = new Vertex(Vec3(0.000001f, 0, 0)); // 1e-6, tolerance is 1e-4
    Vertex* v3 = new Vertex(Vec3(0,1,0));
    
    f1->edges.push_back(new Edge(v1, v2)); 
    f1->edges.push_back(new Edge(v2, v3));
    f1->edges.push_back(new Edge(v3, v1));
    bad_solid.faces.push_back(f1);
    
    ValidationResult res = CADValidator::validate_solid(bad_solid);
    
    if (res.is_valid) {
        std::cout << "FAIL: Micro-geometry was accepted." << std::endl;
        return false;
    }
    return true;
}

int main() {
    TestRunner runner;
    runner.run("Reject Open Shell", test_open_shell_rejection);
    runner.run("Reject Micro Geometry", test_micro_geometry_rejection);
    runner.summary();
    return runner.all_passed() ? 0 : 1;
}
