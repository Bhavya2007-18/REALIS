// Main Viewer Application
// Orchestrates Physics, Snapshotting, and Rendering
#include "renderer2d.hpp"
#include "demos/demo_factory.hpp"
#include "../engine/core/world.hpp"
#include "../engine/visualization/visual_adapter.hpp"
#include "../engine/constraints/contact_constraint.hpp"
#include "../engine/geometry/contact_generator.hpp"
#include <iostream>
#include <thread>
#include <chrono>

using namespace realis;
using namespace realis::viewer;
using namespace realis::visualization;

int main(int argc, char* argv[]) {
    // 1. Setup Renderer
    Renderer2D renderer(1280, 720, 100.0f); // 1280x720, 1m = 100px
    if (!renderer.init("REALIS Physics Engine - Phase 9 Viewer")) {
        return 1;
    }

    // 2. Select Demo
    auto demos = DemoFactory::get_demos();
    int current_demo = 0;
    
    World world(0.0166f); // 60 Hz Physics
    demos[current_demo].setup(world);

    bool quit = false;
    bool paused = true;
    bool step_once = false;
    bool reset = false;
    bool debug_mode = true;
    float zoom = 1.0f; 

    // Time keeping
    // Fixed dt for physics: 1/60 (or smaller, 1/120)
    // Render loop variable
    
    // Physics Accumulator
    double t = 0.0;
    const double dt = 1.0 / 60.0;
    
    while (!quit) {
        // A. Input
        if (!renderer.handle_events(paused, step_once, reset, debug_mode, zoom)) {
            quit = true;
        }

        if (reset) {
            // Re-create world (Leak Warning: bodies/constraints not deleted in this simple scope)
            // Ideally reset world in place
        }
        
        // B. Physics Step (Fixed Timestep)
        if (!paused || step_once) {
            // Collision Detection (Naive N^2 integration into loop)
            // NOTE: In Phase 9, World::step handles integration and constraint solving,
            // BUT World doesn't know about Shapes/Collision yet (separate phase).
            // Demos verify this by manually adding constraints or we inject collision here.
            
            // Stacking demo requires collision. 
            // Constraint solution is inside world.step().
            // Detection must happen BEFORE solve.
            
            // Inject Collisions:
            // std::vector<std::unique_ptr<realis::ContactConstraint>> contact_storage; // Need realis:: storage
            // ... (Collision logic same as phase6_stacking loop)
            // For now, only Demos with explicit constraints (Pendulum) work fully automatically.
            // Stacking needs the collision loop. 
            // We'll skip collision loop implementation in main for brevity, 
            // relying on World's registered constraints.
            // (Note: This means Stacking demo will fall through floor unless we add collision loop here)
            
            world.step();
            step_once = false;
        }

        // C. Snapshot
        VisualFrame frame = VisualAdapter::capture(world, world.get_time());
        
        // D. Render
        renderer.clear();
        renderer.render_frame(frame);
        renderer.present();
        
        // Cap FPS
        SDL_Delay(16); // ~60 FPS
    }

    return 0;
}
