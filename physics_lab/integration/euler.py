"""
Euler Integration

Forward Euler integration method with stability analysis.
"""

import numpy as np
import matplotlib.pyplot as plt


def forward_euler(f, y0, t_span, dt):
    """
    Forward Euler integration: y(n+1) = y(n) + dt * f(t(n), y(n))
    
    Args:
        f: Derivative function dy/dt = f(t, y)
        y0: Initial condition
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
        y[i + 1] = y[i] + dt * f(t[i], y[i])
        t[i + 1] = t[0] + (i + 1) * dt
    
    return t, y


def harmonic_oscillator_ode(t, y, omega=1.0):
    """
    Harmonic oscillator: d²x/dt² = -ω²x
    State: y = [x, v]
    Derivative: dy/dt = [v, -ω²x]
    """
    x, v = y
    return np.array([v, -omega**2 * x])


def test_euler_stability():
    """Test Forward Euler stability on harmonic oscillator"""
    print("=== Forward Euler Stability Test ===\n")
    
    omega = 1.0  # Natural frequency
    y0 = np.array([1.0, 0.0])  # Initial: x=1, v=0
    t_span = (0, 20)
    
    # Test different time steps
    dt_values = [0.5, 1.0, 2.0, 2.5]
    
    fig, axes = plt.subplots(2, 2, figsize=(12, 10))
    axes = axes.flatten()
    
    for idx, dt in enumerate(dt_values):
        t, y = forward_euler(lambda t, y: harmonic_oscillator_ode(t, y, omega), 
                           y0, t_span, dt)
        
        x = y[:, 0]
        v = y[:, 1]
        
        # Energy
        E = 0.5 * v**2 + 0.5 * omega**2 * x**2
        
        # Plot
        ax = axes[idx]
        ax.plot(t, x, 'b-', label='Position', linewidth=2)
        ax.plot(t, E, 'r--', label='Energy (should be constant)', linewidth=2, alpha=0.7)
        ax.set_xlabel('Time (s)')
        ax.set_ylabel('Value')
        ax.set_title(f'dt = {dt:.2f} ({"UNSTABLE" if dt > 2/omega else "stable"})')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        # Check stability
        stability_limit = 2 / omega
        is_stable = dt < stability_limit
        print(f"dt = {dt:.2f}: {'Stable' if is_stable else 'UNSTABLE'}")
        print(f"  Stability limit: dt < {stability_limit:.2f}")
        print(f"  Final energy / Initial energy: {E[-1] / E[0]:.2f}\n")
    
    plt.tight_layout()
    plt.savefig('euler_stability.png', dpi=150)
    print("📊 Plot saved to euler_stability.png")
    print("\n⚠️  Forward Euler is conditionally stable!")
    print("For oscillators: dt < 2/ω for stability\n")


if __name__ == "__main__":
    test_euler_stability()
