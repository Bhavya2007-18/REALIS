
#pragma once

#include "IndexBuffer.hpp"
#include "Shader.hpp"
#include "VertexArray.hpp"


namespace realis::renderer {


class Renderer {
public:
  
  void clear() const;

  
  void draw(const VertexArray &va, const IndexBuffer &ib,
            const Shader &shader) const;
  void drawLines(const VertexArray &va, const IndexBuffer &ib, const Shader &shader) const;

  
  void setGLState() const;
};

} 