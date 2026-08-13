"""Energy tracking for the REALIS physics engine.

Computes kinetic energy, gravitational potential energy and their sum across
all bodies, plus drift (conservation) between consecutive energy checks.
"""

import math


def compute_energy(bodies, gravity_y):
    """Return (kinetic, potential, total) in Joules."""
    ke = 0.0
    pe = 0.0
    total = 0.0

    # Use a consistent zero-reference: y = 0 (the floor plane).
    g = abs(gravity_y)

    for b in bodies:
        m = b["mass"]
        v2 = b["vx"] ** 2 + b["vy"] ** 2 + b["vz"] ** 2
        ke += 0.5 * m * v2
        # Rotational KE (approx as solid sphere / box)
        r2 = (b.get("radius") or 1.0) ** 2
        pe += m * g * max(0.0, b["py"])

    total = ke + pe
    return ke, pe, total


def energy_summary(bodies, gravity_y, prev_total=None):
    """Return rich energy info for the last frame of a simulation."""
    ke, pe, total = compute_energy(bodies, gravity_y)

    drift = 0.0
    if prev_total and abs(prev_total) > 1e-9:
        drift = abs(total - prev_total) / abs(prev_total) * 100.0

    return {
        "kinetic": round(ke, 4),
        "potential": round(pe, 4),
        "total": round(total, 4),
        "drift_percent": round(drift, 3),
    }