// SDL2 Renderer Implementation
#include "renderer2d.hpp"
#include <iostream>
#include <cmath>

namespace realis {
namespace viewer {

Renderer2D::Renderer2D(int width, int height, float scale)
    : screen_width(width), screen_height(height), pixels_per_meter(scale) 
{
    // Center camera initially
    cam_x = 0.0f;
    cam_y = 0.0f;
}

Renderer2D::~Renderer2D() {
    if (renderer) SDL_DestroyRenderer(renderer);
    if (window) SDL_DestroyWindow(window);
    SDL_Quit();
}

bool Renderer2D::init(const std::string& title) {
    if (SDL_Init(SDL_INIT_VIDEO) < 0) {
        std::cerr << "SDL could not initialize! SDL_Error: " << SDL_GetError() << std::endl;
        return false;
    }

    window = SDL_CreateWindow(title.c_str(), 
        SDL_WINDOWPOS_UNDEFINED, SDL_WINDOWPOS_UNDEFINED, 
        screen_width, screen_height, SDL_WINDOW_SHOWN);
        
    if (!window) {
        std::cerr << "Window could not be created! SDL_Error: " << SDL_GetError() << std::endl;
        return false;
    }

    renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC);
    if (!renderer) {
        std::cerr << "Renderer could not be created! SDL_Error: " << SDL_GetError() << std::endl;
        return false;
    }
    
    // Alpha blending
    SDL_SetRenderDrawBlendMode(renderer, SDL_BLENDMODE_BLEND);

    return true;
}

void Renderer2D::clear() {
    SDL_SetRenderDrawColor(renderer, 20, 20, 25, 255); // Dark Gray Background
    SDL_RenderClear(renderer);
    
    // Draw Grid (Optional)
    // ...
}

void Renderer2D::present() {
    SDL_RenderPresent(renderer);
}

bool Renderer2D::handle_events(bool& paused, bool& step, bool& reset, bool& debug_mode, float& zoom) {
    SDL_Event e;
    step = false; // Trigger only once per press
    
    while (SDL_PollEvent(&e) != 0) {
        if (e.type == SDL_QUIT) {
            return false;
        } else if (e.type == SDL_KEYDOWN) {
            switch (e.key.keysym.sym) {
                case SDLK_SPACE: paused = !paused; break;
                case SDLK_RIGHT: step = true; paused = true; break; // Step requires pause usually
                case SDLK_r: reset = true; break;
                case SDLK_d: debug_mode = !debug_mode; break;
                case SDLK_EQUALS: case SDLK_PLUS: zoom_level *= 1.1f; break;
                case SDLK_MINUS: zoom_level /= 1.1f; break;
                // Pan keys
                case SDLK_w: cam_y += 0.5f / zoom_level; break;
                case SDLK_s: cam_y -= 0.5f / zoom_level; break;
                case SDLK_a: cam_x -= 0.5f / zoom_level; break;
                // case SDLK_d: cam_x += 0.5f / zoom_level; break; // Conflict with debug mode
            }
            if (e.key.keysym.sym == SDLK_F1) debug_mode = !debug_mode;
        } else if (e.type == SDL_MOUSEWHEEL) {
            if (e.wheel.y > 0) zoom_level *= 1.1f;
            else if (e.wheel.y < 0) zoom_level /= 1.1f;
        }
    }
    return true;
}

void Renderer2D::render_frame(const visualization::VisualFrame& frame) {
    // 1. Draw Bodies
    for (const auto& body : frame.bodies) {
        set_color(body.color);
        
        switch (body.shape) {
            case visualization::VisShapeType::CIRCLE:
                draw_circle(body.position.x, body.position.y, body.dimensions.x);
                break;
            case visualization::VisShapeType::BOX:
                draw_box(body.position.x, body.position.y, body.dimensions.x * 2.0f, body.dimensions.y * 2.0f, body.orientation);
                break;
            default:
                break;
        }
        
        // Orientation line (to show rotation)
        set_color({255, 255, 255, 150});
        float r = (body.shape == visualization::VisShapeType::CIRCLE) ? body.dimensions.x : std::min(body.dimensions.x, body.dimensions.y);
        float end_x = body.position.x + std::cos(body.orientation) * r;
        float end_y = body.position.y + std::sin(body.orientation) * r;
        draw_line(body.position.x, body.position.y, end_x, end_y);
    }
    
    // 2. Draw Debug Vectors
    for (const auto& vec : frame.debug_vectors) {
        set_color(vec.color);
        draw_line(vec.start.x, vec.start.y, vec.end.x, vec.end.y);
    }
    
    // 3. UI Info (Text not implemented in simplified renderer, use console or overlays)
    // Could use SDL_ttf but avoiding extra deps.
}

// Coordinate Transform
int Renderer2D::world_to_screen_x(float wx) {
    float relative = (wx - cam_x) * pixels_per_meter * zoom_level;
    return static_cast<int>(relative + screen_width / 2);
}

int Renderer2D::world_to_screen_y(float wy) {
    // Invert Y
    float relative = (wy - cam_y) * pixels_per_meter * zoom_level;
    return static_cast<int>(screen_height / 2 - relative);
}

float Renderer2D::scale_dim(float meters) {
    return meters * pixels_per_meter * zoom_level;
}

void Renderer2D::set_color(const visualization::VisColor& c) {
    SDL_SetRenderDrawColor(renderer, c.r, c.g, c.b, c.a);
}

// Primitives
void Renderer2D::draw_line(float x1, float y1, float x2, float y2) {
    SDL_RenderDrawLine(renderer, 
        world_to_screen_x(x1), world_to_screen_y(y1),
        world_to_screen_x(x2), world_to_screen_y(y2));
}

void Renderer2D::draw_circle(float x, float y, float radius) {
    int cx = world_to_screen_x(x);
    int cy = world_to_screen_y(y);
    int r = static_cast<int>(scale_dim(radius));
    
    if (r <= 0) r = 1;
    
    // Midpoint circle algorithm
    int xo = r;
    int yo = 0;
    int err = 1 - xo;

    while (xo >= yo) {
        SDL_RenderDrawPoint(renderer, cx + xo, cy + yo);
        SDL_RenderDrawPoint(renderer, cx + yo, cy + xo);
        SDL_RenderDrawPoint(renderer, cx - yo, cy + xo);
        SDL_RenderDrawPoint(renderer, cx - xo, cy + yo);
        SDL_RenderDrawPoint(renderer, cx - xo, cy - yo);
        SDL_RenderDrawPoint(renderer, cx - yo, cy - xo);
        SDL_RenderDrawPoint(renderer, cx + yo, cy - xo);
        SDL_RenderDrawPoint(renderer, cx + xo, cy - yo);
        yo++;
        if (err < 0) {
            err += 2 * yo + 1;
        } else {
            xo--;
            err += 2 * (yo - xo + 1);
        }
    }
}

void Renderer2D::draw_box(float x, float y, float w, float h, float angle) {
    // w, h are full width/height
    // 4 corners relative to center
    float hw = w * 0.5f;
    float hh = h * 0.5f;
    
    // Local corners
    float lx[] = {-hw, hw, hw, -hw};
    float ly[] = {-hh, -hh, hh, hh};
    
    // Rotated and World corners
    float wx[4], wy[4];
    float c = std::cos(angle);
    float s = std::sin(angle);
    
    for (int i = 0; i < 4; ++i) {
        // Rotate
        float rx = lx[i] * c - ly[i] * s;
        float ry = lx[i] * s + ly[i] * c;
        // Translate
        wx[i] = x + rx;
        wy[i] = y + ry;
    }
    
    // Draw 4 lines
    for (int i = 0; i < 4; ++i) {
        draw_line(wx[i], wy[i], wx[(i+1)%4], wy[(i+1)%4]);
    }
}

} // namespace viewer
} // namespace realis
