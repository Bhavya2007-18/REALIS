import glfw
from OpenGL.GL import *
import numpy as np

class GLVisualizer:
    def __init__(self, width=800, height=600, title="REALIS Visualization"):
        if not glfw.init():
            raise Exception("GLFW initialization failed")
            
        # Configure GLFW
        glfw.window_hint(glfw.RESIZABLE, GL_FALSE)
        
        self.window = glfw.create_window(width, height, title, None, None)
        if not self.window:
            glfw.terminate()
            raise Exception("Window creation failed")
            
        glfw.make_context_current(self.window)
        glfw.swap_interval(1) # VSync on
        
        # Setup 2D Orthographic view
        glMatrixMode(GL_PROJECTION)
        glLoadIdentity()
        # View volume: x=[-2, 2], y=[-2, 2]
        glOrtho(-2.0, 2.0, -2.0, 2.0, -1.0, 1.0)
        glMatrixMode(GL_MODELVIEW)
        glLoadIdentity()
        
        print(f"OpenGL Initialized: {glGetString(GL_VERSION).decode()}")

    def should_close(self):
        return glfw.window_should_close(self.window)
        
    def close(self):
        glfw.terminate()
        
    def update(self, state, t):
        """
        Draws the current state.
        State assumed to be standard (x, v).
        Visualized as a vertical mass-spring system.
        """
        glfw.poll_events()
        glClearColor(0.1, 0.1, 0.1, 1.0)
        glClear(GL_COLOR_BUFFER_BIT)
        
        x, v = state
        
        # Mapping: Physical x -> Visual y
        # Physical model: x=0 is equilibrium.
        # Anchor point (arbitrary visual reference): y=1.5
        anchor_y = 1.5
        mass_y = anchor_y - 1.0 - x # Rest length 1.0, plus displacement x
        
        # Draw Anchor
        glColor3f(0.5, 0.5, 0.5)
        glBegin(GL_LINES)
        glVertex2f(-0.5, anchor_y)
        glVertex2f(0.5, anchor_y)
        glEnd()
        
        # Draw Spring
        glColor3f(0.8, 0.8, 0.8)
        glBegin(GL_LINES)
        glVertex2f(0.0, anchor_y)
        glVertex2f(0.0, mass_y)
        glEnd()
        
        # Draw Mass
        size = 0.15
        glColor3f(0.2, 0.6, 1.0) # Blue
        glBegin(GL_QUADS)
        glVertex2f(-size, mass_y - size)
        glVertex2f(size, mass_y - size)
        glVertex2f(size, mass_y + size)
        glVertex2f(-size, mass_y + size)
        glEnd()
        
        # Simple HUD
        # (Text rendering in raw OpenGL is hard, skipping for now)
        
        glfw.swap_buffers(self.window)
