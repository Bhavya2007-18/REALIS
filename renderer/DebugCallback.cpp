/**
 * @file DebugCallback.cpp
 * @brief OpenGL KHR_debug structured message callback — REALIS Renderer
 *
 * All HIGH severity messages are treated as fatal in debug builds.
 * NOTIFICATION severity is suppressed via glDebugMessageControl so this
 * callback should only fire for meaningful events.
 */

#include "DebugCallback.hpp"

#include <glad/glad.h>

#include <cstdio>
#include <cstdlib>

namespace realis::renderer {

// ─────────────────────────────────────────────────────────────────────────────
// String helpers
// ─────────────────────────────────────────────────────────────────────────────

static const char *sourceString(GLenum source) noexcept {
  switch (source) {
  case GL_DEBUG_SOURCE_API:
    return "API";
  case GL_DEBUG_SOURCE_WINDOW_SYSTEM:
    return "WINDOW_SYSTEM";
  case GL_DEBUG_SOURCE_SHADER_COMPILER:
    return "SHADER_COMPILER";
  case GL_DEBUG_SOURCE_THIRD_PARTY:
    return "THIRD_PARTY";
  case GL_DEBUG_SOURCE_APPLICATION:
    return "APPLICATION";
  case GL_DEBUG_SOURCE_OTHER:
    return "OTHER";
  default:
    return "UNKNOWN";
  }
}

static const char *typeString(GLenum type) noexcept {
  switch (type) {
  case GL_DEBUG_TYPE_ERROR:
    return "ERROR";
  case GL_DEBUG_TYPE_DEPRECATED_BEHAVIOR:
    return "DEPRECATED_BEHAVIOR";
  case GL_DEBUG_TYPE_UNDEFINED_BEHAVIOR:
    return "UNDEFINED_BEHAVIOR";
  case GL_DEBUG_TYPE_PORTABILITY:
    return "PORTABILITY";
  case GL_DEBUG_TYPE_PERFORMANCE:
    return "PERFORMANCE";
  case GL_DEBUG_TYPE_MARKER:
    return "MARKER";
  case GL_DEBUG_TYPE_PUSH_GROUP:
    return "PUSH_GROUP";
  case GL_DEBUG_TYPE_POP_GROUP:
    return "POP_GROUP";
  case GL_DEBUG_TYPE_OTHER:
    return "OTHER";
  default:
    return "UNKNOWN";
  }
}

static const char *severityString(GLenum severity) noexcept {
  switch (severity) {
  case GL_DEBUG_SEVERITY_HIGH:
    return "HIGH";
  case GL_DEBUG_SEVERITY_MEDIUM:
    return "MEDIUM";
  case GL_DEBUG_SEVERITY_LOW:
    return "LOW";
  case GL_DEBUG_SEVERITY_NOTIFICATION:
    return "NOTIFICATION";
  default:
    return "UNKNOWN";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Callback
// ─────────────────────────────────────────────────────────────────────────────

static void APIENTRY onGLDebugMessage(GLenum source, GLenum type, GLuint id,
                                      GLenum severity, GLsizei /*length*/,
                                      const GLchar *message,
                                      const void * /*userParam*/) noexcept {
  // Notifications are suppressed by glDebugMessageControl, but guard anyway.
  if (severity == GL_DEBUG_SEVERITY_NOTIFICATION)
    return;

  const char *sev = severityString(severity);

  // Choose output prefix based on severity
  const char *prefix = "[INFO]";
  if (severity == GL_DEBUG_SEVERITY_MEDIUM)
    prefix = "[WARN]";
  if (severity == GL_DEBUG_SEVERITY_HIGH)
    prefix = "[ERROR]";

  std::fprintf(stderr,
               "[GL DEBUG] %s Source: %-16s | Type: %-22s | ID: 0x%04X | "
               "Severity: %-12s\n"
               "           Msg: %s\n",
               prefix, sourceString(source), typeString(type), id, sev,
               message);
  std::fflush(stderr);

  // Fatal halt on HIGH severity in debug builds — never silently continue
#if !defined(NDEBUG)
  if (severity == GL_DEBUG_SEVERITY_HIGH) {
    std::fprintf(stderr, "[GL DEBUG] FATAL: HIGH severity OpenGL error "
                         "encountered. Aborting.\n");
    std::abort();
  }
#endif
}

// ─────────────────────────────────────────────────────────────────────────────
// Public interface
// ─────────────────────────────────────────────────────────────────────────────

void installDebugCallback() {
  // Synchronous delivery ensures the callback fires exactly at the
  // offending call, making stack traces useful.
  glEnable(GL_DEBUG_OUTPUT);
  glEnable(GL_DEBUG_OUTPUT_SYNCHRONOUS);

  glDebugMessageCallback(onGLDebugMessage, nullptr);

  // Suppress NOTIFICATION spam; we only care about LOW and above
  glDebugMessageControl(GL_DONT_CARE,                   // source
                        GL_DONT_CARE,                   // type
                        GL_DEBUG_SEVERITY_NOTIFICATION, // severity
                        0, nullptr,
                        GL_FALSE); // disable notifications

  // Ensure all other severities are enabled
  glDebugMessageControl(GL_DONT_CARE, GL_DONT_CARE, GL_DEBUG_SEVERITY_LOW, 0,
                        nullptr, GL_TRUE);
  glDebugMessageControl(GL_DONT_CARE, GL_DONT_CARE, GL_DEBUG_SEVERITY_MEDIUM, 0,
                        nullptr, GL_TRUE);
  glDebugMessageControl(GL_DONT_CARE, GL_DONT_CARE, GL_DEBUG_SEVERITY_HIGH, 0,
                        nullptr, GL_TRUE);
}

} // namespace realis::renderer
