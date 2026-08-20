

#include "GraphicsContext.hpp"
#include "DebugCallback.hpp"


#include <glad/glad.h>

#define GLFW_INCLUDE_NONE
#include <GLFW/glfw3.h>

#include <cstdio>
#include <stdexcept>
#include <string>

namespace realis::renderer {






static void requireNoGLError(const char *step) {
  GLenum err = glGetError();
  if (err != GL_NO_ERROR) {
    std::string msg = "[GraphicsContext] GL error 0x";
    char hexbuf[16];
    std::snprintf(hexbuf, sizeof(hexbuf), "%04X", err);
    msg += hexbuf;
    msg += " after step: ";
    msg += step;
    throw std::runtime_error(msg);
  }
}





GraphicsContext::GraphicsContext(GLFWwindow *window) {
  if (!window) {
    throw std::runtime_error("[GraphicsContext] Null window handle passed — "
                             "cannot load GL functions.");
  }

  
  
  
  if (!gladLoadGLLoader(reinterpret_cast<GLADloadproc>(glfwGetProcAddress))) {
    throw std::runtime_error("[GraphicsContext] gladLoadGLLoader failed — "
                             "OpenGL 4.5 is not available on this system.");
  }

  
  
  if (GLVersion.major < 4 || (GLVersion.major == 4 && GLVersion.minor < 5)) {
    std::string msg = "[GraphicsContext] OpenGL 4.5 required, got ";
    msg +=
        std::to_string(GLVersion.major) + "." + std::to_string(GLVersion.minor);
    throw std::runtime_error(msg);
  }

  
  
  
#if !defined(NDEBUG)
  GLint contextFlags = 0;
  glGetIntegerv(GL_CONTEXT_FLAGS, &contextFlags);
  if (contextFlags & GL_CONTEXT_FLAG_DEBUG_BIT) {
    installDebugCallback();
    std::fprintf(stdout, "[GraphicsContext] Debug callback installed.\n");
  } else {
    std::fprintf(
        stdout,
        "[GraphicsContext] WARNING: No debug context bit — "
        "debug callback NOT installed (driver may have ignored the hint).\n");
  }
  requireNoGLError("debug callback setup");
#endif

  std::fprintf(stdout, "[GraphicsContext] Initialised successfully.\n");
}





void GraphicsContext::printInfo() const noexcept {
  const GLubyte *vendor = glGetString(GL_VENDOR);
  const GLubyte *renderer = glGetString(GL_RENDERER);
  const GLubyte *version = glGetString(GL_VERSION);

  std::fprintf(stdout,
               "─────────────────────────────────────────────────\n"
               "  REALIS Renderer — OpenGL Context Info\n"
               "─────────────────────────────────────────────────\n"
               "  Vendor:   %s\n"
               "  Renderer: %s\n"
               "  Version:  %s\n"
               "  GLAD:     %d.%d\n"
               "─────────────────────────────────────────────────\n",
               vendor ? reinterpret_cast<const char *>(vendor) : "N/A",
               renderer ? reinterpret_cast<const char *>(renderer) : "N/A",
               version ? reinterpret_cast<const char *>(version) : "N/A",
               GLVersion.major, GLVersion.minor);
  std::fflush(stdout);
}





void GraphicsContext::applyInitialState(int fbWidth, int fbHeight) const {
  
  glViewport(0, 0, fbWidth, fbHeight);
  requireNoGLError("glViewport");

  
  glEnable(GL_DEPTH_TEST);
  glDepthFunc(GL_LEQUAL);
  requireNoGLError("depth test");

  
  glEnable(GL_CULL_FACE);
  glCullFace(GL_BACK);
  glFrontFace(GL_CCW);
  requireNoGLError("face culling");

  
  glClearColor(0.12f, 0.12f, 0.12f, 1.0f);
  requireNoGLError("glClearColor");

  std::fprintf(stdout,
               "[GraphicsContext] Initial GL state applied. Viewport: %d×%d\n",
               fbWidth, fbHeight);
  std::fflush(stdout);
}





bool GraphicsContext::setVSync(bool enabled) noexcept {
  
  glfwSwapInterval(enabled ? 1 : 0);
  std::fprintf(stdout, "[GraphicsContext] VSync %s.\n", enabled ? "ON" : "OFF");
  return true;
}

} 