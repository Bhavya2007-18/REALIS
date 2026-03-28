

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
    
    Renderer2D renderer(1280, 720, 100.0f); 
    if (!renderer.init("REALIS Physics Engine - Phase 9 Viewer")) {
        return 1;
    }

    
    auto demos = DemoFactory::get_demos();
    int current_demo = 0;
    
    World world(0.0166f); 
    demos[current_demo].setup(world);

    bool quit = false;
    bool paused = true;
    bool step_once = false;
    bool reset = false;
    bool debug_mode = true;
    float zoom = 1.0f; 

    
    
    
    
    
    double t = 0.0;
    const double dt = 1.0 / 60.0;
    
    while (!quit) {
        
        if (!renderer.handle_events(paused, step_once, reset, debug_mode, zoom)) {
            quit = true;
        }

        if (reset) {
            
            
        }
        
        
        if (!paused || step_once) {
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            world.step();
            step_once = false;
        }

        
        VisualFrame frame = VisualAdapter::capture(world, world.get_time());
        
        
        renderer.clear();
        renderer.render_frame(frame);
        renderer.present();
        
        
        SDL_Delay(16); 
    }

    return 0;
}