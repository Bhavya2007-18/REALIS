
#include "Shader.hpp"

#include <cstdio>
#include <glad/glad.h>
#include <glm/gtc/type_ptr.hpp>
#include <stdexcept>
#include <vector>


namespace realis::renderer {

Shader::Shader(const std::string &vertexSource,
               const std::string &fragmentSource) {
  unsigned int vs = compileShader(GL_VERTEX_SHADER, vertexSource);
  unsigned int fs = compileShader(GL_FRAGMENT_SHADER, fragmentSource);

  m_rendererID = glCreateProgram();
  glAttachShader(m_rendererID, vs);
  glAttachShader(m_rendererID, fs);
  glLinkProgram(m_rendererID);
  glValidateProgram(m_rendererID);

  
  int success;
  glGetProgramiv(m_rendererID, GL_LINK_STATUS, &success);
  if (!success) {
    int length;
    glGetProgramiv(m_rendererID, GL_INFO_LOG_LENGTH, &length);
    std::vector<char> infoLog(length);
    glGetProgramInfoLog(m_rendererID, length, &length, infoLog.data());

    glDeleteProgram(m_rendererID);
    glDeleteShader(vs);
    glDeleteShader(fs);

    std::fprintf(stderr, "[Shader] Program Link Error:\n%s\n", infoLog.data());
    throw std::runtime_error("Shader program linking failed.");
  }

  
  glDeleteShader(vs);
  glDeleteShader(fs);
}

Shader::~Shader() {
  if (m_rendererID != 0) {
    glDeleteProgram(m_rendererID);
  }
}

Shader::Shader(Shader &&other) noexcept : m_rendererID(other.m_rendererID) {
  other.m_rendererID = 0;
}

Shader &Shader::operator=(Shader &&other) noexcept {
  if (this != &other) {
    if (m_rendererID != 0)
      glDeleteProgram(m_rendererID);
    m_rendererID = other.m_rendererID;
    other.m_rendererID = 0;
  }
  return *this;
}

void Shader::bind() const { glUseProgram(m_rendererID); }

void Shader::unbind() { glUseProgram(0); }

void Shader::setUniformInt(const std::string &name, int value) {
  glUniform1i(getUniformLocation(name), value);
}

void Shader::setUniformFloat(const std::string &name, float value) {
  glUniform1f(getUniformLocation(name), value);
}

void Shader::setUniformVec3(const std::string &name, const glm::vec3 &value) {
  glUniform3f(getUniformLocation(name), value.x, value.y, value.z);
}

void Shader::setUniformMat4(const std::string &name, const glm::mat4 &value) {
  glUniformMatrix4fv(getUniformLocation(name), 1, GL_FALSE,
                     glm::value_ptr(value));
}

int Shader::getUniformLocation(const std::string &name) const {
  if (m_uniformLocationCache.find(name) != m_uniformLocationCache.end())
    return m_uniformLocationCache[name];

  int location = glGetUniformLocation(m_rendererID, name.c_str());
  if (location == -1) {
    std::fprintf(stderr, "[Shader] Warning: uniform '%s' not found.\n",
                 name.c_str());
  }

  m_uniformLocationCache[name] = location;
  return location;
}

unsigned int Shader::compileShader(unsigned int type,
                                   const std::string &source) {
  unsigned int id = glCreateShader(type);
  const char *src = source.c_str();
  glShaderSource(id, 1, &src, nullptr);
  glCompileShader(id);

  int success;
  glGetShaderiv(id, GL_COMPILE_STATUS, &success);
  if (!success) {
    int length;
    glGetShaderiv(id, GL_INFO_LOG_LENGTH, &length);
    std::vector<char> infoLog(length);
    glGetShaderInfoLog(id, length, &length, infoLog.data());

    const char *shaderTypeStr =
        (type == GL_VERTEX_SHADER ? "Vertex" : "Fragment");
    std::fprintf(stderr, "[Shader] %s Compile Error:\n%s\n", shaderTypeStr,
                 infoLog.data());

    glDeleteShader(id);
    throw std::runtime_error("Shader compilation failed.");
  }

  return id;
}

} 