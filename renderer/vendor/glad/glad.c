/*
 * GLAD - OpenGL Loader - C Implementation
 * For OpenGL 4.5 Core Profile + GL_KHR_debug
 *
 * This file loads all required OpenGL function pointers using the
 * loader provided by GLFW (glfwGetProcAddress).
 */

#include "glad.h"
#include <stdlib.h>
#include <string.h>


struct gladGLversionStruct GLVersion = {0, 0};

/* =========================================================================
 * Function pointer storage
 * ========================================================================= */
PFNGLDEBUGMESSAGECALLBACKPROC glad_glDebugMessageCallback = NULL;
PFNGLDEBUGMESSAGECONTROLPROC glad_glDebugMessageControl = NULL;
PFNGLCLEARPROC glad_glClear = NULL;
PFNGLCLEARCOLORPROC glad_glClearColor = NULL;
PFNGLENABLEPROC glad_glEnable = NULL;
PFNGLDISABLEPROC glad_glDisable = NULL;
PFNGLVIEWPORTPROC glad_glViewport = NULL;
PFNGLDEPTHFUNCPROC glad_glDepthFunc = NULL;
PFNGLCULLFACEPROC glad_glCullFace = NULL;
PFNGLFRONTFACEPROC glad_glFrontFace = NULL;
PFNGLGETERRORPROC glad_glGetError = NULL;
PFNGLGETSTRINGPROC glad_glGetString = NULL;
PFNGLGETINTEGERVPROC glad_glGetIntegerv = NULL;
PFNGLPOLYGONMODEPROC glad_glPolygonMode = NULL;

/* =========================================================================
 * Version query helper
 * ========================================================================= */
static void gladLoadGLVersion(GLADloadproc load) {
  /* We temporarily use the raw function pointer here */
  PFNGLGETSTRINGPROC get_str = (PFNGLGETSTRINGPROC)load("glGetString");
  if (!get_str) {
    GLVersion.major = 0;
    GLVersion.minor = 0;
    return;
  }

  const char *version_str = (const char *)get_str(GL_VERSION);
  if (!version_str) {
    GLVersion.major = 0;
    GLVersion.minor = 0;
    return;
  }

  int major = 0, minor = 0;
  /* Parse "M.m ..." format */
  while (*version_str && (*version_str < '0' || *version_str > '9'))
    version_str++;
  while (*version_str >= '0' && *version_str <= '9')
    major = major * 10 + (*version_str++ - '0');
  if (*version_str == '.')
    version_str++;
  while (*version_str >= '0' && *version_str <= '9')
    minor = minor * 10 + (*version_str++ - '0');

  GLVersion.major = major;
  GLVersion.minor = minor;
}

/* =========================================================================
 * Loader
 * ========================================================================= */
int gladLoadGLLoader(GLADloadproc load) {
  gladLoadGLVersion(load);

  if (GLVersion.major < 4 || (GLVersion.major == 4 && GLVersion.minor < 5)) {
    /* OpenGL 4.5 not available */
    return 0;
  }

  glad_glClear = (PFNGLCLEARPROC)load("glClear");
  glad_glClearColor = (PFNGLCLEARCOLORPROC)load("glClearColor");
  glad_glEnable = (PFNGLENABLEPROC)load("glEnable");
  glad_glDisable = (PFNGLDISABLEPROC)load("glDisable");
  glad_glViewport = (PFNGLVIEWPORTPROC)load("glViewport");
  glad_glDepthFunc = (PFNGLDEPTHFUNCPROC)load("glDepthFunc");
  glad_glCullFace = (PFNGLCULLFACEPROC)load("glCullFace");
  glad_glFrontFace = (PFNGLFRONTFACEPROC)load("glFrontFace");
  glad_glGetError = (PFNGLGETERRORPROC)load("glGetError");
  glad_glGetString = (PFNGLGETSTRINGPROC)load("glGetString");
  glad_glGetIntegerv = (PFNGLGETINTEGERVPROC)load("glGetIntegerv");
  glad_glPolygonMode = (PFNGLPOLYGONMODEPROC)load("glPolygonMode");

  /* Debug extension */
  glad_glDebugMessageCallback =
      (PFNGLDEBUGMESSAGECALLBACKPROC)load("glDebugMessageCallback");
  glad_glDebugMessageControl =
      (PFNGLDEBUGMESSAGECONTROLPROC)load("glDebugMessageControl");

  /* Verify critical functions loaded */
  if (!glad_glClear || !glad_glEnable || !glad_glGetError) {
    return 0;
  }

  return 1;
}

int gladLoadGL(void) {
  /* Cannot load without a loader function */
  return 0;
}
