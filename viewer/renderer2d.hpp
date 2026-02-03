// SDL2 Renderer Wrapper
// Handles 2D drawing of physics primitives
#pragma once
#include <vector>
#include <string>
#include "../engine/visualization/visual_state.hpp"
#include "../engine/math/vec3.hpp" // For math helpers if needed

// SDL2 Include
// User must ensure SDL2 is in the include path
#ifdef _WIN32
#include <SDL.h>
#else
#include <SDL2/SDL.h>
#endif

namespace realis {
namespace viewer {

class Renderer2D {
public:
    Renderer2D(int width, int height, float scale_ppm = 100.0f);
    ~Renderer2D();

    bool init(const std::string& title);
    void clear();
    void present();
    bool handle_events(bool& paused, bool& step, bool& reset, bool& debug_mode, float& zoom);

    // Drawing API
    void render_frame(const visualization::VisualFrame& frame);

    // Helpers
    void set_camera(float x, float y, float zoom);

private:
    SDL_Window* window = nullptr;
    SDL_Renderer* renderer = nullptr;
    int screen_width;
    int screen_height;
    
    // Camera
    float cam_x = 0.0f;
    float cam_y = 0.0f; 
    float zoom_level = 1.0f;
    float pixels_per_meter; // Base scale (e.g. 100 px = 1 meter)

    // Internal Draw Primitives
    void set_color(const visualization::VisColor& c);
    void draw_circle(float x, float y, float radius);
    void draw_box(float x, float y, float w, float h, float angle);
    void draw_line(float x1, float y1, float x2, float y2);
    
    // Coordinate Transform: World (Meters) -> Screen (Pixels)
    // World (0,0) is center of screen? Or camera position.
    // Screen X = (WorldX - CamX) * Scale + ScreenW/2
    // Screen Y = ScreenH/2 - (WorldY - CamY) * Scale (Inverted Y)
    int world_to_screen_x(float wx);
    int world_to_screen_y(float wy);
    float scale_dim(float meters);
};

} // namespace viewer
} // namespace realis
