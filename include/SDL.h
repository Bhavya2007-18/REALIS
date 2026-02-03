#pragma once
#include <iostream>
typedef void* SDL_Window;
typedef void* SDL_Renderer;

struct SDL_Keysym {
    int sym;
};
struct SDL_KeyboardEvent {
    SDL_Keysym keysym;
};
struct SDL_MouseWheelEvent {
    int y;
};
typedef struct { 
    int type; 
    SDL_KeyboardEvent key;      
    SDL_MouseWheelEvent wheel;
} SDL_Event;

#define SDL_INIT_VIDEO 0
#define SDL_WINDOWPOS_UNDEFINED 0
#define SDL_WINDOW_SHOWN 0
#define SDL_RENDERER_ACCELERATED 0
#define SDL_RENDERER_PRESENTVSYNC 0
#define SDL_BLENDMODE_BLEND 0
#define SDL_QUIT 0
#define SDL_KEYDOWN 1
#define SDL_MOUSEWHEEL 2
#define SDLK_SPACE 32
#define SDLK_RIGHT 1001
#define SDLK_r 1002
#define SDLK_d 1003
#define SDLK_EQUALS 1004
#define SDLK_PLUS 1005
#define SDLK_MINUS 1006
#define SDLK_w 1007
#define SDLK_s 1008
#define SDLK_a 1009
#define SDLK_F1 1010

inline int SDL_Init(int) { return 0; }
inline void SDL_Quit() {}
inline SDL_Window* SDL_CreateWindow(const char* t, int w, int h, int x, int y, int f) { 
    std::cout << "[MOCK SDL] Window Created: " << t << std::endl; 
    return (SDL_Window*)1; 
}
inline SDL_Renderer* SDL_CreateRenderer(SDL_Window*, int, int) { return (SDL_Renderer*)1; }
inline void SDL_DestroyRenderer(SDL_Renderer*) {}
inline void SDL_DestroyWindow(SDL_Window*) {}
inline const char* SDL_GetError() { return "No Error"; }
inline void SDL_SetRenderDrawBlendMode(SDL_Renderer*, int) {}
inline void SDL_SetRenderDrawColor(SDL_Renderer*, int, int, int, int) {}
inline void SDL_RenderClear(SDL_Renderer*) {}
inline void SDL_RenderPresent(SDL_Renderer*) {
    static int frame = 0;
    if (frame++ < 5) std::cout << "[MOCK SDL] Frame " << frame << " rendered." << std::endl;
}
inline int SDL_PollEvent(SDL_Event*) { return 0; }
inline void SDL_RenderDrawLine(SDL_Renderer*, int, int, int, int) {}
inline void SDL_RenderDrawPoint(SDL_Renderer*, int, int) {}
inline void SDL_Delay(int ms) { } 
