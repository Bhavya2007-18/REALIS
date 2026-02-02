"""
Gravitational Force Experiments

Explore gravitational interactions and N-body dynamics.
"""

import numpy as np
import matplotlib.pyplot as plt


G = 6.67430e-11  # Gravitational constant (m³ kg⁻¹ s⁻²)


def gravitational_force(m1: float, m2: float, r_vec: np.ndarray) -> np.ndarray:
    """
    Calculate gravitational force on m1 due to m2
    
    Args:
        m1: Mass of object 1 (kg)
        m2: Mass of object 2 (kg)
        r_vec: Position vector from m1 to m2 (m)
    
    Returns:
        Force vector on m1 (N)
    """
    r_mag = np.linalg.norm(r_vec)
    if r_mag < 1e-10:
        return np.zeros_like(r_vec)
    
    F_mag = G * m1 * m2 / (r_mag ** 2)
    F_vec = F_mag * (r_vec / r_mag)
    
    return F_vec


def simulate_two_body_orbit(m1: float, m2: float, r0: np.ndarray, v0: np.ndarray,
                            dt: float = 1000, num_steps: int = 10000):
    """
    Simulate two-body gravitational orbit
    
    Args:
        m1, m2: Masses (kg)
        r0: Initial separation vector (m)
        v0: Initial relative velocity (m/s)
        dt: Time step (s)
        num_steps: Number of simulation steps
    """
    # Positions and velocities
    r1 = np.array([0.0, 0.0])  # m1 at origin
    r2 = r0.copy()
    v1 = np.array([0.0, 0.0])
    v2 = v0.copy()
    
    # Storage
    positions_1 = [r1.copy()]
    positions_2 = [r2.copy()]
    energies = []
    times = []
    
    for step in range(num_steps):
        # Calculate force
        r_vec = r2 - r1
        F = gravitational_force(m1, m2, r_vec)
        
        # Update velocities (semi-implicit Euler)
        a1 = F / m1
        a2 = -F / m2
        
        v1 += a1 * dt
        v2 += a2 * dt
        
        # Update positions
        r1 += v1 * dt
        r2 += v2 * dt
        
        # Store data
        positions_1.append(r1.copy())
        positions_2.append(r2.copy())
        times.append(step * dt)
        
        # Calculate energy
        r_mag = np.linalg.norm(r2 - r1)
        KE = 0.5 * m1 * np.linalg.norm(v1)**2 + 0.5 * m2 * np.linalg.norm(v2)**2
        PE = -G * m1 * m2 / r_mag if r_mag > 0 else 0
        E_total = KE + PE
        energies.append(E_total)
    
    return (np.array(positions_1), np.array(positions_2), 
            np.array(times), np.array(energies))


def plot_orbit_results(pos1, pos2, times, energies):
    """Plot two-body orbit results"""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    
    # Orbits
    ax1.plot(pos1[:, 0], pos1[:, 1], 'r-', label='Body 1', linewidth=1.5, alpha=0.7)
    ax1.plot(pos2[:, 0], pos2[:, 1], 'b-', label='Body 2', linewidth=1.5, alpha=0.7)
    ax1.scatter([0], [0], c='yellow', s=200, marker='*', label='Center of Mass', zorder=5)
    ax1.set_xlabel('x (m)')
    ax1.set_ylabel('y (m)')
    ax1.set_title('Two-Body Orbit')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    ax1.axis('equal')
    
    # Energy conservation
    ax2.plot(times, energies, 'purple', linewidth=2)
    ax2.set_xlabel('Time (s)')
    ax2.set_ylabel('Total Energy (J)')
    ax2.set_title('Energy Conservation')
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('gravitational_orbit.png', dpi=150)
    print("📊 Plot saved to gravitational_orbit.png")


if __name__ == "__main__":
    print("=== Two-Body Gravitational Orbit ===\n")
    
    # Earth-Moon system (simplified)
    m_earth = 5.972e24  # kg
    m_moon = 7.342e22   # kg
    r0 = np.array([3.844e8, 0.0])  # m (Earth-Moon distance)
    v0 = np.array([0.0, 1022.0])  # m/s (Moon's orbital velocity)
    
    print(f"Earth mass: {m_earth:.3e} kg")
    print(f"Moon mass: {m_moon:.3e} kg")
    print(f"Initial separation: {np.linalg.norm(r0)/1e6:.2f} million km\n")
    
    # Simulate
    pos1, pos2, times, energies = simulate_two_body_orbit(
        m_earth, m_moon, r0, v0, dt=3600, num_steps=730  # 1 month
    )
    
    # Energy drift
    energy_drift = (energies[-1] - energies[0]) / abs(energies[0]) * 100
    print(f"⚡ Initial energy: {energies[0]:.3e} J")
    print(f"⚡ Final energy: {energies[-1]:.3e} J")
    print(f"⚠️  Energy drift: {energy_drift:.4f}%\n")
    
    # Plot
    plot_orbit_results(pos1, pos2, times, energies)
