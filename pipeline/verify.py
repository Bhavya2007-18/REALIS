

from __future__ import annotations

import json
import sys


def verify_energy(json_path: str, tolerance: float = 1e-3) -> bool:
    
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