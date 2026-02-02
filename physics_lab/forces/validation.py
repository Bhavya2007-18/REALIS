"""
Force Validation Utilities

Tools for validating force calculations and physical laws.
"""

import numpy as np


def validate_newton_third_law(F1_on_2: np.ndarray, F2_on_1: np.ndarray, 
                              tolerance: float = 1e-6) -> bool:
    """
    Validate Newton's third law: F12 = -F21
    
    Args:
        F1_on_2: Force of object 1 on object 2
        F2_on_1: Force of object 2 on object 1
        tolerance: Numerical tolerance
    
    Returns:
        True if third law is satisfied
    """
    return np.allclose(F1_on_2, -F2_on_1, atol=tolerance)


def validate_force_units(force: np.ndarray, mass: float, acceleration: np.ndarray,
                        tolerance: float = 1e-6) -> bool:
    """
    Validate F = ma (Newton's second law)
    
    Args:
        force: Force vector (N)
        mass: Mass (kg)
        acceleration: Acceleration vector (m/s²)
        tolerance: Numerical tolerance
    
    Returns:
        True if F = ma is satisfied
    """
    expected_force = mass * acceleration
    return np.allclose(force, expected_force, atol=tolerance)


def check_energy_conservation(KE: np.ndarray, PE: np.ndarray,
                              max_drift_percent: float = 1.0) -> tuple[bool, float]:
    """
    Check if total energy is conserved
    
    Args:
        KE: Kinetic energy array over time
        PE: Potential energy array over time
        max_drift_percent: Maximum allowed energy drift (%)
    
    Returns:
        (is_conserved, drift_percent)
    """
    total_energy = KE + PE
    initial_energy = total_energy[0]
    
    if abs(initial_energy) < 1e-10:
        return True, 0.0
    
    drift = np.max(np.abs(total_energy - initial_energy)) / abs(initial_energy) * 100
    is_conserved = drift < max_drift_percent
    
    return is_conserved, drift


def validate_momentum_conservation(p_initial: np.ndarray, p_final: np.ndarray,
                                   tolerance: float = 1e-6) -> bool:
    """
    Validate conservation of momentum
    
    Args:
        p_initial: Initial total momentum
        p_final: Final total momentum
        tolerance: Numerical tolerance
    
    Returns:
        True if momentum is conserved
    """
    return np.allclose(p_initial, p_final, atol=tolerance)


if __name__ == "__main__":
    print("=== Force Validation Demonstrations ===\n")
    
    # Newton's third law
    F12 = np.array([10.0, 5.0, -3.0])
    F21 = np.array([-10.0, -5.0, 3.0])
    is_valid = validate_newton_third_law(F12, F21)
    print(f"Newton's 3rd Law: F12 = {F12}, F21 = {F21}")
    print(f"Valid: {is_valid}\n")
    
    # F = ma
    mass = 2.0  # kg
    accel = np.array([3.0, -4.0, 0.0])  # m/s²
    force = np.array([6.0, -8.0, 0.0])  # N
    is_valid = validate_force_units(force, mass, accel)
    print(f"F = ma: F = {force} N, m = {mass} kg, a = {accel} m/s²")
    print(f"Valid: {is_valid}\n")
    
    # Energy conservation example
    times = np.linspace(0, 10, 100)
    KE = 50 * np.ones_like(times)  # Constant KE
    PE = 50 * np.ones_like(times)  # Constant PE
    is_conserved, drift = check_energy_conservation(KE, PE)
    print(f"Energy conservation: Drift = {drift:.6f}%")
    print(f"Conserved: {is_conserved}\n")
