cmake_minimum_required(VERSION 3.15)
project(REALIS VERSION 0.1.0 LANGUAGES CXX)

# C++17 standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Compiler warnings
if(MSVC)
    add_compile_options(/W4)
else()
    add_compile_options(-Wall -Wextra -Wpedantic)
endif()

# Source files (Phase 4 - Collisions & Contacts)
set(REALIS_SOURCES
    math/vec3.cpp
    math/quat.cpp
    math/mat3.cpp
    math/matrix_solver.cpp
    core/timestep.cpp
    core/integrator.cpp
    core/world.cpp
    dynamics/rigid_body.cpp
    dynamics/force_registry.cpp
    dynamics/inertia.cpp
    dynamics/contact_resolver.cpp
    collision/broadphase.cpp
    collision/narrowphase.cpp
    collision/solver.cpp
    constraints/contact_constraint.cpp
    constraints/constraint_solver.cpp
    cad/cad_importer.cpp
    cad/cad_validator.cpp
    geometry/contact_generator.cpp
    
    # Phase 7: Geometry Layer
    geometry/topology_validator.cpp
    geometry/mesh_quality.cpp
    
    coupling/rigid_fem_coupler.cpp
    energy/energy_monitor.cpp
    fluids/compressible_1d.cpp
)

# Header include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}
)

# Build library
add_library(realis_core ${REALIS_SOURCES})

# Build Demo Targets
add_executable(phase1_point_mass ../examples/phase1_point_mass.cpp)
target_link_libraries(phase1_point_mass realis_core)

add_executable(phase2_energy_drift ../examples/phase2_energy_drift.cpp)
target_link_libraries(phase2_energy_drift realis_core)

add_executable(phase3_rotation ../examples/phase3_rotation.cpp)
target_link_libraries(phase3_rotation realis_core)

add_executable(phase4_collision ../examples/phase4_collision.cpp)
target_link_libraries(phase4_collision realis_core)

add_executable(phase5_compressible ../examples/phase5_compressible.cpp)
target_link_libraries(phase5_compressible realis_core)

add_executable(phase6_multiphysics ../examples/phase6_multiphysics.cpp)
target_link_libraries(phase6_multiphysics realis_core)

add_executable(phase7_geometry ../examples/phase7_geometry.cpp)
target_link_libraries(phase7_geometry realis_core)

add_executable(phase8_verification ../examples/phase8_verification.cpp)
target_link_libraries(phase8_verification realis_core)

add_executable(verify_resting_block ../tests/verification/verify_resting_block.cpp)
target_link_libraries(verify_resting_block realis_core)

add_executable(verify_sliding_block ../tests/verification/verify_sliding_block.cpp)
target_link_libraries(verify_sliding_block realis_core)

add_executable(verify_stacking ../tests/verification/verify_stacking.cpp)
target_link_libraries(verify_stacking realis_core)

# Phase 4A: 1D FEM Verification
add_executable(verify_bar1d ../tests/fem/verify_bar1d.cpp)
target_link_libraries(verify_bar1d realis_core)

# Install rules
install(TARGETS realis_core DESTINATION lib)
install(DIRECTORY 
    math core dynamics collision constraints multibody softbody fluids energy debug io fem
    DESTINATION include/realis
    FILES_MATCHING PATTERN "*.hpp"
)

message(STATUS "REALIS Physics Engine Configuration Complete")
message(STATUS "  Version: ${PROJECT_VERSION}")
message(STATUS "  C++ Standard: ${CMAKE_CXX_STANDARD}")
