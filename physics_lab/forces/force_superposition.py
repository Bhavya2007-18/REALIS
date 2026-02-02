"""
Force Superposition

Experiment with multiple forces acting on a single object.
"""

import numpy as np
import matplotlib.pyplot as plt
from typing import List, Callable


class Force:
    """Base force class"""
    
    def __init__(self, name: str):
        self.name = name
    
    def compute(self, pos: np.ndarray, vel: np.ndarray, t: float) -> np.ndarray:
        """Compute force vector at given state"""
        raise NotImplementedError


class GravityForce(Force):
    """Constant gravity force"""
    
    def __init__(self, mass: float, g: float = 9.81):
        super().__init__("Gravity")
        self.mass = mass
        self.g = g
    
    def compute(self, pos, vel, t):
        return np.array([0.0, -self.mass * self.g])


class DragForce(Force):
    """Quadratic air drag"""
    
    def __init__(self, drag_coeff: float):
        super().__init__("Drag")
        self.drag_coeff = drag_coeff
    
    def compute(self, pos, vel, t):
        v_mag = np.linalg.norm(vel)
        if v_mag < 1e-10:
            return np.array([0.0, 0.0])
        return -self.drag_coeff * v_mag * vel


class SpringForce(Force):
    """Hooke's law spring force"""
    
    def __init__(self, k: float, anchor: np.ndarray):
        super().__init__("Spring")
        self.k = k
        self.anchor = anchor
    
    def compute(self, pos, vel, t):
        displacement = pos - self.anchor
        return -self.k * displacement


def simulate_multi_force(mass: float, pos0: np.ndarray, vel0: np.ndarray,
                        forces: List[Force], dt: float = 0.01, duration: float = 10.0):
    """
    Simulate particle under multiple forces
    
    Args:
        mass: Particle mass (kg)
        pos0: Initial position (m)
        vel0: Initial velocity (m/s)
        forces: List of Force objects
        dt: Time step (s)
        duration: Simulation duration (s)
    """
    num_steps = int(duration / dt)
    
    pos = pos0.copy()
    vel = vel0.copy()
    
    positions = [pos.copy()]
    velocities = [vel.copy()]
    force_histories = {f.name: [] for f in forces}
    times = [0.0]
    
    for step in range(num_steps):
        t = step * dt
        
        # Compute total force (superposition principle)
        F_total = np.zeros(2)
        for force in forces:
            F = force.compute(pos, vel, t)
            F_total += F
            force_histories[force.name].append(F.copy())
        
        # Update velocity and position (semi-implicit Euler)
        acc = F_total / mass
        vel += acc * dt
        pos += vel * dt
        
        positions.append(pos.copy())
        velocities.append(vel.copy())
        times.append(t + dt)
    
    return (np.array(positions), np.array(velocities), 
            np.array(times), force_histories)


def plot_multi_force_results(positions, times, force_histories):
    """Plot results of multi-force simulation"""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    
    # Trajectory
    ax1.plot(positions[:, 0], positions[:, 1], 'b-', linewidth=2)
    ax1.scatter(positions[0, 0], positions[0, 1], c='green', s=100, label='Start', zorder=5)
    ax1.scatter(positions[-1, 0], positions[-1, 1], c='red', s=100, label='End', zorder=5)
    ax1.set_xlabel('x (m)')
    ax1.set_ylabel('y (m)')
    ax1.set_title('Trajectory Under Multiple Forces')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    ax1.axis('equal')
    
    # Force magnitudes over time
    for force_name, force_history in force_histories.items():
        force_mags = [np.linalg.norm(f) for f in force_history]
        ax2.plot(times[:-1], force_mags, label=force_name, linewidth=2)
    
    ax2.set_xlabel('Time (s)')
    ax2.set_ylabel('Force Magnitude (N)')
    ax2.set_title('Force Components Over Time')
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('force_superposition.png', dpi=150)
    print("📊 Plot saved to force_superposition.png")


if __name__ == "__main__":
    print("=== Force Superposition Experiment ===\n")
    
    # Parameters
    mass = 1.0  # kg
    pos0 = np.array([0.0, 10.0])  # m
    vel0 = np.array([5.0, 0.0])  # m/s
    
    # Define forces
    forces = [
        GravityForce(mass, g=9.81),
        DragForce(drag_coeff=0.1),
        SpringForce(k=0.5, anchor=np.array([0.0, 0.0]))
    ]
    
    print("Forces acting on particle:")
    for force in forces:
        print(f"  - {force.name}")
    print()
    
    # Simulate
    positions, velocities, times, force_histories = simulate_multi_force(
        mass, pos0, vel0, forces, dt=0.01, duration=10.0
    )
    
    print(f"Initial position: {pos0}")
    print(f"Final position: {positions[-1]}")
    print(f"Initial velocity: {vel0}")
    print(f"Final velocity: {velocities[-1]}\n")
    
    # Plot
    plot_multi_force_results(positions, times, force_histories)
