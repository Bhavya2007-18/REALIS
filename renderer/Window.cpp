

#include "Window.hpp"


#include <glad/glad.h>

#define GLFW_INCLUDE_NONE
#include <GLFW/glfw3.h>


#include <cstdio>
#include <stdexcept>
#include <string>

namespace realis::renderer {





void Window::errorCallback(int code, const char *description) noexcept {
  std::fprintf(stderr, "[GLFW ERROR] Code: %d — %s\n", code, description);
}

void Window::framebufferSizeCallback(GLFWwindow * , int w,
                                     int h) noexcept {
  glViewport(0, 0, w, h);
  std::fprintf(stdout, "[Window] Framebuffer resized to %d x %d\n", w, h);
}





Window::Window(int width, int height, const std::string &title)
    : m_width(width), m_height(height) {
  
  glfwSetErrorCallback(errorCallback);

  if (!glfwInit()) {
    throw std::runtime_error(
        "[Window] glfwInit() failed — cannot create window.");
  }

  
  glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 4);
  glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 5);
  glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
  glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT,
                 GLFW_FALSE); 

  
  
  
  
#if !defined(NDEBUG)
  glfwWindowHint(GLFW_OPENGL_DEBUG_CONTEXT, GLFW_TRUE);
#endif

  
  m_handle = glfwCreateWindow(width, height, title.c_str(), nullptr, nullptr);
  if (!m_handle) {
    glfwTerminate();
    throw std::runtime_error("[Window] glfwCreateWindow() failed — check "
                             "OpenGL 4.5 driver support.");
  }

  
  glfwSetWindowUserPointer(m_handle, this);

  
  glfwMakeContextCurrent(m_handle);

  
  glfwSetFramebufferSizeCallback(m_handle, framebufferSizeCallback);

  std::fprintf(stdout, "[Window] Created %d×%d window: \"%s\"\n", width, height,
               title.c_str());
}

Window::~Window() {
  if (m_handle) {
    glfwDestroyWindow(m_handle);
    m_handle = nullptr;
  }
  glfwTerminate();
  std::fprintf(stdout, "[Window] Destroyed and GLFW terminated.\n");
}





bool Window::shouldClose() const noexcept {
  return glfwWindowShouldClose(m_handle) != 0;
}

void Window::swapBuffers() const noexcept { glfwSwapBuffers(m_handle); }

void Window::pollEvents() const noexcept { glfwPollEvents(); }

bool Window::isKeyPressed(int glfwKey) const noexcept {
  return glfwGetKey(m_handle, glfwKey) == GLFW_PRESS;
}

} 