

import numpy as np
from typing import Callable


def support(shape_func: Callable, direction: np.ndarray) -> np.ndarray:
    
    vertices = shape_func()
    projections = vertices @ direction
    max_idx = np.argmax(projections)
    return vertices[max_idx]


def minkowski_support(shape1_func: Callable, shape2_func: Callable, 
                     direction: np.ndarray) -> np.ndarray:
    
    return support(shape1_func, direction) - support(shape2_func, -direction)


def gjk_collision_detection(shape1_func: Callable, shape2_func: Callable,
                            max_iterations: int = 20) -> bool:
    
    
    direction = np.array([1.0, 0.0])
    
    
    simplex = [minkowski_support(shape1_func, shape2_func, direction)]
    
    
    direction = -simplex[0]
    
    for _ in range(max_iterations):
        
        A = minkowski_support(shape1_func, shape2_func, direction)
        
        
        if A @ direction < 0:
            return False  
        
        
        simplex.append(A)
        
        
        if handle_simplex(simplex, direction):
            return True  
    
    return False


def handle_simplex(simplex: list, direction: np.ndarray) -> bool:
    
    if len(simplex) == 2:
        
        A, B = simplex[1], simplex[0]
        AB = B - A
        AO = -A
        
        if AB @ AO > 0:
            
            direction[:] = np.array([-AB[1], AB[0]])  
            if direction @ AO < 0:
                direction[:] = -direction
        else:
            
            simplex.pop(0)
            direction[:] = AO
        
        return False
    
    elif len(simplex) == 3:
        
        A, B, C = simplex[2], simplex[1], simplex[0]
        AB = B - A
        AC = C - A
        AO = -A
        
        AB_perp = np.array([-AB[1], AB[0]])
        AC_perp = np.array([AC[1], -AC[0]])
        
        if AB_perp @ AO > 0:
            simplex.pop(0)  
            direction[:] = AB_perp
            return False
        elif AC_perp @ AO > 0:
            simplex.pop(1)  
            direction[:] = AC_perp
            return False
        else:
            
            return True
    
    return False


def demo_gjk():
    
    print("=== GJK Collision Detection Demo ===\n")
    
    
    circle1 = lambda: np.array([
        [np.cos(theta), np.sin(theta)] for theta in np.linspace(0, 2*np.pi, 20)
    ])
    
    
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