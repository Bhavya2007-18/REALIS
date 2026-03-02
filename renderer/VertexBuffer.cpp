/**
 * @file VertexBuffer.cpp
 * @brief VertexBuffer implementation
 */
#include "VertexBuffer.hpp"
#include <glad/glad.h>

namespace realis::renderer {

VertexBuffer::VertexBuffer(const void *data, unsigned int size,
                           unsigned int usage) {
  glGenBuffers(1, &m_rendererID);
  glBindBuffer(GL_ARRAY_BUFFER, m_rendererID);
  glBufferData(GL_ARRAY_BUFFER, size, data, usage);
}

VertexBuffer::~VertexBuffer() {
  if (m_rendererID != 0) {
    glDeleteBuffers(1, &m_rendererID);
  }
}

VertexBuffer::VertexBuffer(VertexBuffer &&other) noexcept
    : m_rendererID(other.m_rendererID) {
  other.m_rendererID = 0;
}

VertexBuffer &VertexBuffer::operator=(VertexBuffer &&other) noexcept {
  if (this != &other) {
    if (m_rendererID != 0)
      glDeleteBuffers(1, &m_rendererID);
    m_rendererID = other.m_rendererID;
    other.m_rendererID = 0;
  }
  return *this;
}

void VertexBuffer::bind() const { glBindBuffer(GL_ARRAY_BUFFER, m_rendererID); }

void VertexBuffer::unbind() { glBindBuffer(GL_ARRAY_BUFFER, 0); }

} // namespace realis::renderer
