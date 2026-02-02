"""
Quaternion Operations

Quaternion-based rotation representations for robust 3D rotations.
"""

import numpy as np


class Quaternion:
    """Unit quaternion for 3D rotations"""
    
    def __init__(self, w: float = 1.0, x: float = 0.0, y: float = 0.0, z: float = 0.0):
        self.w = w
        self.x = x
        self.y = y
        self.z = z
        self._normalize()
    
    def _normalize(self):
        """Normalize to unit quaternion"""
        mag = np.sqrt(self.w**2 + self.x**2 + self.y**2 + self.z**2)
        if mag > 1e-10:
            self.w /= mag
            self.x /= mag
            self.y /= mag
            self.z /= mag
    
    def __repr__(self):
        return f"Quat({self.w:.3f}, {self.x:.3f}i, {self.y:.3f}j, {self.z:.3f}k)"
    
    def __mul__(self, other: 'Quaternion') -> 'Quaternion':
        """Quaternion multiplication (Hamilton product)"""
        w = self.w * other.w - self.x * other.x - self.y * other.y - self.z * other.z
        x = self.w * other.x + self.x * other.w + self.y * other.z - self.z * other.y
        y = self.w * other.y - self.x * other.z + self.y * other.w + self.z * other.x
        z = self.w * other.z + self.x * other.y - self.y * other.x + self.z * other.w
        return Quaternion(w, x, y, z)
    
    def conjugate(self) -> 'Quaternion':
        """Quaternion conjugate"""
        return Quaternion(self.w, -self.x, -self.y, -self.z)
    
    def inverse(self) -> 'Quaternion':
        """Quaternion inverse (for unit quaternions, same as conjugate)"""
        return self.conjugate()
    
    @staticmethod
    def from_axis_angle(axis: np.ndarray, angle: float) -> 'Quaternion':
        """Create quaternion from axis-angle representation"""
        axis = axis / np.linalg.norm(axis)
        half_angle = angle / 2
        s = np.sin(half_angle)
        return Quaternion(
            np.cos(half_angle),
            axis[0] * s,
            axis[1] * s,
            axis[2] * s
        )
    
    def to_rotation_matrix(self) -> np.ndarray:
        """Convert to 3x3 rotation matrix"""
        w, x, y, z = self.w, self.x, self.y, self.z
        return np.array([
            [1 - 2*y**2 - 2*z**2, 2*x*y - 2*w*z, 2*x*z + 2*w*y],
            [2*x*y + 2*w*z, 1 - 2*x**2 - 2*z**2, 2*y*z - 2*w*x],
            [2*x*z - 2*w*y, 2*y*z + 2*w*x, 1 - 2*x**2 - 2*y**2]
        ])
    
    def rotate_vector(self, v: np.ndarray) -> np.ndarray:
        """Rotate a 3D vector using this quaternion"""
        v_quat = Quaternion(0, v[0], v[1], v[2])
        result = self * v_quat * self.conjugate()
        return np.array([result.x, result.y, result.z])


def validate_quaternion_properties():
    """Validate quaternion rotation properties"""
    print("=== Quaternion Property Validation ===\n")
    
    # Identity quaternion
    q_identity = Quaternion(1, 0, 0, 0)
    
    # Rotation about Z axis by 90 degrees
    q_z90 = Quaternion.from_axis_angle(np.array([0, 0, 1]), np.pi/2)
    
    # Test vector
    v = np.array([1.0, 0.0, 0.0])
    
    # Identity rotation
    v_identity = q_identity.rotate_vector(v)
    print(f"Original vector: {v}")
    print(f"After identity rotation: {v_identity}")
    print(f"Identity works: {np.allclose(v, v_identity)}\n")
    
    # 90-degree rotation
    v_rotated = q_z90.rotate_vector(v)
    print(f"After 90° Z rotation: {v_rotated}")
    print(f"Expected: [0, 1, 0]")
    print(f"Rotation correct: {np.allclose(v_rotated, [0, 1, 0])}\n")
    
    # Double rotation = single 180
    q_z180 = Quaternion.from_axis_angle(np.array([0, 0, 1]), np.pi)
    v_double = q_z90.rotate_vector(q_z90.rotate_vector(v))
    v_single = q_z180.rotate_vector(v)
    print(f"Double 90° rotation: {v_double}")
    print(f"Single 180° rotation: {v_single}")
    print(f"Equivalent: {np.allclose(v_double, v_single)}\n")
    
    # Inverse quaternion
    q_inv = q_z90.inverse()
    v_forward = q_z90.rotate_vector(v)
    v_back = q_inv.rotate_vector(v_forward)
    print(f"Forward then inverse rotation: {v_back}")
    print(f"Recovers original: {np.allclose(v, v_back)}\n")
    
    # Rotation matrix equivalence
    rot_mat = q_z90.to_rotation_matrix()
    v_matrix = rot_mat @ v
    print(f"Quaternion rotation: {v_rotated}")
    print(f"Matrix rotation: {v_matrix}")
    print(f"Equivalent: {np.allclose(v_rotated, v_matrix)}\n")


if __name__ == "__main__":
    validate_quaternion_properties()
