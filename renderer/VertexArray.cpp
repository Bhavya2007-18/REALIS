
#include "VertexArray.hpp"
#include <glad/glad.h>

namespace realis::renderer {

VertexArray::VertexArray() { glGenVertexArrays(1, &m_rendererID); }

VertexArray::~VertexArray() {
  if (m_rendererID != 0) {
    glDeleteVertexArrays(1, &m_rendererID);
  }
}

VertexArray::VertexArray(VertexArray &&other) noexcept
    : m_rendererID(other.m_rendererID) {
  other.m_rendererID = 0;
}

VertexArray &VertexArray::operator=(VertexArray &&other) noexcept {
  if (this != &other) {
    if (m_rendererID != 0)
      glDeleteVertexArrays(1, &m_rendererID);
    m_rendererID = other.m_rendererID;
    other.m_rendererID = 0;
  }
  return *this;
}

void VertexArray::addBuffer(const VertexBuffer &vb,
                            const VertexBufferLayout &layout) {
  bind();
  vb.bind();
  const auto &elements = layout.getElements();
  unsigned int offset = 0;
  for (unsigned int i = 0; i < elements.size(); ++i) {
    const auto &element = elements[i];
    glEnableVertexAttribArray(i);
    glVertexAttribPointer(i, element.count, element.type, element.normalized,
                          layout.getStride(), (const void *)(uintptr_t)offset);
    offset += element.count * VertexBufferElement::getSizeOfType(element.type);
  }
}

void VertexArray::bind() const { glBindVertexArray(m_rendererID); }

void VertexArray::unbind() { glBindVertexArray(0); }

} 