#include <glad/glad.h>
#include "Grid.hpp"
#include "Renderer.hpp"
#include <string>

namespace realis::renderer {

Grid::Grid(float size) : m_size(size) {
  // 1. Create a large quad on the XZ plane
  float vertices[] = {-size, 0.0f, -size, size,  0.0f, -size,
                      size,  0.0f, size,  -size, 0.0f, size};

  unsigned int indices[] = {0, 1, 2, 2, 3, 0};

  m_va = std::make_unique<VertexArray>();
  m_vb = std::make_unique<VertexBuffer>(vertices, sizeof(vertices),
                                        GL_STATIC_DRAW);

  VertexBufferLayout layout;
  layout.pushFloat(3); // position
  m_va->addBuffer(*m_vb, layout);

  m_ib = std::make_unique<IndexBuffer>(indices, 6, GL_STATIC_DRAW);

  // 2. Procedural Grid Shader
  const std::string vertexSrc = R"(
        #version 450 core
        layout(location = 0) in vec3 a_Pos;
        layout(location = 0) out vec3 v_WorldPos;
        uniform mat4 u_VP;
        void main() {
            v_WorldPos = a_Pos;
            // Apply slight Y offset to prevent Z-fighting with origin/axis
            gl_Position = u_VP * vec4(a_Pos + vec3(0.0, -0.001, 0.0), 1.0);
        }
    )";

  const std::string fragmentSrc = R"(
        #version 450 core
        layout(location = 0) in vec3 v_WorldPos;
        out vec4 outColor;

        float grid(vec2 pos, float size) {
            vec2 r = pos / size;
            vec2 grid = abs(fract(r - 0.5) - 0.5) / fwidth(r);
            float line = min(grid.x, grid.y);
            return 1.0 - min(line, 1.0);
        }

        void main() {
            // Major lines every 5.0 units, Minor every 1.0
            float major = grid(v_WorldPos.xz, 5.0);
            float minor = grid(v_WorldPos.xz, 1.0);
            
            vec3 color = vec3(0.5); // Light grey minor lines
            color = mix(color, vec3(0.9), major); // White major lines
            
            float alpha = max(major * 0.3, minor * 0.15);
            
            // Fade based on distance to center
            float dist = length(v_WorldPos.xz);
            alpha *= (1.0 - smoothstep(0.0, 100.0, dist));

            if (alpha < 0.01) discard;
            outColor = vec4(color, alpha);
        }
    )";

  m_shader = std::make_unique<Shader>(vertexSrc, fragmentSrc);
}

void Grid::draw(const Renderer &renderer, const Camera &camera) const {
  m_shader->bind();
  m_shader->setUniformMat4("u_VP", camera.getProjectionMatrix() *
                                       camera.getViewMatrix());

  // We need to enable blending for the alpha-based procedural grid
  glEnable(GL_BLEND);
  glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);

  renderer.draw(*m_va, *m_ib, *m_shader);

  glDisable(GL_BLEND);
}

} // namespace realis::renderer
