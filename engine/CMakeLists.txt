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
    core/timestep.cpp
    core/integrator.cpp
    core/world.cpp
    dynamics/rigid_body.cpp
    dynamics/force_registry.cpp
    dynamics/inertia.cpp
    dynamics/contact_resolver.cpp
    collision/collision_detector.cpp
    constraints/contact_constraint.cpp
    constraints/constraint_solver.cpp
    engine/cad/cad_importer.cpp
    engine/cad/cad_validator.cpp
    engine/geometry/contact_generator.cpp
    engine/fem/fem_solver.hpp
    engine/coupling/rigid_fem_coupler.cpp
    energy/energy_monitor.cpp
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

# Install rules
install(TARGETS realis_core DESTINATION lib)
install(DIRECTORY 
    math core dynamics collision constraints multibody softbody fluids energy debug io
    DESTINATION include/realis
    FILES_MATCHING PATTERN "*.hpp"
)

message(STATUS "REALIS Physics Engine Configuration Complete")
message(STATUS "  Version: ${PROJECT_VERSION}")
message(STATUS "  C++ Standard: ${CMAKE_CXX_STANDARD}")
