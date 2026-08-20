

#pragma once
#include <vector>
#include <string>
#include "../engine/visualization/visual_state.hpp"
#include "../engine/math/vec3.hpp" 



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

    
    void render_frame(const visualization::VisualFrame& frame);

    
    void set_camera(float x, float y, float zoom);

private:
    SDL_Window* window = nullptr;
    SDL_Renderer* renderer = nullptr;
    int screen_width;
    int screen_height;
    
    
    float cam_x = 0.0f;
    float cam_y = 0.0f; 
    float zoom_level = 1.0f;
    float pixels_per_meter; 

    
    void set_color(const visualization::VisColor& c);
    void draw_circle(float x, float y, float radius);
    void draw_box(float x, float y, float w, float h, float angle);
    void draw_line(float x1, float y1, float x2, float y2);
    
    
    
    
    
    int world_to_screen_x(float wx);
    int world_to_screen_y(float wy);
    float scale_dim(float meters);
};

} 
} 