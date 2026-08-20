

import sys
import os
import numpy as np


_project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from core.gravity import UniformGravityField
from models.rigid_body_1d import RigidBody1D
from physics_lab.integration.euler import forward_euler
from physics_lab.integration.rk4 import rk4




G = 9.81                   
MASS = 2.0                 
X0 = 10.0                  
V0 = 0.0                   
T_SPAN = (0.0, 2.0)        
DT_VALUES = [0.01, 0.005]  






def analytical_position(t: np.ndarray) -> np.ndarray:
    
    return X0 + V0 * t - 0.5 * G * t * t


def analytical_velocity(t: np.ndarray) -> np.ndarray:
    
    return V0 - G * t


def l2_error(numerical: np.ndarray, exact: np.ndarray) -> float:
    
    diff_norm = np.linalg.norm(numerical - exact)
    exact_norm = np.linalg.norm(exact)
    if exact_norm == 0:
        return diff_norm
    return diff_norm / exact_norm






def run_simulation(integrator, integrator_name: str, dt: float):
    
    
    field = UniformGravityField(g=G)
    body = RigidBody1D(mass=MASS, gravity_field=field)

    
    
    def f(t, y):
        dx, dv = body.derivatives((y[0], y[1]), t)
        return np.array([dx, dv])

    y0 = np.array([X0, V0])
    t_arr, y_arr = integrator(f, y0, T_SPAN, dt)

    
    positions = y_arr[:, 0]
    velocities = y_arr[:, 1]

    
    energies = np.array([
        body.total_energy((positions[i], velocities[i]))
        for i in range(len(t_arr))
    ])

    
    x_exact = analytical_position(t_arr)
    v_exact = analytical_velocity(t_arr)

    
    E0 = energies[0]
    energy_drift = (energies - E0) / abs(E0) * 100.0          
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






def main():
    integrators = [
        (forward_euler, "Forward Euler"),
        (rk4,           "RK4"),
    ]

    all_results = {}  

    
    for integ_fn, integ_name in integrators:
        for dt in DT_VALUES:
            res = run_simulation(integ_fn, integ_name, dt)
            all_results[(integ_name, dt)] = res

    
    
    
    for dt in DT_VALUES:
        print("=" * 72)
        print(f"  dt = {dt}")
        print("=" * 72)
        for integ_fn, integ_name in integrators:
            res = all_results[(integ_name, dt)]
            t = res["t"]
            
            step = max(1, len(t) // 20)
            print(f"\n--- {integ_name}  (dt={dt}) ---")
            print(f"{'t':>8s} {'x':>12s} {'v':>12s} {'E':>14s} {'drift%':>12s}")
            for i in range(0, len(t), step):
                print(
                    f"{t[i]:8.4f} {res['x'][i]:12.6f} {res['v'][i]:12.6f} "
                    f"{res['energy'][i]:14.6f} {res['drift_pct'][i]:12.6e}"
                )
            
            i = len(t) - 1
            print(
                f"{t[i]:8.4f} {res['x'][i]:12.6f} {res['v'][i]:12.6f} "
                f"{res['energy'][i]:14.6f} {res['drift_pct'][i]:12.6e}"
            )

    
    
    
    print("\n" + "=" * 72)
    print("  ENERGY DRIFT COMPARISON")
    print("=" * 72)
    print(f"{'Integrator':<18s} {'dt':>8s} {'Max |drift|%':>16s}")
    print("-" * 44)
    for integ_fn, integ_name in integrators:
        for dt in DT_VALUES:
            res = all_results[(integ_name, dt)]
            print(f"{integ_name:<18s} {dt:8.4f} {res['max_drift']:16.6e}")

    
    
    
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

    
    
    
    print("\n" + "=" * 72)
    print("  SOLVER STABILITY ANALYSIS")
    print("=" * 72)
    print()


if __name__ == "__main__":
    main()