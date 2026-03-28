

#include "glad.h"
#include <stdlib.h>
#include <string.h>

struct gladGLversionStruct GLVersion = {0, 0};


PFNGLDEBUGMESSAGECALLBACKPROC glad_glDebugMessageCallback = NULL;
PFNGLDEBUGMESSAGECONTROLPROC glad_glDebugMessageControl = NULL;
PFNGLCLEARPROC glad_glClear = NULL;
PFNGLBLENDFUNCPROC glad_glBlendFunc = NULL;
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

PFNGLGENBUFFERSPROC glad_glGenBuffers = NULL;
PFNGLBINDBUFFERPROC glad_glBindBuffer = NULL;
PFNGLBUFFERDATAPROC glad_glBufferData = NULL;
PFNGLDELETEBUFFERSPROC glad_glDeleteBuffers = NULL;
PFNGLGENVERTEXARRAYSPROC glad_glGenVertexArrays = NULL;
PFNGLBINDVERTEXARRAYPROC glad_glBindVertexArray = NULL;
PFNGLDELETEVERTEXARRAYSPROC glad_glDeleteVertexArrays = NULL;
PFNGLENABLEVERTEXATTRIBARRAYPROC glad_glEnableVertexAttribArray = NULL;
PFNGLVERTEXATTRIBPOINTERPROC glad_glVertexAttribPointer = NULL;
PFNGLCREATESHADERPROC glad_glCreateShader = NULL;
PFNGLSHADERSOURCEPROC glad_glShaderSource = NULL;
PFNGLCOMPILESHADERPROC glad_glCompileShader = NULL;
PFNGLGETSHADERIVPROC glad_glGetShaderiv = NULL;
PFNGLGETSHADERINFOLOGPROC glad_glGetShaderInfoLog = NULL;
PFNGLDELETESHADERPROC glad_glDeleteShader = NULL;
PFNGLCREATEPROGRAMPROC glad_glCreateProgram = NULL;
PFNGLATTACHSHADERPROC glad_glAttachShader = NULL;
PFNGLLINKPROGRAMPROC glad_glLinkProgram = NULL;
PFNGLVALIDATEPROGRAMPROC glad_glValidateProgram = NULL;
PFNGLGETPROGRAMIVPROC glad_glGetProgramiv = NULL;
PFNGLGETPROGRAMINFOLOGPROC glad_glGetProgramInfoLog = NULL;
PFNGLUSEPROGRAMPROC glad_glUseProgram = NULL;
PFNGLDELETEPROGRAMPROC glad_glDeleteProgram = NULL;
PFNGLGETUNIFORMLOCATIONPROC glad_glGetUniformLocation = NULL;
PFNGLUNIFORM1IPROC glad_glUniform1i = NULL;
PFNGLUNIFORM1FPROC glad_glUniform1f = NULL;
PFNGLUNIFORM3FPROC glad_glUniform3f = NULL;
PFNGLUNIFORMMATRIX4FVPROC glad_glUniformMatrix4fv = NULL;
PFNGLDRAWELEMENTSPROC glad_glDrawElements = NULL;


static void gladLoadGLVersion(GLADloadproc load) {
  
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


int gladLoadGLLoader(GLADloadproc load) {
  gladLoadGLVersion(load);

  if (GLVersion.major < 4 || (GLVersion.major == 4 && GLVersion.minor < 5)) {
    
    return 0;
  }

  glad_glClear = (PFNGLCLEARPROC)load("glClear");
  glad_glBlendFunc = (PFNGLBLENDFUNCPROC)load("glBlendFunc");
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

  
  glad_glGenBuffers = (PFNGLGENBUFFERSPROC)load("glGenBuffers");
  glad_glBindBuffer = (PFNGLBINDBUFFERPROC)load("glBindBuffer");
  glad_glBufferData = (PFNGLBUFFERDATAPROC)load("glBufferData");
  glad_glDeleteBuffers = (PFNGLDELETEBUFFERSPROC)load("glDeleteBuffers");
  glad_glGenVertexArrays = (PFNGLGENVERTEXARRAYSPROC)load("glGenVertexArrays");
  glad_glBindVertexArray = (PFNGLBINDVERTEXARRAYPROC)load("glBindVertexArray");
  glad_glDeleteVertexArrays =
      (PFNGLDELETEVERTEXARRAYSPROC)load("glDeleteVertexArrays");
  glad_glEnableVertexAttribArray =
      (PFNGLENABLEVERTEXATTRIBARRAYPROC)load("glEnableVertexAttribArray");
  glad_glVertexAttribPointer =
      (PFNGLVERTEXATTRIBPOINTERPROC)load("glVertexAttribPointer");
  glad_glCreateShader = (PFNGLCREATESHADERPROC)load("glCreateShader");
  glad_glShaderSource = (PFNGLSHADERSOURCEPROC)load("glShaderSource");
  glad_glCompileShader = (PFNGLCOMPILESHADERPROC)load("glCompileShader");
  glad_glGetShaderiv = (PFNGLGETSHADERIVPROC)load("glGetShaderiv");
  glad_glGetShaderInfoLog =
      (PFNGLGETSHADERINFOLOGPROC)load("glGetShaderInfoLog");
  glad_glDeleteShader = (PFNGLDELETESHADERPROC)load("glDeleteShader");
  glad_glCreateProgram = (PFNGLCREATEPROGRAMPROC)load("glCreateProgram");
  glad_glAttachShader = (PFNGLATTACHSHADERPROC)load("glAttachShader");
  glad_glLinkProgram = (PFNGLLINKPROGRAMPROC)load("glLinkProgram");
  glad_glValidateProgram = (PFNGLVALIDATEPROGRAMPROC)load("glValidateProgram");
  glad_glGetProgramiv = (PFNGLGETPROGRAMIVPROC)load("glGetProgramiv");
  glad_glGetProgramInfoLog =
      (PFNGLGETPROGRAMINFOLOGPROC)load("glGetProgramInfoLog");
  glad_glUseProgram = (PFNGLUSEPROGRAMPROC)load("glUseProgram");
  glad_glDeleteProgram = (PFNGLDELETEPROGRAMPROC)load("glDeleteProgram");
  glad_glGetUniformLocation =
      (PFNGLGETUNIFORMLOCATIONPROC)load("glGetUniformLocation");
  glad_glUniform1i = (PFNGLUNIFORM1IPROC)load("glUniform1i");
  glad_glUniform1f = (PFNGLUNIFORM1FPROC)load("glUniform1f");
  glad_glUniform3f = (PFNGLUNIFORM3FPROC)load("glUniform3f");
  glad_glUniformMatrix4fv =
      (PFNGLUNIFORMMATRIX4FVPROC)load("glUniformMatrix4fv");
  glad_glDrawElements = (PFNGLDRAWELEMENTSPROC)load("glDrawElements");

  
  glad_glDebugMessageCallback =
      (PFNGLDEBUGMESSAGECALLBACKPROC)load("glDebugMessageCallback");
  glad_glDebugMessageControl =
      (PFNGLDEBUGMESSAGECONTROLPROC)load("glDebugMessageControl");

  
  if (!glad_glClear || !glad_glEnable || !glad_glGetError ||
      !glad_glGenBuffers) {
    return 0;
  }

  return 1;
}

int gladLoadGL(void) {
  
  return 0;
}