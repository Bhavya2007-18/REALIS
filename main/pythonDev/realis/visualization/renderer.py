
import glfw
from OpenGL.GL import *
from OpenGL.GLU import *
import numpy as np
import time

class Renderer:
    """
    Data-driven renderer consuming GraphicsData dictionaries.
    """
    def __init__(self, width=1024, height=768, title="REALIS Simulation"):
        if not glfw.init():
            raise Exception("GLFW initialization failed")
            
        glfw.window_hint(glfw.SAMPLES, 4) # AA
        self.window = glfw.create_window(width, height, title, None, None)
        if not self.window:
            glfw.terminate()
            raise Exception("Window creation failed")
            
        glfw.make_context_current(self.window)
        glfw.swap_interval(1)
        
        # Camera defaults
        self.camera_dist = 5.0
        self.camera_rot = [0, 0]
        self.center = [0, 0, 0]
        
        # Lighting
        glEnable(GL_DEPTH_TEST)
        glEnable(GL_LIGHTING)
        glEnable(GL_LIGHT0)
        glEnable(GL_COLOR_MATERIAL)
        glEnable(GL_NORMALIZE)
        
        # Quadric for primitives
        self.quadric = gluNewQuadric()
        gluQuadricNormals(self.quadric, GLU_SMOOTH)
        
        print("Renderer Initialized.")

    def should_close(self):
        return glfw.window_should_close(self.window)
        
    def close(self):
        gluDeleteQuadric(self.quadric)
        glfw.terminate()
        
    def render(self, graphics_data):
        """
        Render the scene based on graphics_data list.
        """
        glfw.poll_events()
        
        # Setup View
        width, height = glfw.get_framebuffer_size(self.window)
        aspect = width / height if height > 0 else 1.0
        
        glViewport(0, 0, width, height)
        glMatrixMode(GL_PROJECTION)
        glLoadIdentity()
        gluPerspective(45, aspect, 0.1, 100.0)
        
        glMatrixMode(GL_MODELVIEW)
        glLoadIdentity()
        
        # Simple Orbit Camera
        # target = self.center
        # eye = target + dist * dir
        # For simple 2D/3D: Look from +Z
        gluLookAt(0, 0, self.camera_dist, 
                  0, 0, 0, 
                  0, 1, 0)
        
        glClearColor(0.15, 0.15, 0.15, 1.0)
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)
        
        # Grid
        self.draw_grid()
        
        # Process Primitives
        for item in graphics_data:
            self.draw_item(item)
            
        glfw.swap_buffers(self.window)
        
    def draw_grid(self):
        glDisable(GL_LIGHTING)
        glColor3f(0.3, 0.3, 0.3)
        glBegin(GL_LINES)
        for i in range(-10, 11):
            glVertex3f(i, -10, 0)
            glVertex3f(i, 10, 0)
            glVertex3f(-10, i, 0)
            glVertex3f(10, i, 0)
        glEnd()
        glEnable(GL_LIGHTING)

    def draw_item(self, item):
        itype = item.get('type')
        color = item.get('color', [0.5, 0.5, 0.5, 1.0])
        glColor4fv(color)
        
        glPushMatrix()
        
        if itype == 'Sphere':
            origin = item['origin']
            radius = item['radius']
            glTranslatef(*origin)
            gluSphere(self.quadric, radius, 16, 16)
            
        elif itype == 'Cylinder':
            # pAxis is start, vAxis is vector
            pAxis = item['pAxis']
            vAxis = item['vAxis']
            radius = item['radius']
            
            # Align Z axis with vAxis
            # Current Z is (0,0,1). Target is vAxis.
            # Rotation axis = Z x vAxis. Angle = acos(Z . vAxis / |vAxis|)
            
            length = np.linalg.norm(vAxis)
            if length > 1e-6:
                z_axis = np.array([0, 0, 1])
                v_unit = vAxis / length
                
                axis = np.cross(z_axis, v_unit)
                angle = np.degrees(np.arccos(np.dot(z_axis, v_unit)))
                
                glTranslatef(*pAxis)
                if np.linalg.norm(axis) > 1e-6:
                    glRotatef(angle, *axis)
                elif np.dot(z_axis, v_unit) < 0:
                    # Parallel but opposite
                    glRotatef(180, 1, 0, 0)
                
                gluCylinder(self.quadric, radius, radius, length, 16, 1)
        
        elif itype == 'Cuboid':
            origin = item['origin']
            size = item['size']
            glTranslatef(*origin)
            glScalef(*size)
            # Draw Cube (glutSolidCube is easy but requires GLUT)
            # Just draw a simple Glut-free cube or skipped for now.
            pass
            
        glPopMatrix()
