/**
 * @file Shader.hpp
 * @brief OpenGL shader program abstraction — REALIS Renderer
 */
#pragma once

#include <glm/glm.hpp>
#include <string>
#include <unordered_map>


namespace realis::renderer {

/**
 * @brief Encapsulates an OpenGL shader program (vertex + fragment).
 *
 * Handles compilation, linking, and uniform management with location caching.
 */
class Shader {
public:
  /**
   * @brief Construct a Shader from source strings.
   * @param vertexSource    GLSL vertex shader source
   * @param fragmentSource  GLSL fragment shader source
   * @throws std::runtime_error if compilation or linking fails.
   */
  Shader(const std::string &vertexSource, const std::string &fragmentSource);
  ~Shader();

  // Delete copy/assignment to avoid double-free of GPU resources
  Shader(const Shader &) = delete;
  Shader &operator=(const Shader &) = delete;

  // Support move for flexibility
  Shader(Shader &&other) noexcept;
  Shader &operator=(Shader &&other) noexcept;

  /** Bind this shader program for use (glUseProgram). */
  void bind() const;
  /** Unbind any shader program (glUseProgram(0)). */
  static void unbind();

  // ── Uniform Setters ───────────────────────────────────────────────────────
  void setUniformInt(const std::string &name, int value);
  void setUniformFloat(const std::string &name, float value);
  void setUniformVec3(const std::string &name, const glm::vec3 &value);
  void setUniformMat4(const std::string &name, const glm::mat4 &value);

private:
  unsigned int m_rendererID = 0;
  mutable std::unordered_map<std::string, int> m_uniformLocationCache;

  int getUniformLocation(const std::string &name) const;
  unsigned int compileShader(unsigned int type, const std::string &source);
};

} // namespace realis::renderer
