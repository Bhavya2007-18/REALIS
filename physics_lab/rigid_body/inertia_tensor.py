

import numpy as np


class InertiaTensor:
    
    
    def __init__(self, I: np.ndarray):
        assert I.shape == (3, 3), "Inertia tensor must be 3x3"
        self.I = I
    
    def __repr__(self):
        return f"InertiaTensor(\n{self.I}\n)"
    
    @staticmethod
    def sphere(mass: float, radius: float) -> 'InertiaTensor':
        
        I_val = (2/5) * mass * radius**2
        return InertiaTensor(np.diag([I_val, I_val, I_val]))
    
    @staticmethod
    def box(mass: float, width: float, height: float, depth: float) -> 'InertiaTensor':
        
        Ixx = (1/12) * mass * (height**2 + depth**2)
        Iyy = (1/12) * mass * (width**2 + depth**2)
        Izz = (1/12) * mass * (width**2 + height**2)
        return InertiaTensor(np.diag([Ixx, Iyy, Izz]))
    
    @staticmethod
    def cylinder(mass: float, radius: float, length: float, axis: str = 'z') -> 'InertiaTensor':
        
        I_perp = (1/12) * mass * (3 * radius**2 + length**2)
        I_axis = 0.5 * mass * radius**2
        
        if axis == 'z':
            return InertiaTensor(np.diag([I_perp, I_perp, I_axis]))
        elif axis == 'y':
            return InertiaTensor(np.diag([I_perp, I_axis, I_perp]))
        else:  
            return InertiaTensor(np.diag([I_axis, I_perp, I_perp]))
    
    @staticmethod
    def rod(mass: float, length: float, axis: str = 'x') -> 'InertiaTensor':
        
        I_perp = (1/12) * mass * length**2
        I_axis = 0  
        
        if axis == 'x':
            return InertiaTensor(np.diag([I_axis, I_perp, I_perp]))
        elif axis == 'y':
            return InertiaTensor(np.diag([I_perp, I_axis, I_perp]))
        else:  
            return InertiaTensor(np.diag([I_perp, I_perp, I_axis]))
    
    def principal_axes(self) -> tuple:
        
        eigenvalues, eigenvectors = np.linalg.eig(self.I)
        return eigenvalues, eigenvectors
    
    def rotate(self, R: np.ndarray) -> 'InertiaTensor':
        
        I_rotated = R @ self.I @ R.T
        return InertiaTensor(I_rotated)


def demonstrate_inertia_properties():
    
    print("=== Inertia Tensor Properties ===\n")
    
    
    I_sphere = InertiaTensor.sphere(mass=1.0, radius=0.5)
    print("Uniform Sphere (m=1kg, r=0.5m):")
    print(I_sphere)
    print(f"Expected: I = (2/5)mr² = {(2/5)*1.0*0.5**2:.4f} kg⋅m²\n")
    
    
    I_box = InertiaTensor.box(mass=2.0, width=1.0, height=2.0, depth=0.5)
    print("Rectangular Box (m=2kg, 1m×2m×0.5m):")
    print(I_box)
    print()
    
    
    I_cyl = InertiaTensor.cylinder(mass=3.0, radius=0.3, length=1.5, axis='z')
    print("Cylinder (m=3kg, r=0.3m, l=1.5m, z-axis):")
    print(I_cyl)
    print()
    
    
    eigenvalues, eigenvectors = I_box.principal_axes()
    print("Principal Moments of Box:")
    print(f"I1 = {eigenvalues[0]:.4f} kg⋅m²")
    print(f"I2 = {eigenvalues[1]:.4f} kg⋅m²")
    print(f"I3 = {eigenvalues[2]:.4f} kg⋅m²\n")
    
    
    print("Parallel Axis Theorem:")
    print("For a rod moving from center to end:")
    m, L = 1.0, 2.0
    I_center = (1/12) * m * L**2
    I_end = (1/3) * m * L**2
    d = L / 2
    I_parallel = I_center + m * d**2
    print(f"I_center = {I_center:.4f} kg⋅m²")
    print(f"I_end (direct) = {I_end:.4f} kg⋅m²")
    print(f"I_end (parallel axis) = {I_parallel:.4f} kg⋅m²")
    print(f"Match: {np.isclose(I_end, I_parallel)}\n")


if __name__ == "__main__":
    demonstrate_inertia_properties()