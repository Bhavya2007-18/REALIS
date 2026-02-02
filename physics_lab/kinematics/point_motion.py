"""
Point Motion Kinematics

Experiment with particle motion under constant acceleration.
"""

import numpy as np
import matplotlib.pyplot as plt


def simulate_projectile_motion(v0: float, angle_deg: float, dt: float = 0.01, g: float = 9.81):
    """
    Simulate projectile motion
    
    Args:
        v0: Initial velocity (m/s)
        angle_deg: Launch angle (degrees)
        dt: Time step (s)
        g: Gravitational acceleration (m/s²)
    """
    angle = np.radians(angle_deg)
    vx = v0 * np.cos(angle)
    vy = v0 * np.sin(angle)
    
    # Initial state
    x, y = 0.0, 0.0
    
    # Storage
    positions_x = [x]
    positions_y = [y]
    velocities = [np.sqrt(vx**2 + vy**2)]
    times = [0.0]
    energies = []
    
    # Mass (arbitrary for energy calculation)
    m = 1.0
    
    t = 0.0
    while y >= 0:
        # Update velocity
        vy -= g * dt
        
        # Update position
        x += vx * dt
        y += vy * dt
        
        t += dt
        
        # Store data
        positions_x.append(x)
        positions_y.append(y)
        velocities.append(np.sqrt(vx**2 + vy**2))
        times.append(t)
        
        # Calculate energy
        KE = 0.5 * m * (vx**2 + vy**2)
        PE = m * g * y
        E_total = KE + PE
        energies.append(E_total)
    
    return np.array(times), np.array(positions_x), np.array(positions_y), np.array(velocities), np.array(energies)


def plot_projectile_results(times, x, y, velocities, energies):
    """Plot projectile motion results"""
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(12, 10))
    
    # Trajectory
    ax1.plot(x, y, 'b-', linewidth=2)
    ax1.set_xlabel('Horizontal Distance (m)')
    ax1.set_ylabel('Height (m)')
    ax1.set_title('Projectile Trajectory')
    ax1.grid(True, alpha=0.3)
    ax1.set_aspect('equal')
    
    # Position vs time
    ax2.plot(times, x, 'r-', label='x(t)', linewidth=2)
    ax2.plot(times, y, 'b-', label='y(t)', linewidth=2)
    ax2.set_xlabel('Time (s)')
    ax2.set_ylabel('Position (m)')
    ax2.set_title('Position vs Time')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    # Velocity
    ax3.plot(times, velocities, 'g-', linewidth=2)
    ax3.set_xlabel('Time (s)')
    ax3.set_ylabel('Speed (m/s)')
    ax3.set_title('Speed vs Time')
    ax3.grid(True, alpha=0.3)
    
    # Energy conservation
    ax4.plot(times[:-1], energies, 'purple', linewidth=2)
    ax4.set_xlabel('Time (s)')
    ax4.set_ylabel('Total Energy (J)')
    ax4.set_title('Energy Conservation Check')
    ax4.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('projectile_motion.png', dpi=150)
    print("📊 Plot saved to projectile_motion.png")


if __name__ == "__main__":
    print("=== Projectile Motion Experiment ===\n")
    
    # Parameters
    v0 = 20.0  # m/s
    angle = 45.0  # degrees
    
    print(f"Initial velocity: {v0} m/s")
    print(f"Launch angle: {angle}°")
    print(f"Gravitational acceleration: 9.81 m/s²\n")
    
    # Simulate
    times, x, y, velocities, energies = simulate_projectile_motion(v0, angle)
    
    # Results
    max_height = np.max(y)
    range_dist = x[-1]
    flight_time = times[-1]
    
    print(f"📏 Maximum height: {max_height:.2f} m")
    print(f"📏 Range: {range_dist:.2f} m")
    print(f"⏱️  Flight time: {flight_time:.2f} s\n")
    
    # Energy drift
    energy_drift = (energies[-1] - energies[0]) / energies[0] * 100
    print(f"⚡ Initial energy: {energies[0]:.3f} J")
    print(f"⚡ Final energy: {energies[-1]:.3f} J")
    print(f"⚠️  Energy drift: {energy_drift:.4f}%\n")
    
    # Plot
    plot_projectile_results(times, x, y, velocities, energies)
