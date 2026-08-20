"""REALIS physics engine — pure Python implementation (v0.2).

Provides a body-based simulation with:
  * gravity / point-gravity forces
  * dynamic-to-dynamic AABB collision with impulse resolution
  * distance constraints (Baumgarte stabilization)
  * hinge / point joints (pinned pivots)
  * energy tracking (KE, PE, total, drift)

The engine is deterministic: given the same input it produces the same frames.
"""

from .engine import simulate
from .collision import detect_collisions
from .constraints import solve_constraints
from .energy import compute_energy, energy_summary

__all__ = [
    "simulate",
    "detect_collisions",
    "solve_constraints",
    "compute_energy",
    "energy_summary",
]
