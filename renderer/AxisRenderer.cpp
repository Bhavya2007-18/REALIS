#include <glad/glad.h>
#include "AxisRenderer.hpp"
#include "Renderer.hpp"

namespace realis::renderer {

AxisRenderer::AxisRenderer(float length) {
  // 1. Create Axis Vertices (Red:X, Green:Y, Blue:Z)
  // [Pos3, Color3]
  float vertices[] = {
      0.0f,   0.0f,   0.0f,   1.0f, 0.0f, 0.0f, // Origin (Red X start)
      length, 0.0f,   0.0f,   1.0f, 0.0f, 0.0f, // X end

      0.0f,   0.0f,   0.0f,   0.0f, 1.0f, 0.0f, // Origin (Green Y start)
      0.0f,   length, 0.0f,   0.0f, 1.0f, 0.0f, // Y end

      0.0f,   0.0f,   0.0f,   0.0f, 0.0f, 1.0f, // Origin (Blue Z start)
      0.0f,   0.0f,   length, 0.0f, 0.0f, 1.0f  // Z end
  };

  unsigned int indices[] = {0, 1, 2, 3, 4, 5};

  m_va = std::make_unique<VertexArray>();
  m_vb = std::make_unique<VertexBuffer>(vertices, sizeof(vertices),
                                        GL_STATIC_DRAW);

  VertexBufferLayout layout;
  layout.pushFloat(3); // position
  layout.pushFloat(3); // color
  m_va->addBuffer(*m_vb, layout);

  m_ib = std::make_unique<IndexBuffer>(indices, 6, GL_STATIC_DRAW);

  // 2. Simple Line Shader
  const std::string vertexSrc = R"(
        #version 450 core
        layout(location = 0) in vec3 a_Pos;
        layout(location = 1) in vec3 a_Color;
        layout(location = 0) out vec3 v_Color;
        uniform mat4 u_VP;
        void main() {
            v_Color = a_Color;
            gl_Position = u_VP * vec4(a_Pos, 1.0);
        }
    )";

  const std::string fragmentSrc = R"(
        #version 450 core
        layout(location = 0) in vec3 v_Color;
        out vec4 outColor;
        void main() {
            outColor = vec4(v_Color, 1.0);
        }
    )";

  m_shader = std::make_unique<Shader>(vertexSrc, fragmentSrc);
}

void AxisRenderer::draw(const Renderer &renderer, const Camera &camera) const {
  m_shader->bind();
  m_shader->setUniformMat4("u_VP", camera.getProjectionMatrix() *
                                       camera.getViewMatrix());

  // We explicitly draw as lines
  renderer.drawLines(*m_va, *m_ib, *m_shader);
}

} // namespace realis::renderer
