from PyQt5.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QToolBar, QAction, QStatusBar, QDockWidget, 
    QListWidget, QPushButton, QLabel, QFrame
)
from PyQt5.QtCore import Qt
from viewport.gl_widget import ViewportGLWidget

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("REALIS Engine - Native CAD")
        self.resize(1280, 800)
        
        # Central Widget
        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        self.main_layout = QHBoxLayout(self.central_widget)
        self.main_layout.setContentsMargins(0, 0, 0, 0)
        self.main_layout.setSpacing(0)
        
        self.setup_ui()
        
    def setup_ui(self):
        """Builds Phase 1 UI Layout: Toolbar, Tool Panel, Viewport, Properties, StatusBar"""
        # 1. Top Navigation Toolbar
        self.setup_toolbar()
        
        # 2. Left Tool Panel (Dockable)
        self.setup_left_panel()
        
        # 3. Central Canvas Area (OpenGL)
        self.viewport = ViewportGLWidget(self)
        self.main_layout.addWidget(self.viewport, stretch=1)
        
        # 4. Right Properties Panel (Dockable)
        self.setup_right_panel()
        
        # 5. Bottom Status Bar
        self.statusBar = QStatusBar()
        self.setStatusBar(self.statusBar)
        self.statusBar.showMessage("REALIS CAD Ready")
        
        # Connect viewport signal for coordinates 
        self.viewport.coordinates_changed.connect(self.update_status_coordinates)

    def setup_toolbar(self):
        toolbar = QToolBar("Main Toolbar")
        toolbar.setMovable(False)
        self.addToolBar(Qt.TopToolBarArea, toolbar)
        
        # File Actions
        new_action = QAction("New", self)
        open_action = QAction("Open", self)
        save_action = QAction("Save", self)
        
        toolbar.addAction(new_action)
        toolbar.addAction(open_action)
        toolbar.addAction(save_action)
        toolbar.addSeparator()
        
        # View Actions
        reset_view = QAction("Reset View", self)
        reset_view.triggered.connect(lambda: self.viewport.reset_camera())
        toolbar.addAction(reset_view)

    def setup_left_panel(self):
        dock = QDockWidget("Drafting Tools", self)
        dock.setAllowedAreas(Qt.LeftDockWidgetArea | Qt.RightDockWidgetArea)
        dock.setFeatures(QDockWidget.DockWidgetMovable | QDockWidget.DockWidgetFloatable)
        
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setAlignment(Qt.AlignTop)
        
        # Phase 2 Placeholders
        tools = ["Select", "Line", "Circle", "Rectangle", "Polygon", "Arc"]
        for t in tools:
            btn = QPushButton(t)
            btn.setCheckable(True)
            layout.addWidget(btn)
            
        dock.setWidget(widget)
        self.addDockWidget(Qt.LeftDockWidgetArea, dock)
        
    def setup_right_panel(self):
        dock = QDockWidget("Properties", self)
        dock.setAllowedAreas(Qt.LeftDockWidgetArea | Qt.RightDockWidgetArea)
        dock.setFeatures(QDockWidget.DockWidgetMovable | QDockWidget.DockWidgetFloatable)
        
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setAlignment(Qt.AlignTop)
        
        layout.addWidget(QLabel("No object selected"))
        
        # Add a test layout structure for Phase 3/4
        frame = QFrame()
        frame.setFrameShape(QFrame.StyledPanel)
        frame_layout = QVBoxLayout(frame)
        frame_layout.addWidget(QLabel("Position: (0, 0, 0)"))
        frame_layout.addWidget(QLabel("Layer: Default"))
        layout.addWidget(frame)
        
        dock.setWidget(widget)
        self.addDockWidget(Qt.RightDockWidgetArea, dock)
        
    def update_status_coordinates(self, x, y, z):
        # Format the world coordinates string
        self.statusBar.showMessage(f"X: {x:.2f} | Y: {y:.2f} | Z: {z:.2f}")

