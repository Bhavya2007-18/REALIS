

import numpy as np
import matplotlib.pyplot as plt


def simulate_simple_pendulum(length: float, theta0: float, omega0: float = 0.0,
                             g: float = 9.81, dt: float = 0.01, duration: float = 10.0):
    
    num_steps = int(duration / dt)
    
    theta = theta0
    omega = omega0
    
    thetas = [theta]
    omegas = [omega]
    energies = []
    times = [0.0]
    
    m = 1.0  
    
    for step in range(num_steps):
        
        alpha = -(g / length) * np.sin(theta)
        
        
        omega += alpha * dt
        theta += omega * dt
        
        thetas.append(theta)
        omegas.append(omega)
        times.append((step + 1) * dt)
        
        
        h = length * (1 - np.cos(theta))  
        KE = 0.5 * m * (length * omega)**2
        PE = m * g * h
        E_total = KE + PE
        energies.append(E_total)
    
    return (np.array(times), np.array(thetas), np.array(omegas), 
            np.array(energies))


def plot_pendulum_results(times, thetas, omegas, energies):
    
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(12, 10))
    
    
    ax1.plot(times, np.degrees(thetas), 'b-', linewidth=2)
    ax1.set_xlabel('Time (s)')
    ax1.set_ylabel('Angle (degrees)')
    ax1.set_title('Pendulum Angle')
    ax1.grid(True, alpha=0.3)
    ax1.axhline(y=0, color='k', linestyle='--', alpha=0.5)
    
    
    ax2.plot(times, omegas, 'r-', linewidth=2)
    ax2.set_xlabel('Time (s)')
    ax2.set_ylabel('Angular Velocity (rad/s)')
    ax2.set_title('Angular Velocity')
    ax2.grid(True, alpha=0.3)
    
    
    ax3.plot(thetas, omegas, 'purple', alpha=0.7, linewidth=1.5)
    ax3.scatter(thetas[0], omegas[0], c='green', s=100, label='Start', zorder=5)
    ax3.set_xlabel('Angle (rad)')
    ax3.set_ylabel('Angular Velocity (rad/s)')
    ax3.set_title('Phase Space')
    ax3.legend()
    ax3.grid(True, alpha=0.3)
    
    
    ax4.plot(times[:-1], energies, 'orange', linewidth=2)
    ax4.set_xlabel('Time (s)')
    ax4.set_ylabel('Total Energy (J)')
    ax4.set_title('Energy Conservation')
    ax4.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('pendulum_constraint.png', dpi=150)
    print("📊 Plot saved to pendulum_constraint.png")


if __name__ == "__main__":
    print("=== Simple Pendulum Constraint ===\n")
    
    length = 1.0  
    theta0 = np.radians(45)  
    
    print(f"Length: {length} m")
    print(f"Initial angle: {np.degrees(theta0)}°")
    print(f"g = 9.81 m/s²\n")
    
    times, thetas, omegas, energies = simulate_simple_pendulum(
        length, theta0, dt=0.01, duration=10.0
    )
    
    
    T_theoretical = 2 * np.pi * np.sqrt(length / 9.81)
    print(f"Theoretical period (small angle): {T_theoretical:.3f} s")
    
    
    energy_drift = (energies[-1] - energies[0]) / energies[0] * 100
    print(f"⚡ Energy drift: {energy_drift:.4f}%\n")
    
    plot_pendulum_results(times, thetas, omegas, energies)