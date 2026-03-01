/**
 * @file GraphicsContext.cpp
 * @brief GLAD init + OpenGL state setup — REALIS Renderer
 *
 * Construction sequence:
 *   1. Load all GL function pointers with gladLoadGLLoader
 *   2. Verify GL version >= 4.5
 *   3. Install the KHR_debug callback (debug builds)
 *   4. Configure initial render state
 *
 * Every step is followed by a glGetError() assertion.
 * On ANY failure the constructor throws std::runtime_error.
 */

#include "GraphicsContext.hpp"
#include "DebugCallback.hpp"

// IMPORTANT: glad.h MUST be included before any header that pulls in gl.h.
#include <glad/glad.h>

#define GLFW_INCLUDE_NONE
#include <GLFW/glfw3.h>


#include <cstdio>
#include <stdexcept>
#include <string>

namespace realis::renderer {

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Asserts no pending GL error, throws describing the failed step. */
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

// ─────────────────────────────────────────────────────────────────────────────
// Constructor
// ─────────────────────────────────────────────────────────────────────────────

GraphicsContext::GraphicsContext(GLFWwindow *window) {
  if (!window) {
    throw std::runtime_error("[GraphicsContext] Null window handle passed — "
                             "cannot load GL functions.");
  }

  // ── 1. Load OpenGL function pointers ─────────────────────────────────────
  // glfwMakeContextCurrent must have been called before this point.
  // gladLoadGLLoader returns 1 on success.
  if (!gladLoadGLLoader(reinterpret_cast<GLADloadproc>(glfwGetProcAddress))) {
    throw std::runtime_error("[GraphicsContext] gladLoadGLLoader failed — "
                             "OpenGL 4.5 is not available on this system.");
  }

  // ── 2. Version verification ───────────────────────────────────────────────
  // GLVersion is populated by gladLoadGLLoader
  if (GLVersion.major < 4 || (GLVersion.major == 4 && GLVersion.minor < 5)) {
    std::string msg = "[GraphicsContext] OpenGL 4.5 required, got ";
    msg +=
        std::to_string(GLVersion.major) + "." + std::to_string(GLVersion.minor);
    throw std::runtime_error(msg);
  }

  // ── 3. Debug callback (debug builds only) ─────────────────────────────────
  // Check the debug context bit before installing the callback.
  // On release builds the driver may not have created a debug context.
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

// ─────────────────────────────────────────────────────────────────────────────
// printInfo
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// applyInitialState
// ─────────────────────────────────────────────────────────────────────────────

void GraphicsContext::applyInitialState(int fbWidth, int fbHeight) const {
  // Viewport — must match the actual framebuffer dimensions
  glViewport(0, 0, fbWidth, fbHeight);
  requireNoGLError("glViewport");

  // Depth testing
  glEnable(GL_DEPTH_TEST);
  glDepthFunc(GL_LEQUAL);
  requireNoGLError("depth test");

  // Face culling — cull back faces, CCW winding = front face
  glEnable(GL_CULL_FACE);
  glCullFace(GL_BACK);
  glFrontFace(GL_CCW);
  requireNoGLError("face culling");

  // Clear color — vibrant "Cornflower Blue" to confirm renderer active
  glClearColor(0.1f, 0.4f, 0.8f, 1.0f);
  requireNoGLError("glClearColor");

  std::fprintf(stdout,
               "[GraphicsContext] Initial GL state applied. Viewport: %d×%d\n",
               fbWidth, fbHeight);
  std::fflush(stdout);
}

// ─────────────────────────────────────────────────────────────────────────────
// VSync
// ─────────────────────────────────────────────────────────────────────────────

bool GraphicsContext::setVSync(bool enabled) noexcept {
  // 1 = VSync on, 0 = VSync off
  glfwSwapInterval(enabled ? 1 : 0);
  std::fprintf(stdout, "[GraphicsContext] VSync %s.\n", enabled ? "ON" : "OFF");
  return true;
}

} // namespace realis::renderer
