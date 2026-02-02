// Phase 1 Demonstration: Free Fall
// Validates C++ implementation against Python reference
// Reference: physics_lab/kinematics/point_motion.py

#include "../engine/core/world.hpp"
#include "../engine/math/vec3.hpp"
#include <iostream>
#include <iomanip>
#include <cmath>  // For std::abs

using namespace realis;

void test_free_fall() {
    std::cout << "=== Phase 1: Free Fall Test ===" << std::endl;
    std::cout << std::endl;
    
    // Initial conditions (matching Python)
    Vec3 initial_position(0.0f, 10.0f, 0.0f);  // 10 m height
    Vec3 initial_velocity(0.0f, 0.0f, 0.0f);    // Starting from rest
    float dt = 0.01f;  // 10 ms timestep
    float duration = 1.0f;  // 1 second
    
    std::cout << "Initial position: (0, 10, 0) m" << std::endl;
    std::cout << "Initial velocity: (0, 0, 0) m/s" << std::endl;
    std::cout << "Timestep: " << dt << " s" << std::endl;
    std::cout << "Duration: " << duration << " s" << std::endl;
    std::cout << "Gravity: -9.81 m/s²" << std::endl;
    std::cout << std::endl;
    
    // Create world
    World world(dt);
    world.set_position(initial_position);
    world.set_velocity(initial_velocity);
    
    // Store initial energy
    float initial_energy = world.compute_energy();
    
    // Log first state
    std::cout << "--- Simulation Log (every 10 steps) ---" << std::endl;
    world.log_state();
    
    // Simulate
    int num_steps = static_cast<int>(duration / dt);
    for (int i = 0; i < num_steps; ++i) {
        world.step();
        
        // Log every 10 steps
        if ((i + 1) % 10 == 0) {
            world.log_state();
        }
    }
    
    // Final state
    Vec3 final_position = world.get_position();
    Vec3 final_velocity = world.get_velocity();
    float final_energy = world.compute_energy();
    
    std::cout << std::endl;
    std::cout << "=== Results ===" << std::endl;
    std::cout << std::fixed << std::setprecision(4);
    std::cout << "Final position: (" << final_position.x << ", " 
              << final_position.y << ", " << final_position.z << ") m" << std::endl;
    std::cout << "Final velocity: (" << final_velocity.x << ", " 
              << final_velocity.y << ", " << final_velocity.z << ") m/s" << std::endl;
    std::cout << std::endl;
    
    // Analytical solution: y = y0 - 0.5*g*t²
    float analytical_y = 10.0f - 0.5f * 9.81f * duration * duration;
    float analytical_vy = -9.81f * duration;
    
    std::cout << "Analytical solution:" << std::endl;
    std::cout << "  Expected y: " << analytical_y << " m" << std::endl;
    std::cout << "  Expected vy: " << analytical_vy << " m/s" << std::endl;
    std::cout << std::endl;
    
    // Error analysis
    float position_error = std::abs(final_position.y - analytical_y);
    float velocity_error = std::abs(final_velocity.y - analytical_vy);
    float position_error_percent = (position_error / analytical_y) * 100.0f;
    
    std::cout << "Error analysis:" << std::endl;
    std::cout << "  Position error: " << position_error << " m (" 
              << position_error_percent << "%)" << std::endl;
    std::cout << "  Velocity error: " << velocity_error << " m/s" << std::endl;
    std::cout << std::endl;
    
    // Energy drift
    float energy_drift = (final_energy - initial_energy) / initial_energy * 100.0f;
    std::cout << "Energy conservation:" << std::endl;
    std::cout << "  Initial energy: " << initial_energy << " J" << std::endl;
    std::cout << "  Final energy: " << final_energy << " J" << std::endl;
    std::cout << "  Energy drift: " << energy_drift << "%" << std::endl;
    std::cout << std::endl;
    
    // Validation
    bool position_ok = position_error_percent < 1.0f;
    bool energy_ok = std::abs(energy_drift) < 1.0f;
    
    if (position_ok && energy_ok) {
        std::cout << "✓ PASS: C++ matches analytical solution!" << std::endl;
    } else {
        std::cout << "✗ FAIL: Results outside tolerance" << std::endl;
    }
}

void test_projectile_motion() {
    std::cout << std::endl;
    std::cout << "=== Phase 1: Projectile Motion Test ===" << std::endl;
    std::cout << std::endl;
    
    // Initial conditions (matching Python)
    float v0 = 20.0f;  // m/s
    float angle_deg = 45.0f;
    float angle_rad = angle_deg * 3.14159265f / 180.0f;
    
    Vec3 initial_position(0.0f, 0.0f, 0.0f);
    Vec3 initial_velocity(
        v0 * std::cos(angle_rad),
        v0 * std::sin(angle_rad),
        0.0f
    );
    
    std::cout << "Initial velocity: " << v0 << " m/s at " << angle_deg << "°" << std::endl;
    std::cout << "Velocity components: vx=" << initial_velocity.x 
              << " m/s, vy=" << initial_velocity.y << " m/s" << std::endl;
    std::cout << std::endl;
    
    // Create world
    float dt = 0.01f;
    World world(dt);
    world.set_position(initial_position);
    world.set_velocity(initial_velocity);
    
    float initial_energy = world.compute_energy();
    float max_height = 0.0f;
    
    // Simulate until ground
    std::cout << "--- Simulating until y < 0 ---" << std::endl;
    int step_count = 0;
    while (world.get_position().y >= 0.0f && step_count < 100000) {
        world.step();
        
        // Track max height
        float current_y = world.get_position().y;
        if (current_y > max_height) {
            max_height = current_y;
        }
        
        step_count++;
    }
    
    Vec3 final_position = world.get_position();
    float flight_time = world.get_time();
    float final_energy = world.compute_energy();
    
    std::cout << std::endl;
    std::cout << "=== Results ===" << std::endl;
    std::cout << std::fixed << std::setprecision(2);
    std::cout << "Maximum height: " << max_height << " m" << std::endl;
    std::cout << "Range: " << final_position.x << " m" << std::endl;
    std::cout << "Flight time: " << flight_time << " s" << std::endl;
    std::cout << std::endl;
    
    // Python reference results (from earlier run)
    std::cout << "Python reference results:" << std::endl;
    std::cout << "  Max height: ~10.12 m" << std::endl;
    std::cout << "  Range: ~40.73 m" << std::endl;
    std::cout << "  Flight time: ~2.88 s" << std::endl;
    std::cout << std::endl;
    
    // Energy drift
    float energy_drift = (final_energy - initial_energy) / initial_energy * 100.0f;
    std::cout << "Energy drift: " << std::setprecision(4) << energy_drift << "%" << std::endl;
    std::cout << "Python energy drift: ~-0.69%" << std::endl;
    std::cout << std::endl;
    
    // Validation
    bool height_ok = std::abs(max_height - 10.12f) < 0.5f;
    bool range_ok = std::abs(final_position.x - 40.73f) < 1.0f;
    bool energy_ok = std::abs(energy_drift) < 1.0f;
    
    if (height_ok && range_ok && energy_ok) {
        std::cout << "✓ PASS: C++ matches Python results!" << std::endl;
    } else {
        std::cout << "✗ FAIL: Results deviate from Python" << std::endl;
    }
}

int main() {
    std::cout << "======================================" << std::endl;
    std::cout << "REALIS Physics Engine - Phase 1 Demo" << std::endl;
    std::cout << "Point Mass Motion Under Gravity" << std::endl;
    std::cout << "======================================" << std::endl;
    std::cout << std::endl;
    
    // Test 1: Free fall
    test_free_fall();
    
    std::cout << std::endl;
    std::cout << "======================================" << std::endl;
    std::cout << std::endl;
    
    // Test 2: Projectile motion
    test_projectile_motion();
    
    std::cout << std::endl;
    std::cout << "======================================" << std::endl;
    std::cout << "Phase 1 Validation Complete" << std::endl;
    std::cout << "======================================" << std::endl;
    
    return 0;
}
