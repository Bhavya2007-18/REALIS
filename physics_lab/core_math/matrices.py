"""
Matrix Operations

3x3 and 4x4 matrix operations for physics simulations.
"""

import numpy as np
from typing import List


class Mat3:
    """3x3 matrix for rotations and transformations"""
    
    def __init__(self, data: np.ndarray = None):
        if data is None:
            self.data = np.eye(3)
        else:
            self.data = np.array(data, dtype=float).reshape(3, 3)
    
    @staticmethod
    def identity():
        """Identity matrix"""
        return Mat3(np.eye(3))
    
    @staticmethod
    def from_rows(row1: List[float], row2: List[float], row3: List[float]):
        """Create from row vectors"""
        return Mat3(np.array([row1, row2, row3]))
    
    def __repr__(self):
        return f"Mat3(\n{self.data}\n)"
    
    def __mul__(self, other):
        """Matrix multiplication"""
        if isinstance(other, Mat3):
            return Mat3(self.data @ other.data)
        elif isinstance(other, (list, np.ndarray)):
            return self.data @ np.array(other)
        else:
            return Mat3(self.data * other)
    
    def transpose(self):
        """Transpose matrix"""
        return Mat3(self.data.T)
    
    def determinant(self):
        """Calculate determinant"""
        return np.linalg.det(self.data)
    
    def inverse(self):
        """Calculate inverse"""
        return Mat3(np.linalg.inv(self.data))
    
    def trace(self):
        """Calculate trace"""
        return np.trace(self.data)


def validate_matrix_properties():
    """Validate matrix operation properties"""
    print("=== Matrix Property Validation ===\n")
    
    # Test matrices
    A = Mat3.from_rows([1, 2, 3], [4, 5, 6], [7, 8, 10])
    B = Mat3.from_rows([2, 0, 1], [1, 3, 2], [0, 1, 1])
    
    # Matrix multiplication non-commutativity
    AB = A * B
    BA = B * A
    print("Matrix multiplication (generally non-commutative):")
    print(f"A * B =\n{AB.data}")
    print(f"B * A =\n{BA.data}")
    print(f"Equal: {np.allclose(AB.data, BA.data)}\n")
    
    # Identity matrix
    I = Mat3.identity()
    AI = A * I
    IA = I * A
    print("Identity matrix:")
    print(f"A * I = I * A: {np.allclose(AI.data, A.data) and np.allclose(IA.data, A.data)}\n")
    
    # Transpose properties
    At = A.transpose()
    Att = At.transpose()
    print("Transpose properties:")
    print(f"(A^T)^T = A: {np.allclose(Att.data, A.data)}\n")
    
    # Determinant
    det_A = A.determinant()
    det_At = At.determinant()
    print(f"det(A) = {det_A}")
    print(f"det(A^T) = {det_At}")
    print(f"det(A) = det(A^T): {np.isclose(det_A, det_At)}\n")
    
    # Inverse
    if abs(det_A) > 1e-10:
        A_inv = A.inverse()
        A_A_inv = A * A_inv
        print("Inverse:")
        print(f"A * A^(-1) =\n{A_A_inv.data}")
        print(f"Is identity: {np.allclose(A_A_inv.data, np.eye(3))}\n")


if __name__ == "__main__":
    validate_matrix_properties()
