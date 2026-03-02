/**
 * @file IndexBuffer.cpp
 * @brief IndexBuffer implementation
 */
#include "IndexBuffer.hpp"
#include <glad/glad.h>

namespace realis::renderer {

IndexBuffer::IndexBuffer(const unsigned int *data, unsigned int count,
                         unsigned int usage)
    : m_count(count) {
  glGenBuffers(1, &m_rendererID);
  glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, m_rendererID);
  glBufferData(GL_ELEMENT_ARRAY_BUFFER, count * sizeof(unsigned int), data,
               usage);
}

IndexBuffer::~IndexBuffer() {
  if (m_rendererID != 0) {
    glDeleteBuffers(1, &m_rendererID);
  }
}

IndexBuffer::IndexBuffer(IndexBuffer &&other) noexcept
    : m_rendererID(other.m_rendererID), m_count(other.m_count) {
  other.m_rendererID = 0;
  other.m_count = 0;
}

IndexBuffer &IndexBuffer::operator=(IndexBuffer &&other) noexcept {
  if (this != &other) {
    if (m_rendererID != 0)
      glDeleteBuffers(1, &m_rendererID);
    m_rendererID = other.m_rendererID;
    m_count = other.m_count;
    other.m_rendererID = 0;
    other.m_count = 0;
  }
  return *this;
}

void IndexBuffer::bind() const {
  glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, m_rendererID);
}

void IndexBuffer::unbind() { glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, 0); }

} // namespace realis::renderer
