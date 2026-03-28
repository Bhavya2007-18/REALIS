
#pragma once

namespace realis::renderer {


class VertexBuffer {
public:
  
  VertexBuffer(const void *data, unsigned int size, unsigned int usage);
  ~VertexBuffer();

  
  VertexBuffer(const VertexBuffer &) = delete;
  VertexBuffer &operator=(const VertexBuffer &) = delete;

  
  VertexBuffer(VertexBuffer &&other) noexcept;
  VertexBuffer &operator=(VertexBuffer &&other) noexcept;

  void bind() const;
  static void unbind();

private:
  unsigned int m_rendererID = 0;
};

} 