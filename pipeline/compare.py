

from __future__ import annotations

import os
import sys

import numpy as np

_project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from models.mass_spring_1d import MassSpring1D
from physics_lab.integration.euler import forward_euler
from physics_lab.integration.rk4 import rk4
from pipeline.export import run_and_export
from pipeline.verify import verify_energy
from visualization.plot_results import plot_from_json





MASS = 1.0           
STIFFNESS = 10.0     
X0 = 1.0             
V0 = 0.0             
T_SPAN = (0.0, 10.0) 
DT = 0.01            
TOLERANCE = 1e-3     
OUTPUT_DIR = os.path.join(_project_root, "output")

SOLVERS = [
    (forward_euler, "Forward Euler"),
    (rk4,           "RK4"),
]


def main():
    model = MassSpring1D(mass=MASS, stiffness=STIFFNESS)
    y0 = np.array([X0, V0])

    print("=" * 60)
    print("  REALIS Pipeline: Simulation -> Export -> Verify -> Plot")
    print("=" * 60)
    print(f"  Model     : {model}")
    print(f"  t_span    : {T_SPAN}")
    print(f"  dt        : {DT}")
    print(f"  Tolerance : {TOLERANCE}")
    print()

    json_paths = {}
    verification_results = {}

    
    for solver_fn, solver_name in SOLVERS:
        tag = solver_name.replace(" ", "_").lower()
        json_path = os.path.join(OUTPUT_DIR, f"{tag}_mass_spring.json")

        print(f">>> Running {solver_name} ...")
        path = run_and_export(
            model=model,
            solver=solver_fn,
            solver_name=solver_name,
            dt=DT,
            t_span=T_SPAN,
            y0=y0,
            output_path=json_path,
        )
        print(f"    Exported: {path}")
        json_paths[solver_name] = path
        print()

        passed = verify_energy(path, TOLERANCE)
        verification_results[solver_name] = passed
        print()

    
    for solver_fn, solver_name in SOLVERS:
        if verification_results.get(solver_name, False):
            print(f">>> Generating plots for {solver_name} ...")
            plot_from_json(json_paths[solver_name], OUTPUT_DIR)
            print()
        else:
            print(f">>> Skipping plots for {solver_name} (verification FAILED).")
            print()

    
    print("=" * 60)
    print("  SOLVER COMPARISON")
    print("=" * 60)

    import json

    records = {}
    for solver_fn, solver_name in SOLVERS:
        with open(json_paths[solver_name], "r") as fp:
            data = json.load(fp)
        history = data["history"]
        E0 = history[0]["E"]
        max_drift = max(abs(h["E"] - E0) for h in history)
        final_x = history[-1]["x"]
        final_v = history[-1]["v"]
        records[solver_name] = {
            "max_drift": max_drift,
            "final_x": final_x,
            "final_v": final_v,
            "E0": E0,
            "E_final": history[-1]["E"],
        }

    
    print(f"\n{'Solver':<18s} {'Max |dE| (J)':>16s} {'E(0) (J)':>12s} {'E(end) (J)':>12s} {'Verified':>10s}")
    print("-" * 72)
    for solver_fn, solver_name in SOLVERS:
        r = records[solver_name]
        v = "PASS" if verification_results[solver_name] else "FAIL"
        print(
            f"{solver_name:<18s} {r['max_drift']:16.6e} "
            f"{r['E0']:12.6f} {r['E_final']:12.6f} {v:>10s}"
        )

    
    if len(records) == 2:
        names = [name for _, name in SOLVERS]
        dx = abs(records[names[0]]["final_x"] - records[names[1]]["final_x"])
        dv = abs(records[names[0]]["final_v"] - records[names[1]]["final_v"])
        print(f"\nTrajectory difference at t = {T_SPAN[1]}:")
        print(f"  |x_euler - x_rk4| = {dx:.6e}")
        print(f"  |v_euler - v_rk4| = {dv:.6e}")

    
    print()


if __name__ == "__main__":
    main()