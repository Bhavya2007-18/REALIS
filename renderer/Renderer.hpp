/**
 * @file Renderer.hpp
 * @brief Centralised drawing authority — REALIS Renderer
 */
#pragma once

#include "IndexBuffer.hpp"
#include "Shader.hpp"
#include "VertexArray.hpp"


namespace realis::renderer {

/**
 * @brief High-level API for submitting draw calls and managing global state.
 */
class Renderer {
public:
  /**
   * @brief Clear the color and depth buffers.
   */
  void clear() const;

  /**
   * @brief Draw indexed geometry.
   * @param va      The VertexArray containing geometry and layout
   * @param ib      The IndexBuffer containing indices
   * @param shader  The Shader program to use
   */
  void draw(const VertexArray &va, const IndexBuffer &ib,
            const Shader &shader) const;
  void drawLines(const VertexArray &va, const IndexBuffer &ib, const Shader &shader) const;

  /**
   * @brief Configure global OpenGL state (Depth test, Culling, etc.)
   */
  void setGLState() const;
};

} // namespace realis::renderer
