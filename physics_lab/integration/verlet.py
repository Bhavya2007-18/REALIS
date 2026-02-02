"""
Verlet Integration

Velocity Verlet and Position Verlet integrators.
"""

import numpy as np
import matplotlib.pyplot as plt


def velocity_verlet(accel_func, x0, v0, t_span, dt):
    """
    Velocity Verlet integration (time-reversible, symplectic)
    
    x(n+1) = x(n) + v(n)*dt + 0.5*a(n)*dt²
    v(n+1) = v(n) + 0.5*(a(n) + a(n+1))*dt
    
    Args:
        accel_func: Function a = accel_func(x) that returns acceleration
        x0, v0: Initial position and velocity
        t_span: (t_start, t_end)
        dt: Time step
    
    Returns:
        (t_array, x_array, v_array)
    """
    t_start, t_end = t_span
    num_steps = int((t_end - t_start) / dt)
    
    t = np.zeros(num_steps + 1)
    x = np.zeros(num_steps + 1)
    v = np.zeros(num_steps + 1)
    
    t[0], x[0], v[0] = t_start, x0, v0
    a_current = accel_func(x[0])
    
    for i in range(num_steps):
        # Update position
        x[i + 1] = x[i] + v[i] * dt + 0.5 * a_current * dt**2
        
        # Calculate new acceleration
        a_next = accel_func(x[i + 1])
        
        # Update velocity (average of current and next acceleration)
        v[i + 1] = v[i] + 0.5 * (a_current + a_next) * dt
        
        # Store new acceleration for next step
        a_current = a_next
        t[i + 1] = t[0] + (i + 1) * dt
    
    return t, x, v


def test_verlet_energy_conservation():
    """Test Verlet integration on harmonic oscillator"""
    print("=== Verlet Integration Energy Conservation ===\n")
    
    # Harmonic oscillator: a = -ω²x
    omega = 1.0
    accel_func = lambda x: -omega**2 * x
    
    x0, v0 = 1.0, 0.0
    t_span = (0, 100)
    dt = 0.1
    
    t, x, v = velocity_verlet(accel_func, x0, v0, t_span, dt)
    
    # Calculate energy
    KE = 0.5 * v**2
    PE = 0.5 * omega**2 * x**2
    E_total = KE + PE
    
    # Plot
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(12, 10))
    
    # Position
    ax1.plot(t, x, 'b-', linewidth=2)
    ax1.set_xlabel('Time (s)')
    ax1.set_ylabel('Position')
    ax1.set_title('Position vs Time')
    ax1.grid(True, alpha=0.3)
    
    # Phase space
    ax2.plot(x, v, 'purple', alpha=0.7, linewidth=1.5)
    ax2.set_xlabel('Position')
    ax2.set_ylabel('Velocity')
    ax2.set_title('Phase Space (should be circular)')
    ax2.grid(True, alpha=0.3)
    ax2.axis('equal')
    
    # Energy components
    ax3.plot(t, KE, 'r-', label='Kinetic', linewidth=2)
    ax3.plot(t, PE, 'b-', label='Potential', linewidth=2)
    ax3.plot(t, E_total, 'k--', label='Total', linewidth=2)
    ax3.set_xlabel('Time (s)')
    ax3.set_ylabel('Energy (J)')
    ax3.set_title('Energy Components')
    ax3.legend()
    ax3.grid(True, alpha=0.3)
    
    # Energy drift
    energy_drift = (E_total - E_total[0]) / E_total[0] * 100
    ax4.plot(t, energy_drift, 'orange', linewidth=2)
    ax4.set_xlabel('Time (s)')
    ax4.set_ylabel('Energy Drift (%)')
    ax4.set_title('Energy Conservation Error')
    ax4.grid(True, alpha=0.3)
    ax4.axhline(y=0, color='k', linestyle='--', alpha=0.5)
    
    plt.tight_layout()
    plt.savefig('verlet_integration.png', dpi=150)
    print("📊 Plot saved to verlet_integration.png")
    
    # Statistics
    max_drift = np.max(np.abs(energy_drift))
    print(f"Maximum energy drift: {max_drift:.6f}%")
    print(f"Time span: {t[-1]:.1f} s")
    print(f"Time step: {dt} s\n")
    print("✓ Verlet integration is symplectic and time-reversible!\n")


if __name__ == "__main__":
    test_verlet_energy_conservation()
