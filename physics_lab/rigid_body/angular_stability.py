

import numpy as np
import matplotlib.pyplot as plt


def tennis_racket_effect(I1: float, I2: float, I3: float,
                         omega0: np.ndarray, dt: float = 0.001, duration: float = 20.0):
    
    num_steps = int(duration / dt)
    
    omega = omega0.copy()
    omegas = [omega.copy()]
    times = [0.0]
    
    for step in range(num_steps):
        t = step * dt
        
        
        omega_dot = np.array([
            ((I2 - I3) / I1) * omega[1] * omega[2],
            ((I3 - I1) / I2) * omega[2] * omega[0],
            ((I1 - I2) / I3) * omega[0] * omega[1]
        ])
        
        omega += omega_dot * dt
        
        omegas.append(omega.copy())
        times.append(t + dt)
    
    return np.array(times), np.array(omegas)


def plot_angular_stability(times, omegas, title="Angular Stability"):
    
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 10))
    
    
    ax1.plot(times, omegas[:, 0], 'r-', label='ω₁', linewidth=2)
    ax1.plot(times, omegas[:, 1], 'g-', label='ω₂', linewidth=2)
    ax1.plot(times, omegas[:, 2], 'b-', label='ω₃', linewidth=2)
    ax1.set_xlabel('Time (s)')
    ax1.set_ylabel('Angular Velocity (rad/s)')
    ax1.set_title('Angular Velocity Components')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    
    ax2 = plt.subplot(2, 1, 2, projection='3d')
    ax2.plot(omegas[:, 0], omegas[:, 1], omegas[:, 2], 'purple', linewidth=1)
    ax2.scatter(omegas[0, 0], omegas[0, 1], omegas[0, 2], 
                c='green', s=100, label='Start')
    ax2.set_xlabel('ω₁ (rad/s)')
    ax2.set_ylabel('ω₂ (rad/s)')
    ax2.set_zlabel('ω₃ (rad/s)')
    ax2.set_title('Angular Velocity Phase Space')
    ax2.legend()
    
    plt.suptitle(title, fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.savefig('angular_stability.png', dpi=150)
    print("📊 Plot saved to angular_stability.png")


if __name__ == "__main__":
    print("=== Angular Stability Analysis ===\n")
    print("Tennis Racket Effect (Dzhanibekov Effect)\n")
    
    
    I1, I2, I3 = 1.0, 2.0, 3.0
    print(f"Principal moments: I₁={I1}, I₂={I2}, I₃={I3} kg⋅m²")
    print("(I₁ < I₂ < I₃: rotation about axis 2 is unstable)\n")
    
    
    omega0 = np.array([0.1, 5.0, 0.1])
    print(f"Initial angular velocity: ω₀ = {omega0} rad/s")
    print("(Small perturbations about axis 2)\n")
    
    times, omegas = tennis_racket_effect(I1, I2, I3, omega0, dt=0.001, duration=20.0)
    
    
    flips = np.where(np.diff(np.sign(omegas[:, 1])))[0]
    print(f"Number of axis flips: {len(flips)}")
    if len(flips) > 0:
        print(f"First flip at t ≈ {times[flips[0]]:.2f} s")
    print("\nThis demonstrates the instability of rotation about the intermediate principal axis.\n")
    
    plot_angular_stability(times, omegas, "Tennis Racket Effect")