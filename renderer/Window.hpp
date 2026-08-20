
#pragma once

#include <string>


struct GLFWwindow;

namespace realis::renderer {


class Window {
public:
  
  Window(int width, int height, const std::string &title);
  ~Window();

  
  Window(const Window &) = delete;
  Window &operator=(const Window &) = delete;
  Window(Window &&) = delete;
  Window &operator=(Window &&) = delete;

  
  bool shouldClose() const noexcept;
  GLFWwindow *handle() const noexcept { return m_handle; }
  int width() const noexcept { return m_width; }
  int height() const noexcept { return m_height; }

  
  void swapBuffers() const noexcept;
  void pollEvents() const noexcept;

  
  
  bool isKeyPressed(int glfwKey) const noexcept;

private:
  GLFWwindow *m_handle = nullptr;
  int m_width = 0;
  int m_height = 0;

  
  static void framebufferSizeCallback(GLFWwindow *window, int w,
                                      int h) noexcept;

  
  static void errorCallback(int code, const char *description) noexcept;
};

} 