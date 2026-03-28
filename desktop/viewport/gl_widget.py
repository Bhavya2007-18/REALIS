from PyQt5.QtWidgets import QOpenGLWidget
from PyQt5.QtCore import Qt, pyqtSignal, QPoint
from PyQt5.QtGui import QSurfaceFormat
from OpenGL.GL import *
from OpenGL.GLU import gluPerspective, gluLookAt
import math

class ViewportGLWidget(QOpenGLWidget):
    
    
    coordinates_changed = pyqtSignal(float, float, float)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFocusPolicy(Qt.StrongFocus)
        self.setMouseTracking(True)
        
        
        fmt = QSurfaceFormat()
        fmt.setDepthBufferSize(24)
        self.setFormat(fmt)
        
        
        self.camera_dist = 50.0
        self.camera_rot_x = 45.0  
        self.camera_rot_y = 45.0  
        self.camera_target = [0.0, 0.0, 0.0]
        
        
        self.last_pos = QPoint()
        self.is_panning = False
        self.is_orbiting = False

    def initializeGL(self):
        
        glClearColor(0.1, 0.12, 0.15, 1.0) 
        glEnable(GL_DEPTH_TEST)
        glEnable(GL_LINE_SMOOTH)
        
    def resizeGL(self, w, h):
        
        glViewport(0, 0, w, h)
        glMatrixMode(GL_PROJECTION)
        glLoadIdentity()
        aspect = w / float(h) if h > 0 else 1.0
        gluPerspective(45.0, aspect, 0.1, 1000.0)
        glMatrixMode(GL_MODELVIEW)

    def paintGL(self):
        
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)
        glLoadIdentity()
        
        
        cam_x = self.camera_target[0] + self.camera_dist * math.cos(math.radians(self.camera_rot_x)) * math.sin(math.radians(self.camera_rot_y))
        cam_y = self.camera_target[1] + self.camera_dist * math.sin(math.radians(self.camera_rot_x))
        cam_z = self.camera_target[2] + self.camera_dist * math.cos(math.radians(self.camera_rot_x)) * math.cos(math.radians(self.camera_rot_y))
        
        
        gluLookAt(
            cam_x, cam_y, cam_z, 
            self.camera_target[0], self.camera_target[1], self.camera_target[2], 
            0, 1, 0
        )
        
        self.draw_grid()
        self.draw_axes()
        
    def draw_grid(self, size=100, step=10):
        
        glBegin(GL_LINES)
        glColor3f(0.2, 0.25, 0.3) 
        
        
        for i in range(-size, size + step, step):
            glVertex3f(i, 0, -size)
            glVertex3f(i, 0, size)
            glVertex3f(-size, 0, i)
            glVertex3f(size, 0, i)
        glEnd()
        
    def draw_axes(self):
        
        glLineWidth(2.0)
        glBegin(GL_LINES)
        
        
        glColor3f(1.0, 0.2, 0.2)
        glVertex3f(0, 0, 0)
        glVertex3f(10, 0, 0)
        
        
        glColor3f(0.2, 1.0, 0.2)
        glVertex3f(0, 0, 0)
        glVertex3f(0, 10, 0)
        
        
        glColor3f(0.2, 0.5, 1.0)
        glVertex3f(0, 0, 0)
        glVertex3f(0, 0, 10)
        
        glEnd()
        glLineWidth(1.0)

    
    
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
        
        dx = event.x() - self.last_pos.x()
        dy = event.y() - self.last_pos.y()
        self.last_pos = event.pos()
        
        if self.is_orbiting:
            self.camera_rot_y -= dx * 0.5
            self.camera_rot_x += dy * 0.5
            
            self.camera_rot_x = max(-89.0, min(89.0, self.camera_rot_x))
            self.update()
            
        elif self.is_panning:
            
            pan_speed = self.camera_dist * 0.002
            
            
            right_x = math.cos(math.radians(self.camera_rot_y))
            right_z = -math.sin(math.radians(self.camera_rot_y))
            
            up_x = -math.sin(math.radians(self.camera_rot_y)) * math.sin(math.radians(self.camera_rot_x))
            up_z = -math.cos(math.radians(self.camera_rot_y)) * math.sin(math.radians(self.camera_rot_x))
            up_y = math.cos(math.radians(self.camera_rot_x))

            self.camera_target[0] -= (dx * right_x - dy * up_x) * pan_speed
            self.camera_target[1] -= (dy * up_y) * pan_speed
            self.camera_target[2] -= (dx * right_z - dy * up_z) * pan_speed
            
            self.update()
            
        
        
        self.coordinates_changed.emit(event.x() * 0.1, 0.0, event.y() * 0.1)

    def wheelEvent(self, event):
        
        delta = event.angleDelta().y()
        zoom_speed = self.camera_dist * 0.1
        if delta > 0:
            self.camera_dist -= zoom_speed
        else:
            self.camera_dist += zoom_speed
            
        
        self.camera_dist = max(1.0, min(500.0, self.camera_dist))
        self.update()
        
    def reset_camera(self):
        self.camera_dist = 50.0
        self.camera_rot_x = 45.0
        self.camera_rot_y = 45.0
        self.camera_target = [0.0, 0.0, 0.0]
        self.update()