from PyQt5.QtWidgets import QOpenGLWidget
from PyQt5.QtCore import Qt, pyqtSignal, QPoint
from PyQt5.QtGui import QSurfaceFormat
from OpenGL.GL import *
from OpenGL.GLU import gluPerspective, gluLookAt
import math

class ViewportGLWidget(QOpenGLWidget):
    
    # Custom signal to emit 3D coordinates back to the main window status bar
    coordinates_changed = pyqtSignal(float, float, float)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFocusPolicy(Qt.StrongFocus)
        self.setMouseTracking(True)
        
        # Require a Depth Buffer for 3D visibility sorting
        fmt = QSurfaceFormat()
        fmt.setDepthBufferSize(24)
        self.setFormat(fmt)
        
        # Camera State (Orbit Camera)
        self.camera_dist = 50.0
        self.camera_rot_x = 45.0  # Elevation
        self.camera_rot_y = 45.0  # Azimuth
        self.camera_target = [0.0, 0.0, 0.0]
        
        # Mouse Interaction State
        self.last_pos = QPoint()
        self.is_panning = False
        self.is_orbiting = False

    def initializeGL(self):
        """Called once upon widget creation"""
        glClearColor(0.1, 0.12, 0.15, 1.0) # Dark slate background match web UI
        glEnable(GL_DEPTH_TEST)
        glEnable(GL_LINE_SMOOTH)
        
    def resizeGL(self, w, h):
        """Called upon window resize"""
        glViewport(0, 0, w, h)
        glMatrixMode(GL_PROJECTION)
        glLoadIdentity()
        aspect = w / float(h) if h > 0 else 1.0
        gluPerspective(45.0, aspect, 0.1, 1000.0)
        glMatrixMode(GL_MODELVIEW)

    def paintGL(self):
        """Main Render Loop"""
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)
        glLoadIdentity()
        
        # Calculate Camera Position from spherical coordinates
        cam_x = self.camera_target[0] + self.camera_dist * math.cos(math.radians(self.camera_rot_x)) * math.sin(math.radians(self.camera_rot_y))
        cam_y = self.camera_target[1] + self.camera_dist * math.sin(math.radians(self.camera_rot_x))
        cam_z = self.camera_target[2] + self.camera_dist * math.cos(math.radians(self.camera_rot_x)) * math.cos(math.radians(self.camera_rot_y))
        
        # Standard Orbit Camera Setup
        gluLookAt(
            cam_x, cam_y, cam_z, 
            self.camera_target[0], self.camera_target[1], self.camera_target[2], 
            0, 1, 0
        )
        
        self.draw_grid()
        self.draw_axes()
        
    def draw_grid(self, size=100, step=10):
        """Renders the standard engineering reference grid"""
        glBegin(GL_LINES)
        glColor3f(0.2, 0.25, 0.3) # Subtle grid color
        
        # Draw lines along X and Z
        for i in range(-size, size + step, step):
            glVertex3f(i, 0, -size)
            glVertex3f(i, 0, size)
            glVertex3f(-size, 0, i)
            glVertex3f(size, 0, i)
        glEnd()
        
    def draw_axes(self):
        """Draws global X/Y/Z identifiers"""
        glLineWidth(2.0)
        glBegin(GL_LINES)
        
        # X Axis - Red
        glColor3f(1.0, 0.2, 0.2)
        glVertex3f(0, 0, 0)
        glVertex3f(10, 0, 0)
        
        # Y Axis - Green
        glColor3f(0.2, 1.0, 0.2)
        glVertex3f(0, 0, 0)
        glVertex3f(0, 10, 0)
        
        # Z Axis - Blue
        glColor3f(0.2, 0.5, 1.0)
        glVertex3f(0, 0, 0)
        glVertex3f(0, 0, 10)
        
        glEnd()
        glLineWidth(1.0)

    # --- Mouse Interaction & Camera Controls ---
    
    def mousePressEvent(self, event):
        self.last_pos = event.pos()
        if event.button() == Qt.MiddleButton:
            if event.modifiers() == Qt.ShiftModifier:
                self.is_panning = True
            else:
                self.is_orbiting = True
                
    def mouseReleaseEvent(self, event):
        if event.button() == Qt.MiddleButton:
            self.is_panning = False
            self.is_orbiting = False
            
    def mouseMoveEvent(self, event):
        # Calculate Delta
        dx = event.x() - self.last_pos.x()
        dy = event.y() - self.last_pos.y()
        self.last_pos = event.pos()
        
        if self.is_orbiting:
            self.camera_rot_y -= dx * 0.5
            self.camera_rot_x += dy * 0.5
            # Clamp elevation to prevent flipping
            self.camera_rot_x = max(-89.0, min(89.0, self.camera_rot_x))
            self.update()
            
        elif self.is_panning:
            # Estimate pan speed based on distance (maintains perceived object size)
            pan_speed = self.camera_dist * 0.002
            
            # Pan strictly relative to the camera's Y rotation vector
            right_x = math.cos(math.radians(self.camera_rot_y))
            right_z = -math.sin(math.radians(self.camera_rot_y))
            
            up_x = -math.sin(math.radians(self.camera_rot_y)) * math.sin(math.radians(self.camera_rot_x))
            up_z = -math.cos(math.radians(self.camera_rot_y)) * math.sin(math.radians(self.camera_rot_x))
            up_y = math.cos(math.radians(self.camera_rot_x))

            self.camera_target[0] -= (dx * right_x - dy * up_x) * pan_speed
            self.camera_target[1] -= (dy * up_y) * pan_speed
            self.camera_target[2] -= (dx * right_z - dy * up_z) * pan_speed
            
            self.update()
            
        # Raycast approximation for XY status bar tracking (rough intersection for MVP)
        # Assuming Z=0 hit for now
        self.coordinates_changed.emit(event.x() * 0.1, 0.0, event.y() * 0.1)

    def wheelEvent(self, event):
        """Zoom Camera in and out"""
        delta = event.angleDelta().y()
        zoom_speed = self.camera_dist * 0.1
        if delta > 0:
            self.camera_dist -= zoom_speed
        else:
            self.camera_dist += zoom_speed
            
        # Clamp Zoom
        self.camera_dist = max(1.0, min(500.0, self.camera_dist))
        self.update()
        
    def reset_camera(self):
        self.camera_dist = 50.0
        self.camera_rot_x = 45.0
        self.camera_rot_y = 45.0
        self.camera_target = [0.0, 0.0, 0.0]
        self.update()
