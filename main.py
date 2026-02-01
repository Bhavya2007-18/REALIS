import sys
import numpy as np
from interface.runner import run_simulation

def main():
    print("========================================")
    print("   REALIS PHYSICS SCENARIO RUNNER       ")
    print("========================================")
    
    # 1. Damped Oscillator
    print("Running Damped Oscillator...")
    run_simulation({
        "model": "mass_spring",
        "params": {"k": 10.0, "m": 1.0, "c": 0.5},
        "state0": [2.0, 0.0],
        "dt": 0.02,
        "steps": 500
    })
    
    # 2. Simple Pendulum
    print("Running Simple Pendulum...")
    run_simulation({
        "model": "simple_pendulum",
        "params": {"length": 1.0, "mass": 1.0},
        "state0": [np.pi/1.5, 0.0],
        "dt": 0.02,
        "steps": 500
    })
    
    # 3. Double Pendulum
    print("Running Double Pendulum...")
    run_simulation({
        "model": "double_pendulum",
        "params": {"L1": 1.0, "L2": 1.0, "m1": 1.0, "m2": 1.0},
        "state0": [np.pi/2, np.pi/2, 0.0, 0.0],
        "dt": 0.01,
        "steps": 2000
    })
    
    # 4. Rolling Disk
    print("Running Rolling Disk...")
    run_simulation({
        "model": "rolling_disk",
        "params": {"mass": 2.0, "radius": 0.5, "theta": np.pi/6},
        "state0": [0.0, 0.0],
        "dt": 0.02,
        "steps": 300
    })

if __name__ == "__main__":
    main()
