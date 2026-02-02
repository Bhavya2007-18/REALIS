"""
Torque Response

Experiment with rotational dynamics: τ = I·α
"""

import numpy as np
import matplotlib.pyplot as plt


def simulate_torque_response(I: float, torque_func, omega0: float = 0.0,
                            theta0: float = 0.0, dt: float = 0.01, duration: float = 5.0):
    """
    Simulate rotational motion under applied torque
    
    Args:
        I: Moment of inertia (kg⋅m²)
        torque_func: Function that returns torque given (theta, omega, t)
        omega0: Initial angular velocity (rad/s)
        theta0: Initial angle (rad)
        dt: Time step (s)
        duration: Simulation duration (s)
    """
    num_steps = int(duration / dt)
    
    theta = theta0
    omega = omega0
    
    thetas = [theta]
    omegas = [omega]
    alphas = []
    energies = []
    times = [0.0]
    
    for step in range(num_steps):
        t = step * dt
        
        # Calculate torque and angular acceleration
        tau = torque_func(theta, omega, t)
        alpha = tau / I
        
        # Update angular velocity and angle (semi-implicit Euler)
        omega += alpha * dt
        theta += omega * dt
        
        # Store data
        thetas.append(theta)
        omegas.append(omega)
        alphas.append(alpha)
        times.append(t + dt)
        
        # Rotational kinetic energy
        KE_rot = 0.5 * I * omega**2
        energies.append(KE_rot)
    
    return (np.array(times), np.array(thetas), np.array(omegas), 
            np.array(alphas), np.array(energies))


def constant_torque(theta, omega, t):
    """Constant applied torque"""
    return 2.0  # N⋅m


def sinusoidal_torque(theta, omega, t):
    """Time-varying sinusoidal torque"""
    return 2.0 * np.sin(2 * np.pi * t)


def damped_spring_torque(theta, omega, t, k=5.0, b=0.5):
    """Torsional spring with damping"""
    return -k * theta - b * omega


def plot_rotational_motion(times, thetas, omegas, alphas, energies, title="Rotational Motion"):
    """Plot rotational motion results"""
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(12, 10))
    
    # Angle vs time
    ax1.plot(times, np.degrees(thetas), 'b-', linewidth=2)
    ax1.set_xlabel('Time (s)')
    ax1.set_ylabel('Angle (degrees)')
    ax1.set_title('Angular Position')
    ax1.grid(True, alpha=0.3)
    
    # Angular velocity
    ax2.plot(times, omegas, 'r-', linewidth=2)
    ax2.set_xlabel('Time (s)')
    ax2.set_ylabel('Angular Velocity (rad/s)')
    ax2.set_title('Angular Velocity')
    ax2.grid(True, alpha=0.3)
    
    # Angular acceleration
    ax3.plot(times[:-1], alphas, 'g-', linewidth=2)
    ax3.set_xlabel('Time (s)')
    ax3.set_ylabel('Angular Acceleration (rad/s²)')
    ax3.set_title('Angular Acceleration')
    ax3.grid(True, alpha=0.3)
    
    # Rotational energy
    ax4.plot(times[:-1], energies, 'purple', linewidth=2)
    ax4.set_xlabel('Time (s)')
    ax4.set_ylabel('Rotational KE (J)')
    ax4.set_title('Rotational Kinetic Energy')
    ax4.grid(True, alpha=0.3)
    
    plt.suptitle(title, fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.savefig('torque_response.png', dpi=150)
    print("📊 Plot saved to torque_response.png")


if __name__ == "__main__":
    print("=== Torque Response Experiments ===\n")
    
    # Moment of inertia (disk)
    m, r = 2.0, 0.5  # kg, m
    I = 0.5 * m * r**2
    print(f"Disk: mass={m}kg, radius={r}m")
    print(f"Moment of inertia: I = {I:.3f} kg⋅m²\n")
    
    # Experiment: Constant torque
    print("Experiment 1: Constant Torque")
    times, thetas, omegas, alphas, energies = simulate_torque_response(
        I, constant_torque, dt=0.01, duration=5.0
    )
    print(f"Final angle: {np.degrees(thetas[-1]):.1f}°")
    print(f"Final angular velocity: {omegas[-1]:.2f} rad/s\n")
    
    plot_rotational_motion(times, thetas, omegas, alphas, energies, 
                          "Constant Torque Response")
