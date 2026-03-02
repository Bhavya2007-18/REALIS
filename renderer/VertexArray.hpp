/**
 * @file VertexArray.hpp
 * @brief OpenGL Vertex Array Object (VAO) abstraction
 */
#pragma once

#include "VertexBuffer.hpp"
#include <glad/glad.h>
#include <vector>

namespace realis::renderer {

/**
 * @brief Represents a single vertex attribute (e.g., position, color).
 */
struct VertexBufferElement {
  unsigned int type;
  unsigned int count;
  unsigned char normalized;

  static unsigned int getSizeOfType(unsigned int type) {
    switch (type) {
    case GL_FLOAT:
      return 4;
    case GL_UNSIGNED_INT:
      return 4;
    case GL_UNSIGNED_BYTE:
      return 1;
    }
    return 0;
  }
};

/**
 * @brief Manages the layout of a VertexBuffer.
 */
class VertexBufferLayout {
public:
  VertexBufferLayout() : m_stride(0) {}

  void pushFloat(unsigned int count) {
    m_elements.push_back({GL_FLOAT, count, GL_FALSE});
    m_stride += count * VertexBufferElement::getSizeOfType(GL_FLOAT);
  }

  void pushUint(unsigned int count) {
    m_elements.push_back({GL_UNSIGNED_INT, count, GL_FALSE});
    m_stride += count * VertexBufferElement::getSizeOfType(GL_UNSIGNED_INT);
  }

  void pushUByte(unsigned int count) {
    m_elements.push_back({GL_UNSIGNED_BYTE, count, GL_TRUE});
    m_stride += count * VertexBufferElement::getSizeOfType(GL_UNSIGNED_BYTE);
  }

  inline const std::vector<VertexBufferElement> &getElements() const {
    return m_elements;
  }
  inline unsigned int getStride() const { return m_stride; }

private:
  std::vector<VertexBufferElement> m_elements;
  unsigned int m_stride;
};

/**
 * @brief RAII wrapper for an OpenGL Vertex Array.
 */
class VertexArray {
public:
  VertexArray();
  ~VertexArray();

  // Delete copy/assignment
  VertexArray(const VertexArray &) = delete;
  VertexArray &operator=(const VertexArray &) = delete;

  // Support move
  VertexArray(VertexArray &&other) noexcept;
  VertexArray &operator=(VertexArray &&other) noexcept;

  /**
   * @brief Adds a vertex buffer with a specific layout to the VAO.
   */
  void addBuffer(const VertexBuffer &vb, const VertexBufferLayout &layout);

  void bind() const;
  static void unbind();

private:
  unsigned int m_rendererID = 0;
};

} // namespace realis::renderer
