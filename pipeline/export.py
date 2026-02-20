"""
pipeline/export.py -- Deterministic Data Export
================================================

Runs a simulation and writes the raw solver output to a JSON file.

Contracts
---------
* Values are taken directly from the solver's output arrays.
* No interpolation, filtering, smoothing, or compression.
* The JSON is self-describing: metadata + per-timestep history.
* Data must be reproducible: same inputs -> identical JSON.
"""

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
    """Run a simulation and export the results to JSON.

    Parameters
    ----------
    model : object
        Must expose ``derivatives(state, t)`` and ``total_energy(state)``.
    solver : callable
        ``solver(f, y0, t_span, dt) -> (t_array, y_array)``.
    solver_name : str
        Human label, e.g. ``"Forward Euler"`` or ``"RK4"``.
    dt : float
        Fixed timestep.
    t_span : (float, float)
        ``(t_start, t_end)``.
    y0 : np.ndarray
        Initial state vector.
    output_path : str
        Destination JSON file path.

    Returns
    -------
    str
        Absolute path of the written JSON file.
    """
    # --- adapt model.derivatives for the solver's f(t, y) interface ---
    def f(t, y):
        dx, dv = model.derivatives((y[0], y[1]), t)
        return np.array([dx, dv])

    # --- run solver (no physics logic here) ---
    t_arr, y_arr = solver(f, y0, t_span, dt)

    # --- build history directly from solver arrays ---
    history = []
    for i in range(len(t_arr)):
        state = (float(y_arr[i, 0]), float(y_arr[i, 1]))
        history.append({
            "t": float(t_arr[i]),
            "x": state[0],
            "v": state[1],
            "E": float(model.total_energy(state)),
        })

    # --- build metadata ---
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

    # --- write JSON (no compression, no filtering) ---
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w") as fp:
        json.dump(payload, fp, indent=2)

    return os.path.abspath(output_path)
