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

# Source files (add as development progresses)
set(REALIS_SOURCES
    # Math
    # core/world.cpp
    # dynamics/rigid_body.cpp
    # etc.
)

# Header include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}
)

# Build library
add_library(realis_core ${REALIS_SOURCES})

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
