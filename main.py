from interface.cli import start_cli

if __name__ == "__main__":
    start_cli()

from solvers.euler import step as euler_step
from solvers.rk4 import step as rk4_step
from models.mass_springs import derivatives

def energy(x, v, k, m):
    return 0.5 * m * v**2 + 0.5 * k * x**2

params = (10.0, 1.0)
dt = 0.01
steps = 2000

# Euler
state = (1.0, 0.0)
t = 0.0
euler_energy = []

for _ in range(steps):
    x, v = state
    euler_energy.append(energy(x, v, *params))
    state = euler_step(state, t, dt, derivatives, params)
    t += dt

# RK4
state = (1.0, 0.0)
t = 0.0
rk4_energy = []

for _ in range(steps):
    x, v = state
    rk4_energy.append(energy(x, v, *params))
    state = rk4_step(state, t, dt, derivatives, params)
    t += dt

print("Final Euler state:", state)
