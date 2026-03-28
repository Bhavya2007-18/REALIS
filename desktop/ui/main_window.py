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
        
        
        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        self.main_layout = QHBoxLayout(self.central_widget)
        self.main_layout.setContentsMargins(0, 0, 0, 0)
        self.main_layout.setSpacing(0)
        
        self.setup_ui()
        
    def setup_ui(self):
        
        
        self.setup_toolbar()
        
        
        self.setup_left_panel()
        
        
        self.viewport = ViewportGLWidget(self)
        self.main_layout.addWidget(self.viewport, stretch=1)
        
        
        self.setup_right_panel()
        
        
        self.statusBar = QStatusBar()
        self.setStatusBar(self.statusBar)
        self.statusBar.showMessage("REALIS CAD Ready")
        
        
        self.viewport.coordinates_changed.connect(self.update_status_coordinates)

    def setup_toolbar(self):
        toolbar = QToolBar("Main Toolbar")
        toolbar.setMovable(False)
        self.addToolBar(Qt.TopToolBarArea, toolbar)
        
        
        new_action = QAction("New", self)
        open_action = QAction("Open", self)
        save_action = QAction("Save", self)
        
        toolbar.addAction(new_action)
        toolbar.addAction(open_action)
        toolbar.addAction(save_action)
        toolbar.addSeparator()
        
        
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
        
        
        frame = QFrame()
        frame.setFrameShape(QFrame.StyledPanel)
        frame_layout = QVBoxLayout(frame)
        frame_layout.addWidget(QLabel("Position: (0, 0, 0)"))
        frame_layout.addWidget(QLabel("Layer: Default"))
        layout.addWidget(frame)
        
        dock.setWidget(widget)
        self.addDockWidget(Qt.RightDockWidgetArea, dock)
        
    def update_status_coordinates(self, x, y, z):
        
        self.statusBar.showMessage(f"X: {x:.2f} | Y: {y:.2f} | Z: {z:.2f}")
