#pragma once

#include "Camera.hpp"
#include "IndexBuffer.hpp"
#include "Shader.hpp"
#include "VertexArray.hpp"
#include "VertexBuffer.hpp"
#include <memory>


namespace realis::renderer {

class Renderer;


class AxisRenderer {
public:
  AxisRenderer(float length = 2.0f);
  ~AxisRenderer() = default;

  void draw(const Renderer &renderer, const Camera &camera) const;

private:
  std::unique_ptr<VertexArray> m_va;
  std::unique_ptr<VertexBuffer> m_vb;
  std::unique_ptr<IndexBuffer> m_ib;
  std::unique_ptr<Shader> m_shader;
};

} 