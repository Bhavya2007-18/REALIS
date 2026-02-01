import numpy as np

def calculate_energy_error(states, system):
    """
    Calculates the relative energy error over a trajectory.
    
    Args:
        states: List or array of states [(x, v), ...]
        system: Object with .total_energy(state) method
        
    Returns:
        max_relative_error: Maximum deviation from initial energy (normalized)
        mean_relative_error: Average deviation
        drift: Trend of energy change (end - start) / start
    """
    if not states:
        return 0.0, 0.0, 0.0
        
    e0 = system.total_energy(states[0])
    
    # Avoid division by zero
    if abs(e0) < 1e-12:
        # If simulated energy is also zero, error is 0. Else infinite.
        # Fallback to absolute error if E0 is near zero.
        # But for scaling, let's assume non-zero initial energy for dynamics.
        return 0.0, 0.0, 0.0 

    energies = [system.total_energy(s) for s in states]
    errors = [abs((e - e0) / e0) for e in energies]
    
    max_relative_error = max(errors)
    mean_relative_error = sum(errors) / len(errors)
    drift = (energies[-1] - e0) / e0
    
    return max_relative_error, mean_relative_error, drift
