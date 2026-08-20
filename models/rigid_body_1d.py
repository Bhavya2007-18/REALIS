

from __future__ import annotations

from typing import Tuple


State1D = Tuple[float, float]


class RigidBody1D:
    

    
    
    

    def __init__(self, mass: float, gravity_field: object) -> None:
        
        if not isinstance(mass, (int, float)):
            raise TypeError(
                f"Mass must be a real number, got {type(mass).__name__}"
            )
        if mass <= 0:
            raise ValueError(f"Mass must be positive, got {mass}")

        
        if not callable(getattr(gravity_field, "force", None)):
            raise TypeError(
                "gravity_field must expose a callable 'force(mass)' method"
            )
        if not callable(getattr(gravity_field, "potential_energy", None)):
            raise TypeError(
                "gravity_field must expose a callable "
                "'potential_energy(mass, height)' method"
            )

        self._mass: float = float(mass)
        self._gravity_field = gravity_field

    
    
    

    @property
    def mass(self) -> float:
        
        return self._mass

    @property
    def gravity_field(self) -> object:
        
        return self._gravity_field

    
    
    

    def derivatives(self, state: State1D, t: float) -> State1D:
        
        position, velocity = state

        
        dx_dt: float = velocity

        
        force: float = self._gravity_field.force(self._mass, position)
        dv_dt: float = force / self._mass

        return (dx_dt, dv_dt)

    
    
    

    def kinetic_energy(self, state: State1D) -> float:
        
        _, velocity = state
        return 0.5 * self._mass * velocity * velocity

    def potential_energy(self, state: State1D) -> float:
        
        position, _ = state
        return self._gravity_field.potential_energy(self._mass, position)

    def total_energy(self, state: State1D) -> float:
        
        return self.kinetic_energy(state) + self.potential_energy(state)

    
    
    

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}("
            f"mass={self._mass!r}, "
            f"gravity_field={self._gravity_field!r})"
        )