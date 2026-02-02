"""
Energy Drift Analysis

Compare energy drift across different integration methods.
"""

import numpy as np
import matplotlib.pyplot as plt


def analyze_integrator_energy_drift():
    """Compare energy drift for multiple integrators"""
    print("=== Integrator Energy Drift Comparison ===\n")
    
    # Test on harmonic oscillator
    omega = 1.0
    x0, v0 = 1.0, 0.0
    t_end = 100.0
    dt = 0.1
    
    # Forward Euler
    def forward_euler():
        num_steps = int(t_end / dt)
        x, v = x0, v0
        energies = []
        for _ in range(num_steps):
            energies.append(0.5 * v**2 + 0.5 * omega**2 * x**2)
            a = -omega**2 * x
            x_new = x + v * dt
            v_new = v + a * dt
            x, v = x_new, v_new
        return np.array(energies)
    
    # Semi-implicit Euler
    def semi_implicit_euler():
        num_steps = int(t_end / dt)
        x, v = x0, v0
        energies = []
        for _ in range(num_steps):
            energies.append(0.5 * v**2 + 0.5 * omega**2 * x**2)
            a = -omega**2 * x
            v_new = v + a * dt
            x_new = x + v_new * dt
            x, v = x_new, v_new
        return np.array(energies)
    
    # Velocity Verlet
    def verlet():
        num_steps = int(t_end / dt)
        x, v = x0, v0
        a = -omega**2 * x
        energies = []
        for _ in range(num_steps):
            energies.append(0.5 * v**2 + 0.5 * omega**2 * x**2)
            x_new = x + v * dt + 0.5 * a * dt**2
            a_new = -omega**2 * x_new
            v_new = v + 0.5 * (a + a_new) * dt
            x, v, a = x_new, v_new, a_new
        return np.array(energies)
    
    # Run simulations
    E_forward = forward_euler()
    E_semi = semi_implicit_euler()
    E_verlet = verlet()
    
    times = np.arange(len(E_forward)) * dt
    
    # Calculate drift
    def calc_drift(E):
        return (E - E[0]) / E[0] * 100
    
    drift_forward = calc_drift(E_forward)
    drift_semi = calc_drift(E_semi)
    drift_verlet = calc_drift(E_verlet)
    
    # Plot
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    
    # Normalized energy
    ax1.plot(times, E_forward / E_forward[0], 'r--', label='Forward Euler', linewidth=2, alpha=0.7)
    ax1.plot(times, E_semi / E_semi[0], 'g-', label='Semi-Implicit', linewidth=2)
    ax1.plot(times, E_verlet / E_verlet[0], 'b-', label='Verlet', linewidth=2)
    ax1.axhline(y=1.0, color='k', linestyle='--', alpha=0.5)
    ax1.set_xlabel('Time (s)')
    ax1.set_ylabel('Normalized Energy')
    ax1.set_title('Energy Conservation')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # Drift percentage (log scale)
    ax2.semilogy(times, np.abs(drift_forward) + 1e-10, 'r--', label='Forward Euler', linewidth=2, alpha=0.7)
    ax2.semilogy(times, np.abs(drift_semi) + 1e-10, 'g-', label='Semi-Implicit', linewidth=2)
    ax2.semilogy(times, np.abs(drift_verlet) + 1e-10, 'b-', label='Verlet', linewidth=2)
    ax2.set_xlabel('Time (s)')
    ax2.set_ylabel('|Energy Drift| (%) [log scale]')
    ax2.set_title('Energy Drift Comparison')
    ax2.legend()
    ax2.grid(True, alpha=0.3, which='both')
    
    plt.tight_layout()
    plt.savefig('energy_drift_comparison.png', dpi=150)
    print("📊 Plot saved to energy_drift_comparison.png\n")
    
    # Print statistics
    print("Energy Drift after 100s:")
    print(f"Forward Euler:     {drift_forward[-1]:+.3f}%")
    print(f"Semi-Implicit:     {drift_semi[-1]:+.6f}%")
    print(f"Verlet:            {drift_verlet[-1]:+.6f}%\n")
    
    print("Maximum Absolute Drift:")
    print(f"Forward Euler:     {np.max(np.abs(drift_forward)):.3f}%")
    print(f"Semi-Implicit:     {np.max(np.abs(drift_semi)):.6f}%")
    print(f"Verlet:            {np.max(np.abs(drift_verlet)):.6f}%\n")
    
    print("Ranking (best to worst energy conservation):")
    print("1. Verlet (symplectic, time-reversible)")
    print("2. Semi-Implicit Euler (symplectic)")
    print("3. Forward Euler (not symplectic, energy grows)\n")


if __name__ == "__main__":
    analyze_integrator_energy_drift()
