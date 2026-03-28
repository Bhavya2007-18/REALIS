
#include <glad/glad.h>

#include "AxisRenderer.hpp"
#include "Camera.hpp"
#include "GraphicsContext.hpp"
#include "Grid.hpp"
#include "IndexBuffer.hpp"
#include "Renderer.hpp"
#include "Shader.hpp"
#include "VertexArray.hpp"
#include "VertexBuffer.hpp"
#include "Window.hpp"


#include "scene/Ray.hpp"
#include "scene/SceneNode.hpp"
#include "scene/SelectionSystem.hpp"



#define GLFW_INCLUDE_NONE
#include <GLFW/glfw3.h>

#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/quaternion.hpp>
#include <glm/gtc/type_ptr.hpp>
#define GLM_ENABLE_EXPERIMENTAL
#include <glm/gtx/quaternion.hpp>

#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <memory>
#include <vector>




typedef std::chrono::high_resolution_clock HRClock;
typedef HRClock::time_point TimePoint;
typedef std::chrono::duration<float> FloatSeconds;

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




struct InputState {
  double lastMouseX = 0.0;
  double lastMouseY = 0.0;
  bool firstMouse = true;
  bool rightMouseDown = false;
  bool middleMouseDown = false;
  float scrollDelta = 0.0f;

  
  realis::renderer::Camera *camera = nullptr;
  realis::scene::SceneNode *sceneRoot = nullptr;
  realis::scene::SelectionSystem *selection = nullptr;
  int windowWidth = 1280;
  int windowHeight = 720;
} g_input;

static void scrollCallback(GLFWwindow *window, double xoffset, double yoffset) {
  g_input.scrollDelta = static_cast<float>(yoffset);
}

static void mouseButtonCallback(GLFWwindow *window, int button, int action,
                                int mods) {
  if (button == GLFW_MOUSE_BUTTON_LEFT && action == GLFW_PRESS) {
    if (g_input.camera && g_input.sceneRoot && g_input.selection) {
      double mx, my;
      glfwGetCursorPos(window, &mx, &my);

      
      realis::scene::Ray ray = g_input.camera->generateRayFromMouse(
          static_cast<float>(mx), static_cast<float>(my),
          static_cast<float>(g_input.windowWidth),
          static_cast<float>(g_input.windowHeight));

      
      float closestT = 0.0f;
      realis::scene::SceneNode *hit =
          g_input.sceneRoot->pickChild(ray, closestT);

      if (hit) {
        g_input.selection->setSelected(hit);
        std::printf("[Selection] Picked: %s (t=%.3f)\n", hit->getName().c_str(),
                    closestT);
      } else {
        g_input.selection->clearSelection();
        std::printf("[Selection] Cleared\n");
      }
    }
  }
}




int main() {
  std::fprintf(stdout, "=================================================\n"
                       "   REALIS - Object Selection Verification\n"
                       "=================================================\n\n");

  
  realis::renderer::Window window(1280, 720, "REALIS Object Selection");

  realis::renderer::GraphicsContext ctx(window.handle());
  ctx.printInfo();
  ctx.setVSync(true);
  ctx.applyInitialState(window.width(), window.height());

  glfwSetScrollCallback(window.handle(), scrollCallback);
  glfwSetMouseButtonCallback(window.handle(), mouseButtonCallback);

  
  realis::renderer::Renderer renderer;
  renderer.setGLState();

  realis::renderer::Camera camera(glm::vec3(0.0f), 5.0f);
  camera.setAspectRatio(1280.0f / 720.0f);

  realis::renderer::Grid workspaceGrid(100.0f);
  realis::renderer::AxisRenderer workspaceAxis(2.0f);

  
  realis::scene::SelectionSystem selection;

  
  g_input.camera = &camera;
  g_input.selection = &selection;
  g_input.windowWidth = 1280;
  g_input.windowHeight = 720;

  
  
  float cubeVertices[] = {
      
      -0.5f,
      -0.5f,
      0.5f,
      1.0f,
      0.0f,
      0.0f,
      0.5f,
      -0.5f,
      0.5f,
      1.0f,
      0.0f,
      0.0f,
      0.5f,
      0.5f,
      0.5f,
      1.0f,
      0.0f,
      0.0f,
      -0.5f,
      0.5f,
      0.5f,
      1.0f,
      0.0f,
      0.0f,
      
      -0.5f,
      -0.5f,
      -0.5f,
      0.0f,
      1.0f,
      0.0f,
      0.5f,
      -0.5f,
      -0.5f,
      0.0f,
      1.0f,
      0.0f,
      0.5f,
      0.5f,
      -0.5f,
      0.0f,
      1.0f,
      0.0f,
      -0.5f,
      0.5f,
      -0.5f,
      0.0f,
      1.0f,
      0.0f,
  };

  unsigned int cubeIndices[] = {
      0, 1, 2, 2, 3, 0, 
      1, 5, 6, 6, 2, 1, 
      7, 6, 5, 5, 4, 7, 
      4, 0, 3, 3, 7, 4, 
      4, 5, 1, 1, 0, 4, 
      3, 2, 6, 6, 7, 3  
  };

  realis::renderer::VertexArray cubeVA;
  realis::renderer::VertexBuffer cubeVB(cubeVertices, sizeof(cubeVertices),
                                        GL_STATIC_DRAW);
  realis::renderer::VertexBufferLayout cubeLayout;
  cubeLayout.pushFloat(3); 
  cubeLayout.pushFloat(3); 
  cubeVA.addBuffer(cubeVB, cubeLayout);
  realis::renderer::IndexBuffer cubeIB(cubeIndices, 36, GL_STATIC_DRAW);

  
  
  
  
  
  
  
  

  auto sceneRoot = std::make_unique<realis::scene::SceneNode>("Root");

  auto nodeChild = std::make_unique<realis::scene::SceneNode>("Child");
  nodeChild->localTransform.setPosition({2.0f, 0.0f, 0.0f});

  auto nodeGrandchild =
      std::make_unique<realis::scene::SceneNode>("Grandchild");
  nodeGrandchild->localTransform.setPosition({1.5f, 0.0f, 0.0f});
  nodeGrandchild->localTransform.setScale({0.5f, 0.5f, 0.5f});

  
  realis::scene::SceneNode *rawChild =
      nodeChild->addChild(std::move(nodeGrandchild));
  realis::scene::SceneNode *rawGrandchild =
      rawChild; 
  
  realis::scene::SceneNode *rawChildNode =
      sceneRoot->addChild(std::move(nodeChild));
  
  realis::scene::SceneNode *rawGrandNode = rawChildNode->getChildren()[0].get();
  (void)rawGrandchild; 

  
  realis::scene::AABB unitCube({-0.5f, -0.5f, -0.5f}, {0.5f, 0.5f, 0.5f});
  sceneRoot->localAABB = unitCube;
  rawChildNode->localAABB = unitCube;
  rawGrandNode->localAABB = unitCube;

  
  g_input.sceneRoot = sceneRoot.get();

  
  
  const std::string vertexSrc = R"(
    #version 450 core
    layout(location = 0) in vec3 position;
    layout(location = 1) in vec3 color;
    out vec3 v_Color;
    uniform mat4 u_VP;
    uniform mat4 u_Model;
    void main() {
        gl_Position = u_VP * u_Model * vec4(position, 1.0);
        v_Color = color;
    }
  )";

  const std::string fragmentSrc = R"(
    #version 450 core
    in vec3 v_Color;
    out vec4 outColor;
    uniform bool u_Selected;
    void main() {
        vec3 color = v_Color;
        if (u_Selected) {
            
            color = mix(color, vec3(1.0, 1.0, 0.7), 0.4);
            color += vec3(0.1, 0.1, 0.0); 
        }
        outColor = vec4(color, 1.0);
    }
  )";

  realis::renderer::Shader cubeShader(vertexSrc, fragmentSrc);

  
  float rootAngle = 0.0f;  
  float childAngle = 0.0f; 

  
  auto lastFrameTime = std::chrono::high_resolution_clock::now();
  bool pKeyWasDown = false;

  while (!window.shouldClose()) {
    auto now = std::chrono::high_resolution_clock::now();
    float dt = std::chrono::duration<float>(now - lastFrameTime).count();
    lastFrameTime = now;

    
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

    if (glfwGetMouseButton(window.handle(), GLFW_MOUSE_BUTTON_RIGHT) ==
        GLFW_PRESS) {
      camera.rotate(-dx * 0.005f, -dy * 0.005f);
    }
    if (glfwGetMouseButton(window.handle(), GLFW_MOUSE_BUTTON_MIDDLE) ==
        GLFW_PRESS) {
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
                   camera.getProjectionMode() ==
                           realis::renderer::ProjectionMode::Perspective
                       ? "Perspective"
                       : "Orthographic");
    }
    pKeyWasDown = pKeyIsDown;

    if (window.isKeyPressed(GLFW_KEY_ESCAPE))
      glfwSetWindowShouldClose(window.handle(), true);

    
    renderer.clear();

    
    workspaceGrid.draw(renderer, camera);

    
    workspaceAxis.draw(renderer, camera);

    
    rootAngle += dt * 0.6f;  
    childAngle += dt * 1.2f; 

    sceneRoot->localTransform.setRotation(
        glm::angleAxis(rootAngle, glm::vec3(0.0f, 1.0f, 0.0f)));

    rawChildNode->localTransform.setRotation(
        glm::angleAxis(childAngle, glm::vec3(0.0f, 0.0f, 1.0f)));

    
    sceneRoot->updateWorldMatrix();

    
    glm::mat4 vp = camera.getProjectionMatrix() * camera.getViewMatrix();
    cubeShader.bind();
    cubeShader.setUniformMat4("u_VP", vp);

    
    cubeShader.setUniformMat4("u_Model", sceneRoot->getWorldMatrix());
    cubeShader.setUniformInt("u_Selected",
                             selection.isSelected(sceneRoot.get()));
    renderer.draw(cubeVA, cubeIB, cubeShader);

    
    cubeShader.setUniformMat4("u_Model", rawChildNode->getWorldMatrix());
    cubeShader.setUniformInt("u_Selected", selection.isSelected(rawChildNode));
    renderer.draw(cubeVA, cubeIB, cubeShader);

    
    cubeShader.setUniformMat4("u_Model", rawGrandNode->getWorldMatrix());
    cubeShader.setUniformInt("u_Selected", selection.isSelected(rawGrandNode));
    renderer.draw(cubeVA, cubeIB, cubeShader);

    window.swapBuffers();
    window.pollEvents();
  }

  return EXIT_SUCCESS;
}