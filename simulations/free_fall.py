"""
simulations/free_fall.py — Free-Fall Simulation & Verification
==============================================================

Drives `RigidBody1D` with both Forward Euler and RK4, collects raw data,
and performs three verification checks:

1. **Energy conservation** — max |E(t) − E(0)| / |E(0)|  (drift)
2. **Analytical comparison** — L2 norm vs  x(t) = x₀ + v₀t − ½gt²
3. **Convergence test** — error reduction when dt is halved

No solver logic, gravity logic, or model logic lives in this file.
"""

import sys
import os
import numpy as np

# ---------- path setup so imports work from project root ----------
_project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from core.gravity import UniformGravityField
from models.rigid_body_1d import RigidBody1D
from physics_lab.integration.euler import forward_euler
from physics_lab.integration.rk4 import rk4

# =====================================================================
# Configuration — no hidden constants
# =====================================================================
G = 9.81                   # m/s²  (explicit, not hidden)
MASS = 2.0                 # kg
X0 = 10.0                  # m     initial height
V0 = 0.0                   # m/s   initial velocity
T_SPAN = (0.0, 2.0)        # s
DT_VALUES = [0.01, 0.005]  # for convergence test


# =====================================================================
# Helpers
# =====================================================================

def analytical_position(t: np.ndarray) -> np.ndarray:
    """x(t) = x₀ + v₀·t − ½·g·t²"""
    return X0 + V0 * t - 0.5 * G * t * t


def analytical_velocity(t: np.ndarray) -> np.ndarray:
    """v(t) = v₀ − g·t"""
    return V0 - G * t


def l2_error(numerical: np.ndarray, exact: np.ndarray) -> float:
    """Normalised L2 error:  ‖num − exact‖₂ / ‖exact‖₂"""
    diff_norm = np.linalg.norm(numerical - exact)
    exact_norm = np.linalg.norm(exact)
    if exact_norm == 0:
        return diff_norm
    return diff_norm / exact_norm


# =====================================================================
# Run one simulation
# =====================================================================

def run_simulation(integrator, integrator_name: str, dt: float):
    """
    Execute a free-fall simulation and return the raw data dict.

    Parameters
    ----------
    integrator : callable
        ``forward_euler`` or ``rk4`` — same (f, y0, t_span, dt) API.
    integrator_name : str
        Label for display.
    dt : float
        Time step.
    """
    # --- set up physics (no constants leak into solver) ---
    field = UniformGravityField(g=G)
    body = RigidBody1D(mass=MASS, gravity_field=field)

    # Wrap body.derivatives for the solver's f(t, y) interface.
    # The solver passes numpy arrays; the model expects tuples.
    def f(t, y):
        dx, dv = body.derivatives((y[0], y[1]), t)
        return np.array([dx, dv])

    y0 = np.array([X0, V0])
    t_arr, y_arr = integrator(f, y0, T_SPAN, dt)

    positions = y_arr[:, 0]
    velocities = y_arr[:, 1]

    # --- energy at every step ---
    energies = np.array([
        body.total_energy((positions[i], velocities[i]))
        for i in range(len(t_arr))
    ])

    # --- analytical solutions ---
    x_exact = analytical_position(t_arr)
    v_exact = analytical_velocity(t_arr)

    # --- metrics ---
    E0 = energies[0]
    energy_drift = (energies - E0) / abs(E0) * 100.0          # %
    max_drift_pct = np.max(np.abs(energy_drift))
    l2_pos = l2_error(positions, x_exact)
    l2_vel = l2_error(velocities, v_exact)

    return {
        "name":        integrator_name,
        "dt":          dt,
        "t":           t_arr,
        "x":           positions,
        "v":           velocities,
        "energy":      energies,
        "x_exact":     x_exact,
        "v_exact":     v_exact,
        "drift_pct":   energy_drift,
        "max_drift":   max_drift_pct,
        "l2_pos":      l2_pos,
        "l2_vel":      l2_vel,
    }


# =====================================================================
# Main
# =====================================================================

def main():
    integrators = [
        (forward_euler, "Forward Euler"),
        (rk4,           "RK4"),
    ]

    all_results = {}  # key = (name, dt)

    # ---------- run all combinations ----------
    for integ_fn, integ_name in integrators:
        for dt in DT_VALUES:
            res = run_simulation(integ_fn, integ_name, dt)
            all_results[(integ_name, dt)] = res

    # ============================================================
    #  1.  RAW DATA TABLES  (per dt)
    # ============================================================
    for dt in DT_VALUES:
        print("=" * 72)
        print(f"  dt = {dt}")
        print("=" * 72)
        for integ_fn, integ_name in integrators:
            res = all_results[(integ_name, dt)]
            t = res["t"]
            # print every 10th sample for readability
            step = max(1, len(t) // 20)
            print(f"\n--- {integ_name}  (dt={dt}) ---")
            print(f"{'t':>8s} {'x':>12s} {'v':>12s} {'E':>14s} {'drift%':>12s}")
            for i in range(0, len(t), step):
                print(
                    f"{t[i]:8.4f} {res['x'][i]:12.6f} {res['v'][i]:12.6f} "
                    f"{res['energy'][i]:14.6f} {res['drift_pct'][i]:12.6e}"
                )
            # always print last step
            i = len(t) - 1
            print(
                f"{t[i]:8.4f} {res['x'][i]:12.6f} {res['v'][i]:12.6f} "
                f"{res['energy'][i]:14.6f} {res['drift_pct'][i]:12.6e}"
            )

    # ============================================================
    #  2.  ENERGY DRIFT COMPARISON
    # ============================================================
    print("\n" + "=" * 72)
    print("  ENERGY DRIFT COMPARISON")
    print("=" * 72)
    print(f"{'Integrator':<18s} {'dt':>8s} {'Max |drift|%':>16s}")
    print("-" * 44)
    for integ_fn, integ_name in integrators:
        for dt in DT_VALUES:
            res = all_results[(integ_name, dt)]
            print(f"{integ_name:<18s} {dt:8.4f} {res['max_drift']:16.6e}")

    # ============================================================
    #  3.  ANALYTICAL ERROR (L2 norm)
    # ============================================================
    print("\n" + "=" * 72)
    print("  ANALYTICAL ERROR  (normalised L2)")
    print("=" * 72)
    print(f"{'Integrator':<18s} {'dt':>8s} {'L2(pos)':>14s} {'L2(vel)':>14s}")
    print("-" * 58)
    for integ_fn, integ_name in integrators:
        for dt in DT_VALUES:
            res = all_results[(integ_name, dt)]
            print(
                f"{integ_name:<18s} {dt:8.4f} "
                f"{res['l2_pos']:14.6e} {res['l2_vel']:14.6e}"
            )

    # ============================================================
    #  4.  CONVERGENCE TEST — error reduction when dt is halved
    # ============================================================
    print("\n" + "=" * 72)
    print("  CONVERGENCE TEST  (dt halved: 0.01 -> 0.005)")
    print("=" * 72)
    print(
        f"{'Integrator':<18s} {'L2(pos) coarse':>16s} {'L2(pos) fine':>16s} "
        f"{'Ratio':>8s} {'Expected':>10s}"
    )
    print("-" * 72)
    for integ_fn, integ_name in integrators:
        coarse = all_results[(integ_name, DT_VALUES[0])]
        fine   = all_results[(integ_name, DT_VALUES[1])]
        ratio  = coarse["l2_pos"] / fine["l2_pos"] if fine["l2_pos"] != 0 else float("inf")
        expected = 2 if integ_name == "Forward Euler" else 16
        print(
            f"{integ_name:<18s} {coarse['l2_pos']:16.6e} {fine['l2_pos']:16.6e} "
            f"{ratio:8.2f} {expected:10d}"
        )

    # ============================================================
    #  5.  STABILITY ANALYSIS SUMMARY
    # ============================================================
    print("\n" + "=" * 72)
    print("  SOLVER STABILITY ANALYSIS")
    print("=" * 72)
    print("""
Forward Euler (1st order)
  * Truncation error : O(dt)  global,  O(dt^2) local.
  * Energy behaviour : NON-SYMPLECTIC -- energy drifts monotonically.
    For free-fall (linear ODE) the drift is small, but for oscillatory
    systems Forward Euler is conditionally stable (dt < 2/w).
  * Convergence      : Halving dt halves the error  (ratio ~ 2).

RK4 (4th order)
  * Truncation error : O(dt^4) global,  O(dt^5) local.
  * Energy behaviour : Non-symplectic, but errors are O(dt^4) -- so
    small that energy drift is negligible for moderate simulations.
  * Convergence      : Halving dt reduces error by 2^4 = 16  (ratio ~ 16).

Key difference:
  For the same dt, RK4 is orders of magnitude more accurate than Euler.
  For long-time energy conservation, a symplectic method (Verlet /
  semi-implicit Euler) is preferred, but RK4 provides far better
  trajectory accuracy over finite time spans.
""")


if __name__ == "__main__":
    main()
