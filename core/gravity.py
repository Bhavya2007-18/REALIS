

from __future__ import annotations


class UniformGravityField:
    

    
    
    

    def __init__(self, g: float) -> None:
        if not isinstance(g, (int, float)):
            raise TypeError(
                f"Gravitational acceleration must be a real number, got {type(g).__name__}"
            )
        if g < 0:
            raise ValueError(
                f"Gravitational acceleration must be non-negative, got {g}"
            )
        self._g: float = float(g)

    
    
    

    @property
    def g(self) -> float:
        
        return self._g

    def force(self, mass: float, position: float = 0.0) -> float:
        
        self._validate_mass(mass)
        if not isinstance(position, (int, float)):
            raise TypeError(
                f"Position must be a real number, got {type(position).__name__}"
            )
        return -mass * self._g

    def potential_energy(self, mass: float, height: float) -> float:
        
        self._validate_mass(mass)
        if not isinstance(height, (int, float)):
            raise TypeError(
                f"Height must be a real number, got {type(height).__name__}"
            )
        return mass * self._g * float(height)

    
    
    

    @staticmethod
    def _validate_mass(mass: float) -> None:
        
        if not isinstance(mass, (int, float)):
            raise TypeError(
                f"Mass must be a real number, got {type(mass).__name__}"
            )
        if mass < 0:
            raise ValueError(f"Mass must be non-negative, got {mass}")

    
    
    

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(g={self._g!r})"

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, UniformGravityField):
            return NotImplemented
        return self._g == other._g