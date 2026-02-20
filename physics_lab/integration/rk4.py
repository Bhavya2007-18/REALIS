"""
Classical 4th-Order Runge–Kutta Integrator
==========================================

Same interface as ``physics_lab.integration.euler.forward_euler``
so the two can be swapped interchangeably in any simulation script.

    (t_array, y_array) = rk4(f, y0, t_span, dt)

No model-specific logic lives here.
"""

import numpy as np


def rk4(f, y0, t_span, dt):
    """
    Integrate dy/dt = f(t, y) with the classical RK4 method.

    Parameters
    ----------
    f : callable
        Derivative function  f(t, y) → array_like.
    y0 : array_like
        Initial state vector.
    t_span : (float, float)
        ``(t_start, t_end)``.
    dt : float
        Fixed time step.

    Returns
    -------
    t : np.ndarray, shape (N+1,)
        Time samples.
    y : np.ndarray, shape (N+1, len(y0))
        State at each time sample.

    Notes
    -----
    The method is **4th-order accurate** (local error O(dt⁵), global
    error O(dt⁴)).  Compared to Forward Euler (1st-order), halving dt
    reduces the global error by a factor of 16 instead of 2.
    """
    t_start, t_end = t_span
    num_steps = int((t_end - t_start) / dt)

    t = np.zeros(num_steps + 1)
    y = np.zeros((num_steps + 1, len(y0)))

    t[0] = t_start
    y[0] = y0

    for i in range(num_steps):
        ti = t[i]
        yi = y[i]

        k1 = np.asarray(f(ti,            yi),            dtype=float)
        k2 = np.asarray(f(ti + 0.5 * dt, yi + 0.5 * dt * k1), dtype=float)
        k3 = np.asarray(f(ti + 0.5 * dt, yi + 0.5 * dt * k2), dtype=float)
        k4 = np.asarray(f(ti + dt,       yi + dt * k3),        dtype=float)

        y[i + 1] = yi + (dt / 6.0) * (k1 + 2 * k2 + 2 * k3 + k4)
        t[i + 1] = t_start + (i + 1) * dt

    return t, y
