"""
Plotting Utilities for Physics Experiments

Reusable plotting functions for kinematics visualization.
"""

import numpy as np
import matplotlib.pyplot as plt
from typing import List, Tuple


def setup_plot_style():
    """Configure matplotlib style for physics plots"""
    plt.style.use('seaborn-v0_8-darkgrid' if 'seaborn-v0_8-darkgrid' in plt.style.available else 'default')
    plt.rcParams['figure.figsize'] = (10, 6)
    plt.rcParams['font.size'] = 11
    plt.rcParams['lines.linewidth'] = 2


def plot_trajectory_2d(x: np.ndarray, y: np.ndarray, title: str = "Trajectory",
                       xlabel: str = "x (m)", ylabel: str = "y (m)",
                       save_path: str = None):
    """Plot 2D trajectory"""
    setup_plot_style()
    
    plt.figure()
    plt.plot(x, y, 'b-', linewidth=2)
    plt.xlabel(xlabel)
    plt.ylabel(ylabel)
    plt.title(title)
    plt.grid(True, alpha=0.3)
    plt.axis('equal')
    
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
    else:
        plt.show()


def plot_energy_conservation(times: np.ndarray, KE: np.ndarray, PE: np.ndarray, 
                            total: np.ndarray, title: str = "Energy Conservation"):
    """Plot kinetic, potential, and total energy"""
    setup_plot_style()
    
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8))
    
    # Energy components
    ax1.plot(times, KE, 'r-', label='Kinetic', linewidth=2)
    ax1.plot(times, PE, 'b-', label='Potential', linewidth=2)
    ax1.plot(times, total, 'k--', label='Total', linewidth=2)
    ax1.set_xlabel('Time (s)')
    ax1.set_ylabel('Energy (J)')
    ax1.set_title(title)
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # Total energy drift
    energy_drift = (total - total[0]) / total[0] * 100
    ax2.plot(times, energy_drift, 'purple', linewidth=2)
    ax2.set_xlabel('Time (s)')
    ax2.set_ylabel('Energy Drift (%)')
    ax2.set_title('Energy Conservation Error')
    ax2.grid(True, alpha=0.3)
    ax2.axhline(y=0, color='k', linestyle='--', alpha=0.5)
    
    plt.tight_layout()
    plt.show()


def plot_phase_space(positions: np.ndarray, velocities: np.ndarray,
                     title: str = "Phase Space"):
    """Plot phase space diagram (position vs velocity)"""
    setup_plot_style()
    
    plt.figure()
    plt.plot(positions, velocities, 'b-', alpha=0.7, linewidth=1.5)
    plt.scatter(positions[0], velocities[0], c='green', s=100, label='Start', zorder=5)
    plt.scatter(positions[-1], velocities[-1], c='red', s=100, label='End', zorder=5)
    plt.xlabel('Position')
    plt.ylabel('Velocity')
    plt.title(title)
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.show()


def plot_vector_field(X: np.ndarray, Y: np.ndarray, U: np.ndarray, V: np.ndarray,
                      title: str = "Vector Field"):
    """Plot 2D vector field"""
    setup_plot_style()
    
    plt.figure()
    plt.quiver(X, Y, U, V, alpha=0.8)
    plt.xlabel('x')
    plt.ylabel('y')
    plt.title(title)
    plt.grid(True, alpha=0.3)
    plt.axis('equal')
    plt.show()


if __name__ == "__main__":
    # Demonstration
    print("Plotting utilities module")
    print("Import this module to use plotting functions in experiments")
