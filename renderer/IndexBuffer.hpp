
#pragma once

namespace realis::renderer {


class IndexBuffer {
public:
  
  IndexBuffer(const unsigned int *data, unsigned int count, unsigned int usage);
  ~IndexBuffer();

  
  IndexBuffer(const IndexBuffer &) = delete;
  IndexBuffer &operator=(const IndexBuffer &) = delete;

  
  IndexBuffer(IndexBuffer &&other) noexcept;
  IndexBuffer &operator=(IndexBuffer &&other) noexcept;

  void bind() const;
  static void unbind();

  unsigned int getCount() const { return m_count; }

private:
  unsigned int m_rendererID = 0;
  unsigned int m_count = 0;
};

} 