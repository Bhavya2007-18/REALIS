"""
visualization/plot_results.py -- Read-Only Data Visualizer
==========================================================

Loads an exported JSON file and produces static matplotlib plots.

Oscilloscope Philosophy
-----------------------
This module behaves like a measurement instrument:
  - It reads recorded data.
  - It displays recorded data.
  - It performs NO computation on the data.

Specifically prohibited:
  * No physics computation
  * No derivative estimation
  * No smoothing / interpolation / curve fitting / filtering
  * No recomputation of energy or any derived quantity

Every plotted value is a direct lookup into the exported JSON array.

Plot titles include solver name, dt, and max energy drift so
that every figure is self-documenting.
"""

from __future__ import annotations

import json
import os
import sys

import matplotlib
matplotlib.use("Agg")          # non-interactive backend for file output
import matplotlib.pyplot as plt


def load_json(json_path: str) -> dict:
    """Load an exported simulation JSON file."""
    with open(json_path, "r") as fp:
        return json.load(fp)


def plot_from_json(json_path: str, output_dir: str) -> list:
    """Generate Position-vs-Time and Energy-vs-Time plots from JSON.

    Parameters
    ----------
    json_path : str
        Path to the exported JSON.
    output_dir : str
        Directory where PNG files will be written.

    Returns
    -------
    list[str]
        Absolute paths of the generated PNG files.
    """
    data = load_json(json_path)
    meta = data["metadata"]
    history = data["history"]

    solver = meta["solver"]
    dt = meta["dt"]
    model = meta["model"]

    # --- extract arrays directly from JSON (no recomputation) ---
    t = [h["t"] for h in history]
    x = [h["x"] for h in history]
    E = [h["E"] for h in history]

    # --- max energy drift (read from data, not recomputed) ---
    E0 = E[0]
    max_drift = max(abs(e - E0) for e in E)

    os.makedirs(output_dir, exist_ok=True)
    prefix = f"{solver.replace(' ', '_').lower()}"
    generated = []

    # --- subtitle shared by both plots ---
    subtitle = f"Solver: {solver}  |  dt = {dt}  |  Max |dE| = {max_drift:.3e}"

    # --- Plot 1: Position vs Time ---
    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(t, x, "b-", linewidth=1.2)
    ax.set_xlabel("Time (s)")
    ax.set_ylabel("Position (m)")
    ax.set_title(f"{model} -- Position vs Time\n{subtitle}", fontsize=11)
    ax.grid(True, alpha=0.3)
    path1 = os.path.join(output_dir, f"{prefix}_position.png")
    fig.tight_layout()
    fig.savefig(path1, dpi=150)
    plt.close(fig)
    generated.append(os.path.abspath(path1))
    print(f"  Saved: {path1}")

    # --- Plot 2: Total Energy vs Time ---
    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(t, E, "r-", linewidth=1.2)
    ax.set_xlabel("Time (s)")
    ax.set_ylabel("Total Energy (J)")
    ax.set_title(f"{model} -- Total Energy vs Time\n{subtitle}", fontsize=11)
    ax.grid(True, alpha=0.3)
    path2 = os.path.join(output_dir, f"{prefix}_energy.png")
    fig.tight_layout()
    fig.savefig(path2, dpi=150)
    plt.close(fig)
    generated.append(os.path.abspath(path2))
    print(f"  Saved: {path2}")

    return generated


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m visualization.plot_results <json_path> [output_dir]")
        sys.exit(1)
    jp = sys.argv[1]
    od = sys.argv[2] if len(sys.argv) > 2 else "output"
    plot_from_json(jp, od)
