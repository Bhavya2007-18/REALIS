"""
Debug Viewer for REALIS

Visualize simulation results in real-time.
"""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation


class DebugViewer:
    """Real-time debug visualization"""
    
    def __init__(self, title="REALIS Debug Viewer"):
        self.title = title
        self.fig, self.ax = plt.subplots(figsize=(10, 10))
        self.objects = []
    
    def add_object(self, obj_id, position, shape='circle'):
        """Add object to visualization"""
        self.objects.append({'id': obj_id, 'pos': position, 'shape': shape})
    
    def update(self, positions):
        """Update object positions"""
        self.ax.clear()
        self.ax.set_title(self.title)
        self.ax.set_xlim(-10, 10)
        self.ax.set_ylim(-10, 10)
        self.ax.grid(True, alpha=0.3)
        
        for i, pos in enumerate(positions):
            self.ax.plot(pos[0], pos[1], 'o', markersize=10)
        
        plt.pause(0.01)
    
    def show(self):
        """Display viewer"""
        plt.show()


if __name__ == "__main__":
    print("=== REALIS Debug Viewer ===\n")
    print("A simple visualization tool for debugging physics simulations.")
    print("Use this to inspect object positions, velocities, and forces in real-time.\n")
    
    viewer = DebugViewer()
    print("Debug viewer initialized ✓")
