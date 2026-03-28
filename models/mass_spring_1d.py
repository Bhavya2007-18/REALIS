

from __future__ import annotations
from typing import Tuple

State1D = Tuple[float, float]


class MassSpring1D:
    

    def __init__(self, mass: float, stiffness: float) -> None:
        if not isinstance(mass, (int, float)) or mass <= 0:
            raise ValueError(f"mass must be a positive number, got {mass}")
        if not isinstance(stiffness, (int, float)) or stiffness <= 0:
            raise ValueError(f"stiffness must be a positive number, got {stiffness}")
        self._mass = float(mass)
        self._stiffness = float(stiffness)

    

    @property
    def mass(self) -> float:
        return self._mass

    @property
    def stiffness(self) -> float:
        return self._stiffness

    

    def derivatives(self, state: State1D, t: float) -> State1D:
        
        x, v = state
        dx_dt = v
        dv_dt = -(self._stiffness / self._mass) * x
        return (dx_dt, dv_dt)

    

    def kinetic_energy(self, state: State1D) -> float:
        
        _, v = state
        return 0.5 * self._mass * v * v

    def potential_energy(self, state: State1D) -> float:
        
        x, _ = state
        return 0.5 * self._stiffness * x * x

    def total_energy(self, state: State1D) -> float:
        
        return self.kinetic_energy(state) + self.potential_energy(state)

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}("
            f"mass={self._mass}, stiffness={self._stiffness})"
        )