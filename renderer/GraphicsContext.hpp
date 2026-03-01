/**
 * @file GraphicsContext.hpp
 * @brief OpenGL context bootstrap — REALIS Renderer
 *
 * Owns GLAD initialization and all initial OpenGL state setup.
 * Must be constructed after a valid GLFW window + context exists.
 *
 * Usage:
 *   Window window(1280, 720, "REALIS");
 *   GraphicsContext ctx(window.handle());
 *   ctx.printInfo();
 */
#pragma once

struct GLFWwindow;

namespace realis::renderer {

/**
 * @brief Initialises GLAD and configures the initial OpenGL state.
 *
 * Responsibilities:
 *   1. Load all OpenGL function pointers via GLAD
 *   2. Install the debug message callback (debug builds only)
 *   3. Configure depth test, face culling, clear color
 *   4. Set the initial viewport
 *   5. Assert GL_NO_ERROR after each setup step
 *
 * Throws std::runtime_error on GLAD load failure or
 * insufficient GL version.
 */
class GraphicsContext {
public:
  /**
   * @param window  A valid, current GLFW window. The GL context must
   *                already be made current on this thread via
   *                glfwMakeContextCurrent() (Window constructor does this).
   */
  explicit GraphicsContext(GLFWwindow *window);
  ~GraphicsContext() = default;

  // Non-copyable, non-movable
  GraphicsContext(const GraphicsContext &) = delete;
  GraphicsContext &operator=(const GraphicsContext &) = delete;
  GraphicsContext(GraphicsContext &&) = delete;
  GraphicsContext &operator=(GraphicsContext &&) = delete;

  /** Print OpenGL vendor / renderer / version to stdout. */
  void printInfo() const noexcept;

  /** Apply stateless initial OpenGL render state. */
  void applyInitialState(int framebufferWidth, int framebufferHeight) const;

  /** @returns true if the VSync interval was applied. */
  bool setVSync(bool enabled) noexcept;
};

} // namespace realis::renderer
