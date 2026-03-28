


#include "../engine/geometry/brep_core.hpp"
#include "../engine/geometry/mesh_quality.hpp"
#include "../engine/geometry/parametric_tracker.hpp"
#include "../engine/geometry/topology_validator.hpp"


#include <iostream>
#include <string>
#include <vector>


using namespace realis;
using namespace realis::geometry;


Solid *create_unit_cube(float offset = 0.0f) {
  Solid *cube = new Solid("CUBE_B_REP");

  
  cube->vertices.push_back(new Vertex("V0", Vec3(0, 0, 0 + offset)));
  cube->vertices.push_back(new Vertex("V1", Vec3(1, 0, 0 + offset)));
  cube->vertices.push_back(new Vertex("V2", Vec3(1, 1, 0 + offset)));
  cube->vertices.push_back(new Vertex("V3", Vec3(0, 1, 0 + offset)));
  cube->vertices.push_back(new Vertex("V4", Vec3(0, 0, 1 + offset)));
  cube->vertices.push_back(new Vertex("V5", Vec3(1, 0, 1 + offset)));
  cube->vertices.push_back(new Vertex("V6", Vec3(1, 1, 1 + offset)));
  cube->vertices.push_back(new Vertex("V7", Vec3(0, 1, 1 + offset)));

  
  
  cube->edges.push_back(new Edge("E_B0", cube->vertices[0], cube->vertices[1]));
  cube->edges.push_back(new Edge("E_B1", cube->vertices[1], cube->vertices[2]));
  cube->edges.push_back(new Edge("E_B2", cube->vertices[2], cube->vertices[3]));
  cube->edges.push_back(new Edge("E_B3", cube->vertices[3], cube->vertices[0]));
  
  cube->edges.push_back(new Edge("E_T0", cube->vertices[4], cube->vertices[5]));
  cube->edges.push_back(new Edge("E_T1", cube->vertices[5], cube->vertices[6]));
  cube->edges.push_back(new Edge("E_T2", cube->vertices[6], cube->vertices[7]));
  cube->edges.push_back(new Edge("E_T3", cube->vertices[7], cube->vertices[4]));
  
  cube->edges.push_back(new Edge("E_V0", cube->vertices[0], cube->vertices[4]));
  cube->edges.push_back(new Edge("E_V1", cube->vertices[1], cube->vertices[5]));
  cube->edges.push_back(new Edge("E_V2", cube->vertices[2], cube->vertices[6]));
  cube->edges.push_back(new Edge("E_V3", cube->vertices[3], cube->vertices[7]));

  
  
  auto f_bottom =
      new Face("F_BOTTOM",
               {cube->edges[3], cube->edges[2], cube->edges[1], cube->edges[0]},
               {cube->vertices[0], cube->vertices[3], cube->vertices[2],
                cube->vertices[1]});

  
  auto f_top = new Face(
      "F_TOP", {cube->edges[4], cube->edges[5], cube->edges[6], cube->edges[7]},
      {cube->vertices[4], cube->vertices[5], cube->vertices[6],
       cube->vertices[7]});

  
  auto f_front =
      new Face("F_FRONT",
               {cube->edges[0], cube->edges[9], cube->edges[8], cube->edges[4]},
               {cube->vertices[0], cube->vertices[1], cube->vertices[5],
                cube->vertices[4]});

  
  auto f_back = new Face(
      "F_BACK",
      {cube->edges[11], cube->edges[6], cube->edges[10], cube->edges[2]},
      {cube->vertices[3], cube->vertices[7], cube->vertices[6],
       cube->vertices[2]});

  
  auto f_left = new Face(
      "F_LEFT",
      {cube->edges[8], cube->edges[7], cube->edges[11], cube->edges[3]},
      {cube->vertices[0], cube->vertices[4], cube->vertices[7],
       cube->vertices[3]});

  
  auto f_right = new Face(
      "F_RIGHT",
      {cube->edges[1], cube->edges[10], cube->edges[5], cube->edges[9]},
      {cube->vertices[1], cube->vertices[2], cube->vertices[6],
       cube->vertices[5]});

  cube->faces.insert(cube->faces.end(),
                     {f_bottom, f_top, f_front, f_back, f_left, f_right});
  return cube;
}

void test_brep_validation() {
  std::cout << "\n=== Test 1: Simple Block B-Rep Validation ===\n";
  Solid *solid = create_unit_cube();

  ValidationReport report;
  TopologyValidator::validate_manifold(*solid, report);
  TopologyValidator::validate_tolerances(*solid, report);
  TopologyValidator::validate_normals_and_volume(*solid, report);

  if (report.is_valid) {
    std::cout << "✓ PASS: Valid geometry safely vetted. Normals, Volumes, and "
                 "Edge topologies correct.\n";
  } else {
    std::cout << "✗ FAIL: Geometry rejected improperly.\n";
  }

  
  
  Face *top = solid->faces[1];
  solid->faces.erase(solid->faces.begin() +
                     1); 

  ValidationReport report_corrupted;
  TopologyValidator::validate_manifold(*solid, report_corrupted);
  if (!report_corrupted.is_valid) {
    std::cout << "✓ PASS: Bad Geometry Rejected. Detected open edge boundary "
                 "successfully:\n";
    for (const auto &err : report_corrupted.errors) {
      std::cout << "    -> " << err << "\n";
    }
  } else {
    std::cout << "✗ FAIL: Simulator allowed broken physics shell to pass!\n";
  }

  solid->faces.push_back(top); 
  delete solid;
}

void test_boolean_slivers() {
  std::cout << "\n=== Test 2: Boolean Operations Integrity (Slivers) ===\n";
  Solid *solid = create_unit_cube();

  
  
  Vertex *v_sliver1 = new Vertex("V_SLVR1", Vec3(0.5f, 0.5f, 1.0f));
  Vertex *v_sliver2 =
      new Vertex("V_SLVR2", Vec3(0.5f + 1e-9f, 0.5f, 1.0f)); 
  Edge *e_sliver = new Edge("E_SLVR", v_sliver1, v_sliver2);

  solid->vertices.push_back(v_sliver1);
  solid->vertices.push_back(v_sliver2);
  solid->edges.push_back(e_sliver);

  ValidationReport report;
  TopologyValidator::validate_tolerances(*solid, report);

  if (!report.is_valid) {
    std::cout << "✓ PASS: Physics rejected bad tolerance limits explicitly:\n";
    for (const auto &err : report.errors) {
      std::cout << "    -> " << err << "\n";
    }
  } else {
    std::cout << "✗ FAIL: Micro-gaps slipped through.\n";
  }

  delete solid;
}

void test_parametric_tracking() {
  std::cout << "\n=== Test 3: Stable Parametric Boundary ID Tracking ===\n";

  ParametricTracker tracker;

  
  Solid *solid_v1 = create_unit_cube();
  std::string fixed_wall_id = ParametricTracker::generate_stable_face_id(
      *(solid_v1->faces[0]), solid_v1->id); 
  tracker.attach_boundary_condition(fixed_wall_id, "BOUNDARY_FIXED");

  std::cout << "  Assigned BOUNDARY_FIXED to Face Hash: " << fixed_wall_id
            << "\n";

  
  
  Solid *solid_v2 = create_unit_cube(10.0f); 

  
  std::string new_bottom_id = ParametricTracker::generate_stable_face_id(
      *(solid_v2->faces[0]), solid_v2->id);

  std::string bound_state = tracker.get_boundary_condition(new_bottom_id);
  if (bound_state == "BOUNDARY_FIXED") {
    std::cout << "✓ PASS: Parametric Tracking survived geometric rebuild! "
                 "Condition maintained: "
              << bound_state << "\n";
  } else {
    std::cout << "✗ FAIL: Topological IDs scrambled on rebuild. Hash changed: "
              << new_bottom_id << "\n";
  }

  delete solid_v1;
  delete solid_v2;
}

int main() {
  std::cout << "==========================================\n";
  std::cout << " REALIS Engine - Geometric Foundation\n";
  std::cout << " Strict Manifold & Tolerance Validations\n";
  std::cout << "==========================================\n";

  try {
    test_brep_validation();
    test_boolean_slivers();
    test_parametric_tracking();
  } catch (const std::exception &e) {
    std::cerr << "FATAL ERROR during validation: " << e.what() << "\n";
    return 1;
  }
  return 0;
}