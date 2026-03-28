#pragma once

#include "Camera.hpp"
#include "IndexBuffer.hpp"
#include "Shader.hpp"
#include "VertexArray.hpp"
#include "VertexBuffer.hpp"
#include <memory>


namespace realis::renderer {

class Renderer;


class Grid {
public:
  Grid(float size = 100.0f);
  ~Grid() = default;

  void draw(const Renderer &renderer, const Camera &camera) const;

private:
  std::unique_ptr<VertexArray> m_va;
  std::unique_ptr<VertexBuffer> m_vb;
  std::unique_ptr<IndexBuffer> m_ib;
  std::unique_ptr<Shader> m_shader;

  float m_size;
};

} 