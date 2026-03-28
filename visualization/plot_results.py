

from __future__ import annotations

import json
import os
import sys

import matplotlib
matplotlib.use("Agg")          
import matplotlib.pyplot as plt


def load_json(json_path: str) -> dict:
    
    with open(json_path, "r") as fp:
        return json.load(fp)


def plot_from_json(json_path: str, output_dir: str) -> list:
    
    data = load_json(json_path)
    meta = data["metadata"]
    history = data["history"]

    solver = meta["solver"]
    dt = meta["dt"]
    model = meta["model"]

    
    t = [h["t"] for h in history]
    x = [h["x"] for h in history]
    E = [h["E"] for h in history]

    
    E0 = E[0]
    max_drift = max(abs(e - E0) for e in E)

    os.makedirs(output_dir, exist_ok=True)
    prefix = f"{solver.replace(' ', '_').lower()}"
    generated = []

    
    subtitle = f"Solver: {solver}  |  dt = {dt}  |  Max |dE| = {max_drift:.3e}"

    
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