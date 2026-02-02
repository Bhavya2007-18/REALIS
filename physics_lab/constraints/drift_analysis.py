"""
Constraint Drift Analysis

Measure and quantify constraint drift in simulations.
"""

import numpy as np
import matplotlib.pyplot as plt


def analyze_constraint_drift(errors: np.ndarray, times: np.ndarray, 
                            constraint_name: str = "Constraint"):
    """
    Analyze constraint drift over time
    
    Args:
        errors: Array of constraint errors over time
        times: Time array
        constraint_name: Name of constraint for reporting
    """
    print(f"=== {constraint_name} Drift Analysis ===\n")
    
    # Statistics
    mean_error = np.mean(np.abs(errors))
    max_error = np.max(np.abs(errors))
    final_error = errors[-1]
    
    # Drift rate (linear fit)
    coeffs = np.polyfit(times, errors, 1)
    drift_rate = coeffs[0]
    
    print(f"Mean absolute error: {mean_error:.6e}")
    print(f"Max absolute error: {max_error:.6e}")
    print(f"Final error: {final_error:.6e}")
    print(f"Drift rate: {drift_rate:.6e} per second\n")
    
    # Plot
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8))
    
    ax1.plot(times, errors, 'b-', linewidth=2)
    ax1.set_xlabel('Time (s)')
    ax1.set_ylabel('Constraint Error')
    ax1.set_title(f'{constraint_name} Error Over Time')
    ax1.grid(True, alpha=0.3)
    ax1.axhline(y=0, color='k', linestyle='--', alpha=0.5)
    
    ax2.semilogy(times, np.abs(errors), 'r-', linewidth=2)
    ax2.set_xlabel('Time (s)')
    ax2.set_ylabel('|Constraint Error| (log scale)')
    ax2.set_title('Absolute Error (Log Scale)')
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('constraint_drift.png', dpi=150)
    print(f"📊 Plot saved to constraint_drift.png")
    
    return {
        'mean_error': mean_error,
        'max_error': max_error,
        'drift_rate': drift_rate
    }


if __name__ == "__main__":
    # Simulate some constraint drift
    times = np.linspace(0, 10, 1000)
    
    # Example: Linear drift with noise
    errors = 1e-6 * times + 1e-7 * np.random.randn(len(times))
    
    stats = analyze_constraint_drift(errors, times, "Distance Constraint")
