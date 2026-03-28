

import numpy as np


def validate_newton_third_law(F1_on_2: np.ndarray, F2_on_1: np.ndarray, 
                              tolerance: float = 1e-6) -> bool:
    
    return np.allclose(F1_on_2, -F2_on_1, atol=tolerance)


def validate_force_units(force: np.ndarray, mass: float, acceleration: np.ndarray,
                        tolerance: float = 1e-6) -> bool:
    
    expected_force = mass * acceleration
    return np.allclose(force, expected_force, atol=tolerance)


def check_energy_conservation(KE: np.ndarray, PE: np.ndarray,
                              max_drift_percent: float = 1.0) -> tuple[bool, float]:
    
    total_energy = KE + PE
    initial_energy = total_energy[0]
    
    if abs(initial_energy) < 1e-10:
        return True, 0.0
    
    drift = np.max(np.abs(total_energy - initial_energy)) / abs(initial_energy) * 100
    is_conserved = drift < max_drift_percent
    
    return is_conserved, drift


def validate_momentum_conservation(p_initial: np.ndarray, p_final: np.ndarray,
                                   tolerance: float = 1e-6) -> bool:
    
    return np.allclose(p_initial, p_final, atol=tolerance)


if __name__ == "__main__":
    print("=== Force Validation Demonstrations ===\n")
    
    
    F12 = np.array([10.0, 5.0, -3.0])
    F21 = np.array([-10.0, -5.0, 3.0])
    is_valid = validate_newton_third_law(F12, F21)
    print(f"Newton's 3rd Law: F12 = {F12}, F21 = {F21}")
    print(f"Valid: {is_valid}\n")
    
    
    mass = 2.0  
    accel = np.array([3.0, -4.0, 0.0])  
    force = np.array([6.0, -8.0, 0.0])  
    is_valid = validate_force_units(force, mass, accel)
    print(f"F = ma: F = {force} N, m = {mass} kg, a = {accel} m/s²")
    print(f"Valid: {is_valid}\n")
    
    
    times = np.linspace(0, 10, 100)
    KE = 50 * np.ones_like(times)  
    PE = 50 * np.ones_like(times)  
    is_conserved, drift = check_energy_conservation(KE, PE)
    print(f"Energy conservation: Drift = {drift:.6f}%")
    print(f"Conserved: {is_conserved}\n")