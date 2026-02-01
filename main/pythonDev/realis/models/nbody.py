import numpy as np

class NBody1D:
    """
    System of N hard spheres in 1D.
    No springs/forces by default (Ballistic), applied gravity.
    Collisions are handled by the separate event loop, NOT the derivatives.
    
    State: [x1, v1, x2, v2, ... xN, vN]
    """
    def __init__(self, masses, positions, radius=0.1, restitution=1.0):
        self.masses = np.array(masses, dtype=float)
        self.positions = np.array(positions, dtype=float)
        self.radius = radius
        self.e = restitution
        self.g = 0.0 # Standard ballistic, or 9.81? Let's say 0 for collision tests.
        self.system_type = "nbody_1d"
        
        self.n = len(self.masses)
        
        # Validate sorting
        if not np.all(np.diff(self.positions) >= 2*radius):
             print("Warning: Initial positions overlap or are too close.")

    def derivatives(self, state, t, params=None):
        # State vector size 2*N
        # Derivatives: dx/dt = v, dv/dt = 0 (or g)
        dydt = np.zeros_like(state)
        
        for i in range(self.n):
            # x_i = state[2*i]
            v_i = state[2*i+1]
            
            dydt[2*i] = v_i      # dx/dt = v
            dydt[2*i+1] = self.g # dv/dt = g
            
        return dydt

    def total_energy(self, state):
        ke = 0.0
        pe = 0.0
        for i in range(self.n):
            v = state[2*i+1]
            x = state[2*i]
            ke += 0.5 * self.masses[i] * v**2
            pe += self.masses[i] * (-self.g * x) # Standard gravity PE
        return ke + pe
    
    def get_particles(self, state):
        """Helper to extract (m, x, v, r) tuples for collision detection."""
        particles = []
        for i in range(self.n):
            particles.append({
                "id": i,
                "m": self.masses[i],
                "x": state[2*i],
                "v": state[2*i+1],
                "r": self.radius
            })
        return particles
