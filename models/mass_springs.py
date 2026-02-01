class DampedOscillator:
    def __init__(self, k=10.0, m=1.0, c=0.0):
        self.k = k
        self.m = m
        self.c = c
        self.system_type = "mass_spring_1d"

    def derivatives(self, state, t, params=None):
        x, v = state
        
        # F_spring = -k * x
        # F_damping = -c * v
        force = -self.k * x - self.c * v
        acc = force / self.m
        
        return v, acc

    def total_energy(self, state):
        x, v = state
        ke = 0.5 * self.m * v**2
        pe = 0.5 * self.k * x**2
        return ke + pe

# Legacy functional wrapper for backward compatibility or replace
def derivatives(state, t, params):  
    # Assuming params = (k, m) or (k, m, c)
    if len(params) == 2:
        k, m = params
        c = 0.0
    else:
        k, m, c = params
        
    obj = DampedOscillator(k, m, c)
    return obj.derivatives(state, t)
