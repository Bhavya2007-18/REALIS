/**
 * @file IndexBuffer.hpp
 * @brief OpenGL Index Buffer Object (IBO/EBO) abstraction
 */
#pragma once

namespace realis::renderer {

/**
 * @brief RAII wrapper for an OpenGL Index Buffer.
 *
 * Specifically handles GL_ELEMENT_ARRAY_BUFFER.
 */
class IndexBuffer {
public:
  /**
   * @param data   Pointer to the index data (must be unsigned int)
   * @param count  Number of indices
   * @param usage  GL_STATIC_DRAW, etc.
   */
  IndexBuffer(const unsigned int *data, unsigned int count, unsigned int usage);
  ~IndexBuffer();

  // Delete copy/assignment
  IndexBuffer(const IndexBuffer &) = delete;
  IndexBuffer &operator=(const IndexBuffer &) = delete;

  // Support move
  IndexBuffer(IndexBuffer &&other) noexcept;
  IndexBuffer &operator=(IndexBuffer &&other) noexcept;

  void bind() const;
  static void unbind();

  unsigned int getCount() const { return m_count; }

private:
  unsigned int m_rendererID = 0;
  unsigned int m_count = 0;
};

} // namespace realis::renderer
