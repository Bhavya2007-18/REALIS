import numpy as np

def step(state, t, dt, derivs, params):
    """
    Explicit Euler Integration Step.
    Vectorized for arbitrary state dimension.
    """
    y = np.array(state, dtype=float)
    dydt = np.array(derivs(y, t, params))
    
    y_next = y + dydt * dt
    return y_next
