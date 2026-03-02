// IMPORTANT: glad.h MUST precede glfw3.h and other GL-dependent headers.
#include <glad/glad.h>

#include "Window.hpp"
#include "GraphicsContext.hpp"
#include "Shader.hpp"
#include "VertexBuffer.hpp"
#include "IndexBuffer.hpp"
#include "VertexArray.hpp"
#include "Renderer.hpp"

// Define GLFW_INCLUDE_NONE to prevent glfw3.h from including any OpenGL headers.
#define GLFW_INCLUDE_NONE
#include <GLFW/glfw3.h>

#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>

#include <chrono>
#include <cstdio>
#include <cstdlib>

// -----------------------------------------------------------------------------
// computeDeltaTime
// -----------------------------------------------------------------------------
typedef std::chrono::high_resolution_clock HRClock;
typedef HRClock::time_point TimePoint;
typedef std::chrono::duration<float> FloatSeconds;

static float computeDeltaTime(TimePoint &lastTime) {
  const TimePoint now = HRClock::now();
  float dt = FloatSeconds(now - lastTime).count();
  lastTime = now;
  if (dt > 0.1f) dt = 0.1f;
  if (dt < 0.0f) dt = 0.0f;
  return dt;
}

// -----------------------------------------------------------------------------
// processInput
// -----------------------------------------------------------------------------
static void processInput(realis::renderer::Window &window,
                         realis::renderer::GraphicsContext &ctx,
                         bool &vsyncEnabled) {
  if (window.isKeyPressed(GLFW_KEY_ESCAPE)) {
    glfwSetWindowShouldClose(window.handle(), GLFW_TRUE);
  }

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

  // 1. Setup Window & Context
  realis::renderer::Window window(1280, 720, "REALIS");

  realis::renderer::GraphicsContext ctx(window.handle());
  ctx.printInfo();

#ifndef REALIS_VSYNC
#define REALIS_VSYNC 1
#endif
  bool vsyncEnabled = (REALIS_VSYNC != 0);
  ctx.setVSync(vsyncEnabled);
  ctx.applyInitialState(window.width(), window.height());

  // 2. Initialize Renderer
  realis::renderer::Renderer renderer;
  renderer.setGLState();

  // 3. Create Geometry (Quad)
  // [x, y, z, r, g, b]
  float vertices[] = {
    -0.5f, -0.5f, 0.0f,  1.0f, 0.0f, 0.0f, // Bottom Left  (Red)
     0.5f, -0.5f, 0.0f,  0.0f, 1.0f, 0.0f, // Bottom Right (Green)
     0.5f,  0.5f, 0.0f,  0.0f, 0.0f, 1.0f, // Top Right    (Blue)
    -0.5f,  0.5f, 0.0f,  1.0f, 1.0f, 0.0f  // Top Left     (Yellow)
  };

  unsigned int indices[] = {
    0, 1, 2, // First Triangle
    2, 3, 0  // Second Triangle
  };

  realis::renderer::VertexArray va;
  realis::renderer::VertexBuffer vb(vertices, sizeof(vertices), GL_STATIC_DRAW);
  
  realis::renderer::VertexBufferLayout layout;
  layout.pushFloat(3); // position
  layout.pushFloat(3); // color
  
  va.addBuffer(vb, layout);
  
  realis::renderer::IndexBuffer ib(indices, 6, GL_STATIC_DRAW);

  // 4. Create Shader
  const std::string vertexSrc = R"(
    #version 450 core
    layout(location = 0) in vec3 position;
    layout(location = 1) in vec3 color;
    
    out vec3 v_Color;
    
    uniform mat4 u_MVP;

    void main() {
        gl_Position = u_MVP * vec4(position, 1.0);
        v_Color = color;
    }
  )";

  const std::string fragmentSrc = R"(
    #version 450 core
    in vec3 v_Color;
    out vec4 outColor;
    void main() {
        outColor = vec4(v_Color, 1.0);
    }
  )";

  realis::renderer::Shader shader(vertexSrc, fragmentSrc);

  // 5. Render Loop
  TimePoint lastFrameTime = HRClock::now();
  float fpsAccum = 0.0f;
  int frameCount = 0;

  while (!window.shouldClose()) {
    const float dt = computeDeltaTime(lastFrameTime);
    processInput(window, ctx, vsyncEnabled);

    renderer.clear();

    // Compute simple MVP
    glm::mat4 mvp = glm::mat4(1.0f);
    // Future: Add camera/projection here
    
    shader.bind();
    shader.setUniformMat4("u_MVP", mvp);

    renderer.draw(va, ib, shader);

    window.swapBuffers();
    window.pollEvents();

    fpsAccum += dt;
    ++frameCount;
    if (fpsAccum >= 1.0f) {
      const float fps = static_cast<float>(frameCount) / fpsAccum;
      std::fprintf(stdout, "[FPS] %.1f\n", fps);
      std::fflush(stdout);
      fpsAccum = 0.0f;
      frameCount = 0;
    }
  }

  return EXIT_SUCCESS;
}
