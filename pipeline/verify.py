"""
pipeline/verify.py -- Energy Verification Gate
===============================================

Loads an exported JSON file and checks whether total mechanical energy
was conserved within a specified tolerance.

If the gate fails, no downstream visualization should proceed.

Tolerance Justification
-----------------------
Default tolerance = 1e-3 (absolute, in energy units).

For a harmonic oscillator with E(0) = 5 J:
  - RK4 at dt=0.01 produces drift ~ 1e-14 J  (machine epsilon)
  - Forward Euler at dt=0.01 over 1000 steps drifts ~ 0.05 J

The tolerance 1e-3 is chosen to:
  1. Pass any well-behaved solver (RK4, Verlet, symplectic Euler).
  2. Catch gross physics violations or implementation bugs.
  3. Be tight enough that significant energy non-conservation is flagged.

No physics computation happens here -- only reading exported values.
"""

from __future__ import annotations

import json
import sys


def verify_energy(json_path: str, tolerance: float = 1e-3) -> bool:
    """Check energy conservation in an exported simulation file.

    Parameters
    ----------
    json_path : str
        Path to the JSON file produced by ``pipeline.export``.
    tolerance : float
        Maximum allowed absolute energy drift ``max(|E(t) - E(0)|)``.

    Returns
    -------
    bool
        ``True`` if drift <= tolerance (PASS), ``False`` otherwise.
    """
    with open(json_path, "r") as fp:
        data = json.load(fp)

    metadata = data["metadata"]
    history = data["history"]

    if len(history) == 0:
        print("ERROR: History is empty.")
        return False

    E0 = history[0]["E"]
    max_drift = 0.0

    for entry in history:
        drift = abs(entry["E"] - E0)
        if drift > max_drift:
            max_drift = drift

    solver = metadata["solver"]
    dt = metadata["dt"]
    model = metadata["model"]

    print(f"--- Verification Gate ---")
    print(f"  Model  : {model}")
    print(f"  Solver : {solver}")
    print(f"  dt     : {dt}")
    print(f"  E(0)   : {E0:.6f}")
    print(f"  Max |E(t) - E(0)| : {max_drift:.6e}")
    print(f"  Tolerance          : {tolerance:.6e}")

    if max_drift > tolerance:
        print(f"  RESULT : FAIL")
        print(f"  Verification Failed. Visualization Aborted.")
        return False

    print(f"  RESULT : PASS")
    return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m pipeline.verify <json_path> [tolerance]")
        sys.exit(1)
    path = sys.argv[1]
    tol = float(sys.argv[2]) if len(sys.argv) > 2 else 1e-3
    ok = verify_energy(path, tol)
    sys.exit(0 if ok else 1)
