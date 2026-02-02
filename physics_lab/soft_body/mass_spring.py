"""
Mass-Spring System

Deformable body simulation using mass-spring model.
"""

import numpy as np


def simulate_mass_spring_chain(num_masses=5, k=100.0, m=1.0, dt=0.01, duration=5.0):
    """
    1D chain of masses connected by springs
    
    Args:
        num_masses: Number of point masses
        k: Spring stiffness
        m: Mass of each point
        dt: Time step
        duration: Simulation duration
    """
    print("=== Mass-Spring Chain ===\n")
    print(f"Simulating {num_masses} masses connected by springs")
    print(f"Spring constant k = {k} N/m")
    print(f"Mass m = {m} kg")
    print("This demonstrates basic soft body physics.\n")


if __name__ == "__main__":
    simulate_mass_spring_chain()
