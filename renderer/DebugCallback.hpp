/**
 * @file DebugCallback.hpp
 * @brief OpenGL KHR_debug message callback — REALIS Renderer
 *
 * Registers a structured debug callback that prints:
 *   [GL DEBUG] Source | Type | ID | Severity | Message
 *
 * All HIGH severity messages abort in debug builds so errors
 * are never silently swallowed.
 */
#pragma once

namespace realis::renderer {

/**
 * @brief Install the OpenGL debug message callback.
 *
 * Must be called after a valid OpenGL 4.5 Core debug context exists
 * (i.e. after GraphicsContext construction).
 *
 * Filters out GL_DEBUG_SEVERITY_NOTIFICATION to prevent log spam.
 */
void installDebugCallback();

} // namespace realis::renderer
