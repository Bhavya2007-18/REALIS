# ──────────────────────────────────────────────────────────────────────────────
# REALIS Renderer — Standalone CMake Build
#
# Build commands:
#   cmake -S renderer -B renderer/build -G "Visual Studio 17 2022" -A x64
#   cmake --build renderer/build --config Debug
#   cmake --build renderer/build --config Release
#
# Run:
#   renderer/build/Debug/realis_renderer.exe
#
# Options:
#   -DREALIS_VSYNC=OFF      Disable VSync (default: ON)
# ──────────────────────────────────────────────────────────────────────────────

cmake_minimum_required(VERSION 3.20)

project(REALIS_Renderer
    VERSION 0.1.0
    DESCRIPTION "REALIS OpenGL 4.5 Rendering Foundation"
    LANGUAGES CXX C
)

# ── Language standard ─────────────────────────────────────────────────────────
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)           # Strict ISO C++17, no compiler extensions

# ── VSync compile-time flag ───────────────────────────────────────────────────
option(REALIS_VSYNC "Enable VSync by default" ON)

# ── External: GLFW via FetchContent ──────────────────────────────────────────
include(FetchContent)

FetchContent_Declare(
    glfw
    GIT_REPOSITORY https://github.com/glfw/glfw.git
    GIT_TAG        3.4
    GIT_SHALLOW    TRUE
)

set(GLFW_BUILD_DOCS     OFF CACHE BOOL "" FORCE)
set(GLFW_BUILD_TESTS    OFF CACHE BOOL "" FORCE)
set(GLFW_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(GLFW_INSTALL        OFF CACHE BOOL "" FORCE)

FetchContent_MakeAvailable(glfw)

# ── GLAD (vendored, static library) ──────────────────────────────────────────
add_library(glad STATIC vendor/glad/glad.c)
target_include_directories(glad PUBLIC vendor)
set_target_properties(glad PROPERTIES
    C_STANDARD   11
    C_EXTENSIONS OFF
)

# ── Renderer executable ───────────────────────────────────────────────────────
add_executable(realis_renderer
    main.cpp
    Window.cpp
    GraphicsContext.cpp
    DebugCallback.cpp
)

# Include own directory for "Window.hpp" etc.
target_include_directories(realis_renderer PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
)

# Link: glad (function loader) + glfw (windowing) + platform OpenGL
if(WIN32)
    target_link_libraries(realis_renderer PRIVATE glad glfw opengl32)
elseif(APPLE)
    find_library(OpenGL_FRAMEWORK OpenGL REQUIRED)
    target_link_libraries(realis_renderer PRIVATE glad glfw ${OpenGL_FRAMEWORK})
else()
    find_package(OpenGL REQUIRED)
    target_link_libraries(realis_renderer PRIVATE glad glfw OpenGL::GL)
endif()

# ── Compile definitions ───────────────────────────────────────────────────────
if(REALIS_VSYNC)
    target_compile_definitions(realis_renderer PRIVATE REALIS_VSYNC=1)
else()
    target_compile_definitions(realis_renderer PRIVATE REALIS_VSYNC=0)
endif()

# In Release builds, add NDEBUG so debug-only code is stripped
target_compile_definitions(realis_renderer PRIVATE
    $<$<CONFIG:Release>:NDEBUG>
    $<$<CONFIG:RelWithDebInfo>:NDEBUG>
)

# ── Compiler warnings ─────────────────────────────────────────────────────────
if(MSVC)
    target_compile_options(realis_renderer PRIVATE
        /W4             # High warning level
        /WX-            # Warnings are not errors (GLFW headers may trigger some)
        /permissive-    # Strict conformance mode
        /utf-8          # UTF-8 source + execution character set
    )
    target_compile_options(glad PRIVATE /W0)    # Suppress warnings in vendored C
else()
    target_compile_options(realis_renderer PRIVATE
        -Wall -Wextra -Wpedantic
        -Wno-unused-parameter   # GLFW callbacks have unused params by design
    )
    target_compile_options(glad PRIVATE -w)     # Suppress warnings in vendored C
endif()

# ── Status messages ───────────────────────────────────────────────────────────
message(STATUS "")
message(STATUS "REALIS Renderer Configuration")
message(STATUS "  Version:         ${PROJECT_VERSION}")
message(STATUS "  C++ Standard:    ${CMAKE_CXX_STANDARD}")
message(STATUS "  Build type:      ${CMAKE_BUILD_TYPE}")
message(STATUS "  VSync default:   ${REALIS_VSYNC}")
message(STATUS "")
