// IMPORTANT: glad.h MUST precede glfw3.h and other GL-dependent headers.
#include <glad/glad.h>

#include "Window.hpp"
#include "GraphicsContext.hpp"
#include "Shader.hpp"
#include "VertexBuffer.hpp"
#include "IndexBuffer.hpp"
#include "VertexArray.hpp"
#include "Renderer.hpp"
#include "Camera.hpp"

// Define GLFW_INCLUDE_NONE to prevent glfw3.h from including any OpenGL headers.
#define GLFW_INCLUDE_NONE
#include <GLFW/glfw3.h>

#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>

#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <vector>

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
// Global State for Input (Simplified for test)
// -----------------------------------------------------------------------------
struct InputState {
  double lastMouseX = 0.0;
  double lastMouseY = 0.0;
  bool firstMouse = true;
  bool rightMouseDown = false;
  bool middleMouseDown = false;
  float scrollDelta = 0.0f;
} g_input;

static void scrollCallback(GLFWwindow* window, double xoffset, double yoffset) {
  g_input.scrollDelta = static_cast<float>(yoffset);
}

// -----------------------------------------------------------------------------
// main
// -----------------------------------------------------------------------------
int main() {
  std::fprintf(stdout, "=================================================\n"
                       "   REALIS - Camera System Verification\n"
                       "=================================================\n\n");

  // 1. Setup Window & Context
  realis::renderer::Window window(1280, 720, "REALIS Camera Test");

  realis::renderer::GraphicsContext ctx(window.handle());
  ctx.printInfo();
  ctx.setVSync(true);
  ctx.applyInitialState(window.width(), window.height());

  glfwSetScrollCallback(window.handle(), scrollCallback);

  // 2. Initialize Renderer & Camera
  realis::renderer::Renderer renderer;
  renderer.setGLState();

  realis::renderer::Camera camera(glm::vec3(0.0f), 5.0f);
  camera.setAspectRatio(1280.0f / 720.0f);

  // 3. Create Geometry (Cube + Grid)
  
  // -- Cube (Pos[3], Color[3])
  float cubeVertices[] = {
    // Front face
    -0.5f, -0.5f,  0.5f,  1.0f, 0.0f, 0.0f,
     0.5f, -0.5f,  0.5f,  1.0f, 0.0f, 0.0f,
     0.5f,  0.5f,  0.5f,  1.0f, 0.0f, 0.0f,
    -0.5f,  0.5f,  0.5f,  1.0f, 0.0f, 0.0f,
    // Back face
    -0.5f, -0.5f, -0.5f,  0.0f, 1.0f, 0.0f,
     0.5f, -0.5f, -0.5f,  0.0f, 1.0f, 0.0f,
     0.5f,  0.5f, -0.5f,  0.0f, 1.0f, 0.0f,
    -0.5f,  0.5f, -0.5f,  0.0f, 1.0f, 0.0f,
  };

  unsigned int cubeIndices[] = {
    0, 1, 2, 2, 3, 0, // front
    1, 5, 6, 6, 2, 1, // right
    7, 6, 5, 5, 4, 7, // back
    4, 0, 3, 3, 7, 4, // left
    4, 5, 1, 1, 0, 4, // bottom
    3, 2, 6, 6, 7, 3  // top
  };

  realis::renderer::VertexArray cubeVA;
  realis::renderer::VertexBuffer cubeVB(cubeVertices, sizeof(cubeVertices), GL_STATIC_DRAW);
  realis::renderer::VertexBufferLayout cubeLayout;
  cubeLayout.pushFloat(3); // position
  cubeLayout.pushFloat(3); // color
  cubeVA.addBuffer(cubeVB, cubeLayout);
  realis::renderer::IndexBuffer cubeIB(cubeIndices, 36, GL_STATIC_DRAW);

  // -- Grid
  std::vector<float> gridVertices;
  std::vector<unsigned int> gridIndices;
  int gridSize = 10;
  for (int i = -gridSize; i <= gridSize; ++i) {
      // X lines
      gridVertices.push_back((float)i); gridVertices.push_back(0.0f); gridVertices.push_back((float)-gridSize);
      gridVertices.push_back(0.5f); gridVertices.push_back(0.5f); gridVertices.push_back(0.5f);
      gridVertices.push_back((float)i); gridVertices.push_back(0.0f); gridVertices.push_back((float)gridSize);
      gridVertices.push_back(0.5f); gridVertices.push_back(0.5f); gridVertices.push_back(0.5f);
      
      // Z lines
      gridVertices.push_back((float)-gridSize); gridVertices.push_back(0.0f); gridVertices.push_back((float)i);
      gridVertices.push_back(0.5f); gridVertices.push_back(0.5f); gridVertices.push_back(0.5f);
      gridVertices.push_back((float)gridSize); gridVertices.push_back(0.0f); gridVertices.push_back((float)i);
      gridVertices.push_back(0.5f); gridVertices.push_back(0.5f); gridVertices.push_back(0.5f);
  }
  for (unsigned int i = 0; i < gridVertices.size() / 6; i++) {
      gridIndices.push_back(i);
  }

  realis::renderer::VertexArray gridVA;
  realis::renderer::VertexBuffer gridVB(gridVertices.data(), gridVertices.size() * sizeof(float), GL_STATIC_DRAW);
  realis::renderer::VertexBufferLayout gridLayout;
  gridLayout.pushFloat(3); // position
  gridLayout.pushFloat(3); // color
  gridVA.addBuffer(gridVB, gridLayout);
  realis::renderer::IndexBuffer gridIB(gridIndices.data(), (unsigned int)gridIndices.size(), GL_STATIC_DRAW);

  // 4. Create Shader
  const std::string vertexSrc = R"(
    #version 450 core
    layout(location = 0) in vec3 position;
    layout(location = 1) in vec3 color;
    out vec3 v_Color;
    uniform mat4 u_VP;
    void main() {
        gl_Position = u_VP * vec4(position, 1.0);
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
  auto lastFrameTime = std::chrono::high_resolution_clock::now();
  bool pKeyWasDown = false;

  while (!window.shouldClose()) {
    auto now = std::chrono::high_resolution_clock::now();
    float dt = std::chrono::duration<float>(now - lastFrameTime).count();
    lastFrameTime = now;

    // -- Input Handling
    double mx, my;
    glfwGetCursorPos(window.handle(), &mx, &my);
    if (g_input.firstMouse) {
        g_input.lastMouseX = mx;
        g_input.lastMouseY = my;
        g_input.firstMouse = false;
    }
    float dx = static_cast<float>(mx - g_input.lastMouseX);
    float dy = static_cast<float>(my - g_input.lastMouseY);
    g_input.lastMouseX = mx;
    g_input.lastMouseY = my;

    if (glfwGetMouseButton(window.handle(), GLFW_MOUSE_BUTTON_RIGHT) == GLFW_PRESS) {
        camera.rotate(-dx * 0.005f, -dy * 0.005f);
    }
    if (glfwGetMouseButton(window.handle(), GLFW_MOUSE_BUTTON_MIDDLE) == GLFW_PRESS) {
        camera.pan(-dx, dy);
    }
    if (g_input.scrollDelta != 0.0f) {
        camera.zoom(g_input.scrollDelta);
        g_input.scrollDelta = 0.0f;
    }

    const bool pKeyIsDown = window.isKeyPressed(GLFW_KEY_P);
    if (pKeyIsDown && !pKeyWasDown) {
        camera.toggleProjectionMode();
        std::fprintf(stdout, "[Camera] Mode: %s\n", 
                     camera.getProjectionMode() == realis::renderer::ProjectionMode::Perspective ? "Perspective" : "Orthographic");
    }
    pKeyWasDown = pKeyIsDown;

    if (window.isKeyPressed(GLFW_KEY_ESCAPE)) glfwSetWindowShouldClose(window.handle(), true);

    // -- Rendering
    renderer.clear();

    glm::mat4 vp = camera.getProjectionMatrix() * camera.getViewMatrix();
    
    shader.bind();
    shader.setUniformMat4("u_VP", vp);

    renderer.draw(cubeVA, cubeIB, shader);
    
    // Draw grid as lines if possible (Renderer abstraction needs line support? 
    // For now we draw as triangles but gridIB is indexed for lines, so we use GL_LINES)
    // We add a drawLines method to Renderer or just use GL_LINES if draw supports it.
    // Actually our Renderer::draw uses GL_TRIANGLES. Let's add a drawLines.
    renderer.drawLines(gridVA, gridIB, shader);
    
    window.swapBuffers();
    window.pollEvents();
  }

  return EXIT_SUCCESS;
}
