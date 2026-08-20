

from __future__ import annotations

import json
import os
import sys
from typing import Callable, Tuple

import numpy as np

_project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)


def run_and_export(
    model,
    solver: Callable,
    solver_name: str,
    dt: float,
    t_span: Tuple[float, float],
    y0: np.ndarray,
    output_path: str,
) -> str:
    
    
    def f(t, y):
        dx, dv = model.derivatives((y[0], y[1]), t)
        return np.array([dx, dv])

    
    t_arr, y_arr = solver(f, y0, t_span, dt)

    
    history = []
    for i in range(len(t_arr)):
        state = (float(y_arr[i, 0]), float(y_arr[i, 1]))
        history.append({
            "t": float(t_arr[i]),
            "x": state[0],
            "v": state[1],
            "E": float(model.total_energy(state)),
        })

    
    parameters = {}
    if hasattr(model, "mass"):
        parameters["mass"] = model.mass
    if hasattr(model, "stiffness"):
        parameters["stiffness"] = model.stiffness

    payload = {
        "metadata": {
            "model": type(model).__name__,
            "solver": solver_name,
            "dt": dt,
            "parameters": parameters,
        },
        "history": history,
    }

    
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w") as fp:
        json.dump(payload, fp, indent=2)

    return os.path.abspath(output_path)