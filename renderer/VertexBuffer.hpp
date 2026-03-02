/**
 * @file VertexBuffer.hpp
 * @brief OpenGL Vertex Buffer Object (VBO) abstraction
 */
#pragma once

namespace realis::renderer {

/**
 * @brief RAII wrapper for an OpenGL Vertex Buffer.
 */
class VertexBuffer {
public:
  /**
   * @param data   Pointer to the vertex data
   * @param size   Size of the data in bytes
   * @param usage  GL_STATIC_DRAW, GL_DYNAMIC_DRAW, etc.
   */
  VertexBuffer(const void *data, unsigned int size, unsigned int usage);
  ~VertexBuffer();

  // Delete copy/assignment
  VertexBuffer(const VertexBuffer &) = delete;
  VertexBuffer &operator=(const VertexBuffer &) = delete;

  // Support move
  VertexBuffer(VertexBuffer &&other) noexcept;
  VertexBuffer &operator=(VertexBuffer &&other) noexcept;

  void bind() const;
  static void unbind();

private:
  unsigned int m_rendererID = 0;
};

} // namespace realis::renderer
