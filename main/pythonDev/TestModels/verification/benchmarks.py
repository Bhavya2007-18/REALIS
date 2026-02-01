import numpy as np

class HarmonicOscillator:
    """
    Standard 1D Harmonic Oscillator (Mass-Spring).
    
    Equations of Motion:
        F = -k * x
        a = F / m
        
    State: (x, v)
    Units: SI (kg, m, s)
    """
    def __init__(self, k: float, m: float):
        self.k = k
        self.m = m
        self.omega = np.sqrt(k / m)
        
    def derivatives(self, state, t, params=None):
        """
        Computes state derivatives [v, a].
        """
        x, v = state
        force = -self.k * x
        acc = force / self.m
        return v, acc
    
    def kinetic_energy(self, state):
        _, v = state
        return 0.5 * self.m * v**2
        
    def potential_energy(self, state):
        x, _ = state
        return 0.5 * self.k * x**2
        
    def total_energy(self, state):
        return self.kinetic_energy(state) + self.potential_energy(state)
        
    def exact_solution(self, t, state0):
        """
        Returns the analytical solution (x, v) at time t given initial state0.
        
        x(t) = x0*cos(wt) + (v0/w)*sin(wt)
        v(t) = -x0*w*sin(wt) + v0*cos(wt)
        """
        x0, v0 = state0
        w = self.omega
        
        cos_wt = np.cos(w * t)
        sin_wt = np.sin(w * t)
        
        x_t = x0 * cos_wt + (v0 / w) * sin_wt
        v_t = -x0 * w * sin_wt + v0 * cos_wt
        
        return x_t, v_t
