# euler integration solver
def step(state, t, dt, derivs, params):
    dx, dv = derivs(state, t, params)
    x, v = state
    return x + dx * dt, v + dv * dt
