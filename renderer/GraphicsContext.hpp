
#pragma once

struct GLFWwindow;

namespace realis::renderer {


class GraphicsContext {
public:
  
  explicit GraphicsContext(GLFWwindow *window);
  ~GraphicsContext() = default;

  
  GraphicsContext(const GraphicsContext &) = delete;
  GraphicsContext &operator=(const GraphicsContext &) = delete;
  GraphicsContext(GraphicsContext &&) = delete;
  GraphicsContext &operator=(GraphicsContext &&) = delete;

  
  void printInfo() const noexcept;

  
  void applyInitialState(int framebufferWidth, int framebufferHeight) const;

  
  bool setVSync(bool enabled) noexcept;
};

} 