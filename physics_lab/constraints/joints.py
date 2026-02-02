"""
Joint Constraints

Basic joint constraint analysis for multi-body systems.
"""

import numpy as np


class DistanceConstraint:
    """Constraint to maintain fixed distance between two points"""
    
    def __init__(self, distance: float):
        self.distance = distance
    
    def error(self, p1: np.ndarray, p2: np.ndarray) -> float:
        """Calculate constraint violation"""
        current_dist = np.linalg.norm(p2 - p1)
        return current_dist - self.distance
    
    def gradient(self, p1: np.ndarray, p2: np.ndarray) -> tuple:
        """Gradient of constraint w.r.t. positions"""
        diff = p2 - p1
        dist = np.linalg.norm(diff)
        if dist < 1e-10:
            return np.zeros_like(p1), np.zeros_like(p2)
        
        unit_vec = diff / dist
        return -unit_vec, unit_vec


class FixedPointConstraint:
    """Constraint to fix a point at a specific location"""
    
    def __init__(self, fixed_position: np.ndarray):
        self.fixed_position = fixed_position
    
    def error(self, p: np.ndarray) -> float:
        """Calculate constraint violation"""
        return np.linalg.norm(p - self.fixed_position)
    
    def gradient(self, p: np.ndarray) -> np.ndarray:
        """Gradient of constraint"""
        diff = p - self.fixed_position
        dist = np.linalg.norm(diff)
        if dist < 1e-10:
            return np.zeros_like(p)
        return diff / dist


def demonstrate_constraints():
    """Demonstrate constraint calculations"""
    print("=== Joint Constraint Analysis ===\n")
    
    # Distance constraint
    p1 = np.array([0.0, 0.0])
    p2 = np.array([3.0, 4.0])
    constraint_dist = 5.0
    
    dist_constraint = DistanceConstraint(constraint_dist)
    error = dist_constraint.error(p1, p2)
    grad1, grad2 = dist_constraint.gradient(p1, p2)
    
    print("Distance Constraint:")
    print(f"  Point 1: {p1}")
    print(f"  Point 2: {p2}")
    print(f"  Desired distance: {constraint_dist} m")
    print(f"  Current distance: {np.linalg.norm(p2 - p1):.2f} m")
    print(f"  Constraint error: {error:.4f} m")
    print(f"  Gradient at p1: {grad1}")
    print(f"  Gradient at p2: {grad2}\n")
    
    # Fixed point constraint
    p = np.array([1.0, 1.0])
    fixed_pos = np.array([0.0, 0.0])
    
    fixed_constraint = FixedPointConstraint(fixed_pos)
    error_fixed = fixed_constraint.error(p)
    grad_fixed = fixed_constraint.gradient(p)
    
    print("Fixed Point Constraint:")
    print(f"  Current position: {p}")
    print(f"  Fixed position: {fixed_pos}")
    print(f"  Constraint error: {error_fixed:.4f} m")
    print(f"  Gradient: {grad_fixed}\n")


if __name__ == "__main__":
    demonstrate_constraints()
