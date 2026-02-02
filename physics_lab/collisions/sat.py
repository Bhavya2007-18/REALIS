"""
Separating Axis Theorem (SAT)

Collision detection for convex polygons using SAT.
"""

import numpy as np
import matplotlib.pyplot as plt
from typing import List


def project_polygon(vertices: np.ndarray, axis: np.ndarray) -> tuple:
    """
    Project polygon vertices onto an axis
    
    Returns:
        (min_projection, max_projection)
    """
    projections = vertices @ axis
    return np.min(projections), np.max(projections)


def sat_collision_detection(poly1: np.ndarray, poly2: np.ndarray) -> tuple:
    """
    Detect collision between two convex polygons using SAT
    
    Args:
        poly1, poly2: Nx2 arrays of polygon vertices (counter-clockwise)
    
    Returns:
        (is_colliding, separation_axis)
    """
    def get_edges(poly):
        """Get edge vectors"""
        return np.roll(poly, -1, axis=0) - poly
    
    def get_normals(edges):
        """Get perpendicular normals to edges"""
        return np.column_stack([-edges[:, 1], edges[:, 0]])
    
    # Get all potential separating axes
    edges1 = get_edges(poly1)
    edges2 = get_edges(poly2)
    normals1 = get_normals(edges1)
    normals2 = get_normals(edges2)
    
    # Normalize axes
    axes = np.vstack([normals1, normals2])
    axes = axes / np.linalg.norm(axes, axis=1)[:, np.newaxis]
    
    # Test each axis
    for axis in axes:
        min1, max1 = project_polygon(poly1, axis)
        min2, max2 = project_polygon(poly2, axis)
        
        # Check for gap (no overlap = separation found)
        if max1 < min2 or max2 < min1:
            return False, axis
    
    # No separating axis found = collision
    return True, None


def demo_sat():
    """Demonstrate SAT collision detection"""
    print("=== Separating Axis Theorem Demo ===\n")
    
    # Define two rectangles
    rect1 = np.array([
        [0.0, 0.0],
        [2.0, 0.0],
        [2.0, 1.0],
        [0.0, 1.0]
    ])
    
    # Test cases
    test_cases = [
        ("Overlapping", np.array([[1.5, 0.5], [3.5, 0.5], [3.5, 1.5], [1.5, 1.5]])),
        ("Separated", np.array([[3.0, 0.0], [5.0, 0.0], [5.0, 1.0], [3.0, 1.0]])),
        ("Touching edge", np.array([[2.0, 0.0], [4.0, 0.0], [4.0, 1.0], [2.0, 1.0]])),
    ]
    
    for name, rect2 in test_cases:
        is_colliding, sep_axis = sat_collision_detection(rect1, rect2)
        print(f"{name}:")
        print(f"  Collision detected: {is_colliding}")
        if sep_axis is not None:
            print(f"  Separating axis: {sep_axis}")
        print()


def plot_sat_example():
    """Visualize SAT collision detection"""
    rect1 = np.array([[0, 0], [2, 0], [2, 1], [0, 1]])
    rect2 = np.array([[1.5, 0.5], [3.5, 0.5], [3.5, 1.5], [1.5, 1.5]])
    
    is_colliding, _ = sat_collision_detection(rect1, rect2)
    
    fig, ax = plt.subplots(figsize=(8, 6))
    
    # Close the polygons for plotting
    rect1_plot = np.vstack([rect1, rect1[0]])
    rect2_plot = np.vstack([rect2, rect2[0]])
    
    color = 'red' if is_colliding else 'green'
    
    ax.plot(rect1_plot[:, 0], rect1_plot[:, 1], 'b-', linewidth=2, label='Rectangle 1')
    ax.fill(rect1_plot[:, 0], rect1_plot[:, 1], 'blue', alpha=0.3)
    
    ax.plot(rect2_plot[:, 0], rect2_plot[:, 1], f'{color[0]}-', linewidth=2, label='Rectangle 2')
    ax.fill(rect2_plot[:, 0], rect2_plot[:, 1], color, alpha=0.3)
    
    ax.set_xlabel('x')
    ax.set_ylabel('y')
    ax.set_title(f'SAT Collision Detection: {"COLLISION" if is_colliding else "NO COLLISION"}')
    ax.legend()
    ax.grid(True, alpha=0.3)
    ax.axis('equal')
    
    plt.tight_layout()
    plt.savefig('sat_collision.png', dpi=150)
    print("📊 Plot saved to sat_collision.png")


if __name__ == "__main__":
    demo_sat()
    plot_sat_example()
