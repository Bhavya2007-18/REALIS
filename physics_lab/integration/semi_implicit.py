"""
Semi-Implicit Euler Integration

Symplectic integrator with better energy conservation.
"""

import numpy as np
import matplotlib.pyplot as plt


def semi_implicit_euler(f, y0, t_span, dt):
    """
    Semi-implicit Euler (Symplectic Euler)
    
    For dy/dt = [v, a(x)]:
    v(n+1) = v(n) + dt * a(x(n))
    x(n+1) = x(n) + dt * v(n+1)  # Use updated velocity!
    
    Args:
        f: Derivative function [dx/dt, dv/dt] = f(t, [x, v])
        y0: Initial state [x0, v0]
        t_span: (t_start, t_end)
        dt: Time step
    
    Returns:
        (t_array, y_array)
    """
    t_start, t_end = t_span
    num_steps = int((t_end - t_start) / dt)
    
    t = np.zeros(num_steps + 1)
    y = np.zeros((num_steps + 1, len(y0)))
    
    t[0] = t_start
    y[0] = y0
    
    for i in range(num_steps):
        # Compute acceleration at current position
        deriv = f(t[i], y[i])
        v_new = y[i, 1] + dt * deriv[1]  # Update velocity first
        x_new = y[i, 0] + dt * v_new      # Use new velocity
        
        y[i + 1] = np.array([x_new, v_new])
        t[i + 1] = t[0] + (i + 1) * dt
    
    return t, y


def compare_euler_methods():
    """Compare Forward Euler vs Semi-Implicit Euler"""
    print("=== Euler Method Comparison ===\n")
    
    # Harmonic oscillator
    omega = 1.0
    y0 = np.array([1.0, 0.0])
    t_span = (0, 50)
    dt = 0.1
    
    def harmonic_ode(t, y):
        x, v = y
        return np.array([v, -omega**2 * x])
    
    # Semi-implicit Euler
    t, y_semi = semi_implicit_euler(harmonic_ode, y0, t_span, dt)
    
    # Forward Euler (for comparison)
    def forward_euler(f, y0, t_span, dt):
        t_start, t_end = t_span
        num_steps = int((t_end - t_start) / dt)
        t = np.zeros(num_steps + 1)
        y = np.zeros((num_steps + 1, len(y0)))
        t[0], y[0] = t_start, y0
        for i in range(num_steps):
            y[i + 1] = y[i] + dt * f(t[i], y[i])
            t[i + 1] = t[0] + (i + 1) * dt
        return t, y
    
    t, y_forward = forward_euler(harmonic_ode, y0, t_span, dt)
    
    # Calculate energies
    E_semi = 0.5 * y_semi[:, 1]**2 + 0.5 * omega**2 * y_semi[:, 0]**2
    E_forward = 0.5 * y_forward[:, 1]**2 + 0.5 * omega**2 * y_forward[:, 0]**2
    
    # Plot comparison
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    
    # Trajectories
    ax1.plot(t, y_semi[:, 0], 'b-', label='Semi-Implicit', linewidth=2)
    ax1.plot(t, y_forward[:, 0], 'r--', label='Forward Euler', linewidth=2, alpha=0.7)
    ax1.set_xlabel('Time (s)')
    ax1.set_ylabel('Position')
    ax1.set_title('Position Comparison')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # Energy
    ax2.plot(t, E_semi / E_semi[0], 'b-', label='Semi-Implicit', linewidth=2)
    ax2.plot(t, E_forward / E_forward[0], 'r--', label='Forward Euler', linewidth=2, alpha=0.7)
    ax2.axhline(y=1.0, color='k', linestyle='--', alpha=0.5, label='Ideal')
    ax2.set_xlabel('Time (s)')
    ax2.set_ylabel('Normalized Energy')
    ax2.set_title('Energy Conservation')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('semi_implicit_comparison.png', dpi=150)
    print("📊 Plot saved to semi_implicit_comparison.png")
    
    # Energy drift
    drift_semi = (E_semi[-1] - E_semi[0]) / E_semi[0] * 100
    drift_forward = (E_forward[-1] - E_forward[0]) / E_forward[0] * 100
    
    print(f"Energy drift (Semi-Implicit): {drift_semi:.4f}%")
    print(f"Energy drift (Forward Euler): {drift_forward:.4f}%\n")
    print("✓ Semi-Implicit Euler is symplectic and conserves energy better!\n")


if __name__ == "__main__":
    compare_euler_methods()
