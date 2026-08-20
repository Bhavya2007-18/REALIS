
#include "Renderer.hpp"
#include <glad/glad.h>

namespace realis::renderer {

void Renderer::clear() const {
  glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
}

void Renderer::draw(const VertexArray &va, const IndexBuffer &ib,
                    const Shader &shader) const {
  shader.bind();
  va.bind();
  ib.bind();
  glDrawElements(GL_TRIANGLES, ib.getCount(), GL_UNSIGNED_INT, nullptr);
}

void Renderer::drawLines(const VertexArray &va, const IndexBuffer &ib, const Shader &shader) const {
  shader.bind();
  va.bind();
  ib.bind();
  glDrawElements(GL_LINES, ib.getCount(), GL_UNSIGNED_INT, nullptr);
}

void Renderer::setGLState() const {
  glEnable(GL_DEPTH_TEST);
  glDepthFunc(GL_LESS);

  glEnable(GL_CULL_FACE);
  glCullFace(GL_BACK);
  glFrontFace(GL_CCW);
}

} 