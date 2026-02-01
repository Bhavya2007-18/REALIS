import numpy as np

def step(state, t, dt, derivs, params):
    """
    Runge-Kutta 4th Order Integration Step.
    Vectorized for arbitrary state dimension.
    """
    # Ensure state is a numpy array for vector math
    y = np.array(state, dtype=float)
    
    # K1
    k1 = np.array(derivs(y, t, params))
    
    # K2
    k2 = np.array(derivs(y + 0.5 * dt * k1, t + 0.5 * dt, params))
    
    # K3
    k3 = np.array(derivs(y + 0.5 * dt * k2, t + 0.5 * dt, params))
    
    # K4
    k4 = np.array(derivs(y + dt * k3, t + dt, params))
    
    # Combine
    y_next = y + (dt / 6.0) * (k1 + 2*k2 + 2*k3 + k4)
    
    return y_next
