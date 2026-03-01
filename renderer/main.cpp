/**
 * @file main.cpp
 * @brief REALIS Renderer - Application Entry Point
 *
 * Architecture:
 *   Window          - GLFW window lifecycle
 *   GraphicsContext - GLAD + OpenGL state initialisation
 *   Render loop     - deterministic, VSync-driven, no heap alloc per frame
 *
 * Controls:
 *   Escape - close the window
 *   V      - toggle VSync
 *
 * Console output:
 *   FPS is printed once per second (not per frame).
 */

#include "Window.hpp"
#include "GraphicsContext.hpp"

// IMPORTANT: glad.h MUST precede glfw3.h.
#include <glad/glad.h>

// Define GLFW_INCLUDE_NONE to prevent glfw3.h from including any OpenGL headers.
#define GLFW_INCLUDE_NONE
#include <GLFW/glfw3.h>


#include <chrono>
#include <cstdio>
#include <cstdlib>

// -----------------------------------------------------------------------------
// Compile-time toggle: VSync on by default
// Override: cmake ... -DREALIS_VSYNC=OFF
// -----------------------------------------------------------------------------
#ifndef REALIS_VSYNC
#define REALIS_VSYNC 1
#endif

// -----------------------------------------------------------------------------
// High-resolution timer types
// -----------------------------------------------------------------------------
typedef std::chrono::high_resolution_clock HRClock;
typedef HRClock::time_point TimePoint;
typedef std::chrono::duration<float> FloatSeconds;

// -----------------------------------------------------------------------------
// computeDeltaTime
// Returns seconds elapsed since lastTime. Clamped to [0, 0.1] to survive
// debugger pauses without causing physics/frame-time spikes.
// -----------------------------------------------------------------------------
static float computeDeltaTime(TimePoint &lastTime) {
  const TimePoint now = HRClock::now();
  float dt = FloatSeconds(now - lastTime).count();
  lastTime = now;
  if (dt > 0.1f)
    dt = 0.1f;
  if (dt < 0.0f)
    dt = 0.0f;
  return dt;
}

// -----------------------------------------------------------------------------
// processInput
// Called once per frame, outside the render path.
// Uses static local to implement edge-triggered VSync toggle.
// -----------------------------------------------------------------------------
static void processInput(realis::renderer::Window &window,
                         realis::renderer::GraphicsContext &ctx,
                         bool &vsyncEnabled) {
  // Escape -> close window
  if (window.isKeyPressed(GLFW_KEY_ESCAPE)) {
    glfwSetWindowShouldClose(window.handle(), GLFW_TRUE);
  }

  // V -> toggle VSync (edge-triggered)
  static bool vKeyWasDown = false;
  const bool vKeyIsDown = window.isKeyPressed(GLFW_KEY_V);
  if (vKeyIsDown && !vKeyWasDown) {
    vsyncEnabled = !vsyncEnabled;
    ctx.setVSync(vsyncEnabled);
  }
  vKeyWasDown = vKeyIsDown;
}

// -----------------------------------------------------------------------------
// main
// -----------------------------------------------------------------------------
int main() {
  std::fprintf(stdout, "=================================================\n"
                       "   REALIS - Rendering Foundation v0.1\n"
                       "=================================================\n\n");

  // 1. Create window
  // Window constructor: calls glfwInit, sets hints, creates GL context,
  // makes it current, and registers the framebuffer-resize callback.
  realis::renderer::Window window(1280, 720, "REALIS");

  // 2. Initialise OpenGL
  // GraphicsContext: loads GLAD, verifies GL 4.5, installs debug callback,
  // and configures initial render state.
  realis::renderer::GraphicsContext ctx(window.handle());
  ctx.printInfo();

  bool vsyncEnabled = (REALIS_VSYNC != 0);
  ctx.setVSync(vsyncEnabled);
  ctx.applyInitialState(window.width(), window.height());

  // 3. Confirm no GL errors before entering the loop
  {
    GLenum err = glGetError();
    if (err != GL_NO_ERROR) {
      std::fprintf(
          stderr,
          "[main] GL error 0x%04X detected before render loop. Aborting.\n",
          err);
      return EXIT_FAILURE;
    }
    std::fprintf(stdout, "[main] Pre-loop GL state: CLEAN\n\n");
  }

  // 4. Render loop
  //
  // Per-frame structure:
  //   computeDeltaTime -> processInput
  //   -> glClear       -> (future: renderer.beginFrame / endFrame)
  //   -> swapBuffers   -> pollEvents
  //   -> FPS accounting
  //
  // Invariants:
  //   * No heap allocation inside the loop
  //   * No OpenGL calls before this point
  //   * dt is bounded to [0, 0.1] seconds

  TimePoint lastFrameTime = HRClock::now();
  float fpsAccum = 0.0f;
  int frameCount = 0;

  std::fprintf(stdout, "[main] Entering render loop.\n"
                       "[main] Press Escape to exit, V to toggle VSync.\n\n");

  while (!window.shouldClose()) {

    // Delta time
    const float dt = computeDeltaTime(lastFrameTime);

    // Input
    processInput(window, ctx, vsyncEnabled);

    // Render
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    //
    // -- Future extension point ----------------------------------------
    // renderer.beginFrame(dt);
    // renderer.submit(scene);
    // renderer.endFrame();
    // -----------------------------------------------------------------

    // Present
    window.swapBuffers();
    window.pollEvents();

    // FPS tracking - printed once per second
    fpsAccum += dt;
    ++frameCount;
    if (fpsAccum >= 1.0f) {
      const float fps = static_cast<float>(frameCount) / fpsAccum;
      const float avgMs = (fpsAccum / static_cast<float>(frameCount)) * 1000.0f;
      std::fprintf(stdout, "[FPS] %.1f  (dt_avg: %.2f ms)\n", fps, avgMs);
      std::fflush(stdout);
      fpsAccum = 0.0f;
      frameCount = 0;
    }
  }

  // 5. Shutdown
  // Window destructor: glfwDestroyWindow + glfwTerminate
  std::fprintf(stdout, "\n[main] Render loop exited. Shutting down cleanly.\n");

  return EXIT_SUCCESS;
}
