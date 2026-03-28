
#pragma once

#include <glm/glm.hpp>
#include <string>
#include <unordered_map>


namespace realis::renderer {


class Shader {
public:
  
  Shader(const std::string &vertexSource, const std::string &fragmentSource);
  ~Shader();

  
  Shader(const Shader &) = delete;
  Shader &operator=(const Shader &) = delete;

  
  Shader(Shader &&other) noexcept;
  Shader &operator=(Shader &&other) noexcept;

  
  void bind() const;
  
  static void unbind();

  
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

} 