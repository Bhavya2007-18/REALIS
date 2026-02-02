"""
Gilbert-Johnson-Keerthi (GJK) Algorithm

Distance calculation and collision detection for convex shapes.
"""

import numpy as np
from typing import Callable


def support(shape_func: Callable, direction: np.ndarray) -> np.ndarray:
    """
    Get support point in a given direction
    
    Args:
        shape_func: Function that returns vertices of the shape
        direction: Direction vector
    
    Returns:
        Point on shape furthest in given direction
    """
    vertices = shape_func()
    projections = vertices @ direction
    max_idx = np.argmax(projections)
    return vertices[max_idx]


def minkowski_support(shape1_func: Callable, shape2_func: Callable, 
                     direction: np.ndarray) -> np.ndarray:
    """
    Support function for Minkowski difference A - B
    """
    return support(shape1_func, direction) - support(shape2_func, -direction)


def gjk_collision_detection(shape1_func: Callable, shape2_func: Callable,
                            max_iterations: int = 20) -> bool:
    """
    GJK algorithm for collision detection
    
    Returns True if shapes collide (Minkowski difference contains origin)
    """
    # Initial direction
    direction = np.array([1.0, 0.0])
    
    # Simplex (list of points)
    simplex = [minkowski_support(shape1_func, shape2_func, direction)]
    
    # Next direction toward origin
    direction = -simplex[0]
    
    for _ in range(max_iterations):
        # Add point in direction toward origin
        A = minkowski_support(shape1_func, shape2_func, direction)
        
        # Check if we passed the origin
        if A @ direction < 0:
            return False  # No collision
        
        # Add to simplex
        simplex.append(A)
        
        # Check if simplex contains origin
        if handle_simplex(simplex, direction):
            return True  # Collision detected
    
    return False


def handle_simplex(simplex: list, direction: np.ndarray) -> bool:
    """
    Process simplex and update search direction
    
    Returns True if origin is contained
    """
    if len(simplex) == 2:
        # Line segment
        A, B = simplex[1], simplex[0]
        AB = B - A
        AO = -A
        
        if AB @ AO > 0:
            # Region closest to AB
            direction[:] = np.array([-AB[1], AB[0]])  # Perpendicular
            if direction @ AO < 0:
                direction[:] = -direction
        else:
            # Region closest to A
            simplex.pop(0)
            direction[:] = AO
        
        return False
    
    elif len(simplex) == 3:
        # Triangle
        A, B, C = simplex[2], simplex[1], simplex[0]
        AB = B - A
        AC = C - A
        AO = -A
        
        AB_perp = np.array([-AB[1], AB[0]])
        AC_perp = np.array([AC[1], -AC[0]])
        
        if AB_perp @ AO > 0:
            simplex.pop(0)  # Remove C
            direction[:] = AB_perp
            return False
        elif AC_perp @ AO > 0:
            simplex.pop(1)  # Remove B
            direction[:] = AC_perp
            return False
        else:
            # Origin inside triangle
            return True
    
    return False


def demo_gjk():
    """Demonstrate GJK collision detection"""
    print("=== GJK Collision Detection Demo ===\n")
    
    # Define shapes as lambda functions returning vertices
    circle1 = lambda: np.array([
        [np.cos(theta), np.sin(theta)] for theta in np.linspace(0, 2*np.pi, 20)
    ])
    
    # Test cases
    test_cases = [
        ("Overlapping circles", lambda: np.array([
            [np.cos(theta) + 1.0, np.sin(theta)] for theta in np.linspace(0, 2*np.pi, 20)
        ])),
        ("Separated circles", lambda: np.array([
            [np.cos(theta) + 3.0, np.sin(theta)] for theta in np.linspace(0, 2*np.pi, 20)
        ])),
    ]
    
    for name, shape2 in test_cases:
        is_colliding = gjk_collision_detection(circle1, shape2)
        print(f"{name}:")
        print(f"  Collision detected: {is_colliding}\n")


if __name__ == "__main__":
    demo_gjk()
    print("GJK algorithm demonstrates collision detection using Minkowski difference.")
    print("If origin is contained in A-B, shapes A and B collide.\n")
