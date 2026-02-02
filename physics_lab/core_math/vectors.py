"""
Vector Operations and Validation

Experiment with 3D vector operations, validations, and properties.
"""

import numpy as np
from typing import Union


class Vec3:
    """3D vector with validation"""
    
    def __init__(self, x: float = 0.0, y: float = 0.0, z: float = 0.0):
        self.x = float(x)
        self.y = float(y)
        self.z = float(z)
    
    def __repr__(self):
        return f"Vec3({self.x:.3f}, {self.y:.3f}, {self.z:.3f})"
    
    def __add__(self, other: 'Vec3') -> 'Vec3':
        return Vec3(self.x + other.x, self.y + other.y, self.z + other.z)
    
    def __sub__(self, other: 'Vec3') -> 'Vec3':
        return Vec3(self.x - other.x, self.y - other.y, self.z - other.z)
    
    def __mul__(self, scalar: float) -> 'Vec3':
        return Vec3(self.x * scalar, self.y * scalar, self.z * scalar)
    
    def __rmul__(self, scalar: float) -> 'Vec3':
        return self.__mul__(scalar)
    
    def __truediv__(self, scalar: float) -> 'Vec3':
        return Vec3(self.x / scalar, self.y / scalar, self.z / scalar)
    
    def dot(self, other: 'Vec3') -> float:
        """Dot product"""
        return self.x * other.x + self.y * other.y + self.z * other.z
    
    def cross(self, other: 'Vec3') -> 'Vec3':
        """Cross product"""
        return Vec3(
            self.y * other.z - self.z * other.y,
            self.z * other.x - self.x * other.z,
            self.x * other.y - self.y * other.x
        )
    
    def magnitude(self) -> float:
        """Vector magnitude"""
        return np.sqrt(self.x**2 + self.y**2 + self.z**2)
    
    def normalized(self) -> 'Vec3':
        """Return normalized vector"""
        mag = self.magnitude()
        if mag < 1e-10:
            return Vec3(0, 0, 0)
        return self / mag
    
    def to_array(self) -> np.ndarray:
        """Convert to numpy array"""
        return np.array([self.x, self.y, self.z])


def validate_vector_properties():
    """Validate fundamental vector properties"""
    print("=== Vector Property Validation ===\n")
    
    # Test vectors
    v1 = Vec3(1, 2, 3)
    v2 = Vec3(4, 5, 6)
    v3 = Vec3(7, 8, 9)
    
    # Commutativity of addition
    result1 = v1 + v2
    result2 = v2 + v1
    print(f"v1 + v2 = {result1}")
    print(f"v2 + v1 = {result2}")
    print(f"Commutative: {np.allclose([result1.x, result1.y, result1.z], 
                                       [result2.x, result2.y, result2.z])}\n")
    
    # Associativity
    result1 = (v1 + v2) + v3
    result2 = v1 + (v2 + v3)
    print(f"(v1 + v2) + v3 = {result1}")
    print(f"v1 + (v2 + v3) = {result2}")
    print(f"Associative: {np.allclose([result1.x, result1.y, result1.z], 
                                       [result2.x, result2.y, result2.z])}\n")
    
    # Dot product symmetry
    dot1 = v1.dot(v2)
    dot2 = v2.dot(v1)
    print(f"v1 · v2 = {dot1}")
    print(f"v2 · v1 = {dot2}")
    print(f"Dot symmetric: {np.isclose(dot1, dot2)}\n")
    
    # Cross product antisymmetry
    cross1 = v1.cross(v2)
    cross2 = v2.cross(v1)
    print(f"v1 × v2 = {cross1}")
    print(f"v2 × v1 = {cross2}")
    print(f"Cross antisymmetric: {np.allclose([cross1.x, cross1.y, cross1.z],
                                               [-cross2.x, -cross2.y, -cross2.z])}\n")
    
    # Cross product perpendicularity
    print(f"(v1 × v2) · v1 = {cross1.dot(v1)} (should be ~0)")
    print(f"(v1 × v2) · v2 = {cross1.dot(v2)} (should be ~0)\n")
    
    # Normalization
    v_norm = v1.normalized()
    print(f"v1 = {v1}, |v1| = {v1.magnitude()}")
    print(f"normalized v1 = {v_norm}, magnitude = {v_norm.magnitude()}")
    print(f"Normalization correct: {np.isclose(v_norm.magnitude(), 1.0)}\n")


if __name__ == "__main__":
    validate_vector_properties()
