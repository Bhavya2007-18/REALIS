/**
 * @file Window.hpp
 * @brief GLFW window abstraction — REALIS Renderer
 *
 * Owns the GLFWwindow* lifecycle. Does NOT load OpenGL functions —
 * that responsibility belongs to GraphicsContext.
 *
 * Usage:
 *   realis::renderer::Window window(1280, 720, "REALIS");
 *   // create GraphicsContext with window.handle()
 *   while (!window.shouldClose()) { ... window.swapBuffers();
 * window.pollEvents(); }
 */
#pragma once

#include <string>

// Forward-declare to avoid including GLFW in headers
struct GLFWwindow;

namespace realis::renderer {

/**
 * @brief RAII wrapper around a GLFW window.
 *
 * Initialises GLFW and creates a GLFW window with:
 *   - OpenGL 4.5 Core Profile
 *   - Debug context enabled
 *
 * Throws std::runtime_error on any GLFW or window-creation failure.
 * Non-copyable, non-movable (owns an opaque C handle).
 */
class Window {
public:
  /**
   * @param width   Framebuffer width in pixels
   * @param height  Framebuffer height in pixels
   * @param title   Window title (UTF-8)
   */
  Window(int width, int height, const std::string &title);
  ~Window();

  // Non-copyable, non-movable
  Window(const Window &) = delete;
  Window &operator=(const Window &) = delete;
  Window(Window &&) = delete;
  Window &operator=(Window &&) = delete;

  // ── Query ─────────────────────────────────────────────────────────────────
  bool shouldClose() const noexcept;
  GLFWwindow *handle() const noexcept { return m_handle; }
  int width() const noexcept { return m_width; }
  int height() const noexcept { return m_height; }

  // ── Per-frame operations ──────────────────────────────────────────────────
  void swapBuffers() const noexcept;
  void pollEvents() const noexcept;

  // ── Input ─────────────────────────────────────────────────────────────────
  /** Returns true if the given GLFW key code is currently pressed. */
  bool isKeyPressed(int glfwKey) const noexcept;

private:
  GLFWwindow *m_handle = nullptr;
  int m_width = 0;
  int m_height = 0;

  // Framebuffer resize callback — updates glViewport automatically
  static void framebufferSizeCallback(GLFWwindow *window, int w,
                                      int h) noexcept;

  // GLFW error callback — prints to stderr
  static void errorCallback(int code, const char *description) noexcept;
};

} // namespace realis::renderer
