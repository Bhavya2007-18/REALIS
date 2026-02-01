def step(state, t, dt, derivs, params):
    x, v = state

    k1x, k1v = derivs((x, v), t, params)
    k2x, k2v = derivs((x + 0.5 * dt * k1x,
                       v + 0.5 * dt * k1v), t + 0.5 * dt, params)
    k3x, k3v = derivs((x + 0.5 * dt * k2x,
                       v + 0.5 * dt * k2v), t + 0.5 * dt, params)
    k4x, k4v = derivs((x + dt * k3x,
                       v + dt * k3v), t + dt, params)

    x_next = x + (dt / 6.0) * (k1x + 2*k2x + 2*k3x + k4x)
    v_next = v + (dt / 6.0) * (k1v + 2*k2v + 2*k3v + k4v)

    return x_next, v_next
