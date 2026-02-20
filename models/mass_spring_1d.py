"""
models/mass_spring_1d.py -- 1-D Mass-Spring Oscillator
======================================================

A minimal, solver-agnostic model for a single mass on a linear spring.

Equations of Motion (state-space form)
--------------------------------------
State vector:  q = [x, v]

    dx/dt = v                      (kinematic identity)
    dv/dt = -(k / m) * x           (Hooke's law / Newton II)

where k is the spring stiffness and m is the mass.

Energy
------
    KE = 0.5 * m * v^2             (kinetic)
    PE = 0.5 * k * x^2             (elastic potential)
    E  = KE + PE                   (total -- conserved exactly)

The system is conservative: total mechanical energy is an exact
invariant of the continuous dynamics.

Constraints
-----------
* No solver / integration / simulation-loop logic.
* No hidden constants -- k and m are supplied by the caller.
* Derivatives are independent of timestep.
"""

from __future__ import annotations
from typing import Tuple

State1D = Tuple[float, float]


class MassSpring1D:
    """A 1-D mass-spring oscillator (Hooke's law).

    Parameters
    ----------
    mass : float
        Body mass (must be positive).
    stiffness : float
        Spring constant k (must be positive).
    """

    def __init__(self, mass: float, stiffness: float) -> None:
        if not isinstance(mass, (int, float)) or mass <= 0:
            raise ValueError(f"mass must be a positive number, got {mass}")
        if not isinstance(stiffness, (int, float)) or stiffness <= 0:
            raise ValueError(f"stiffness must be a positive number, got {stiffness}")
        self._mass = float(mass)
        self._stiffness = float(stiffness)

    # -- read-only properties ------------------------------------------

    @property
    def mass(self) -> float:
        return self._mass

    @property
    def stiffness(self) -> float:
        return self._stiffness

    # -- equations of motion -------------------------------------------

    def derivatives(self, state: State1D, t: float) -> State1D:
        """Return (dx/dt, dv/dt) for the given state.

        dx/dt = v
        dv/dt = -(k / m) * x

        Parameters
        ----------
        state : (float, float)
            Current (position, velocity).
        t : float
            Current time (unused -- autonomous system).

        Returns
        -------
        (float, float)
            State derivatives.
        """
        x, v = state
        dx_dt = v
        dv_dt = -(self._stiffness / self._mass) * x
        return (dx_dt, dv_dt)

    # -- energy (invariant framework) ----------------------------------

    def kinetic_energy(self, state: State1D) -> float:
        """KE = 0.5 * m * v^2"""
        _, v = state
        return 0.5 * self._mass * v * v

    def potential_energy(self, state: State1D) -> float:
        """PE = 0.5 * k * x^2"""
        x, _ = state
        return 0.5 * self._stiffness * x * x

    def total_energy(self, state: State1D) -> float:
        """E = KE + PE  (conserved invariant)."""
        return self.kinetic_energy(state) + self.potential_energy(state)

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}("
            f"mass={self._mass}, stiffness={self._stiffness})"
        )
