"""
Unit System and Dimensional Analysis

Define standard units and conversions for physics calculations.
"""

from enum import Enum
from typing import Dict


class Unit(Enum):
    """SI base units"""
    METER = "m"
    KILOGRAM = "kg"
    SECOND = "s"
    NEWTON = "N"
    JOULE = "J"


class PhysicsConstants:
    """Physical constants in SI units"""
    G = 6.67430e-11  # Gravitational constant [m^3 kg^-1 s^-2]
    g = 9.80665      # Standard gravity [m s^-2]
    c = 299792458    # Speed of light [m s^-1]
    k_B = 1.380649e-23  # Boltzmann constant [J K^-1]


class UnitConverter:
    """Convert between different unit systems"""
    
    # Length conversions to meters
    LENGTH_TO_METERS: Dict[str, float] = {
        "m": 1.0,
        "cm": 0.01,
        "mm": 0.001,
        "km": 1000.0,
        "in": 0.0254,
        "ft": 0.3048,
    }
    
    # Mass conversions to kilograms
    MASS_TO_KG: Dict[str, float] = {
        "kg": 1.0,
        "g": 0.001,
        "mg": 1e-6,
        "lb": 0.453592,
    }
    
    # Time conversions to seconds
    TIME_TO_SECONDS: Dict[str, float] = {
        "s": 1.0,
        "ms": 0.001,
        "us": 1e-6,
        "min": 60.0,
        "hr": 3600.0,
    }
    
    @staticmethod
    def length(value: float, from_unit: str) -> float:
        """Convert length to meters"""
        return value * UnitConverter.LENGTH_TO_METERS[from_unit]
    
    @staticmethod
    def mass(value: float, from_unit: str) -> float:
        """Convert mass to kilograms"""
        return value * UnitConverter.MASS_TO_KG[from_unit]
    
    @staticmethod
    def time(value: float, from_unit: str) -> float:
        """Convert time to seconds"""
        return value * UnitConverter.TIME_TO_SECONDS[from_unit]


class Quantity:
    """Physical quantity with units"""
    
    def __init__(self, value: float, unit: str):
        self.value = value
        self.unit = unit
    
    def __repr__(self):
        return f"{self.value} {self.unit}"
    
    def to_si(self) -> float:
        """Convert to SI base units"""
        if self.unit in UnitConverter.LENGTH_TO_METERS:
            return UnitConverter.length(self.value, self.unit)
        elif self.unit in UnitConverter.MASS_TO_KG:
            return UnitConverter.mass(self.value, self.unit)
        elif self.unit in UnitConverter.TIME_TO_SECONDS:
            return UnitConverter.time(self.value, self.unit)
        else:
            return self.value


def demonstrate_units():
    """Demonstrate unit conversions"""
    print("=== Unit System Demonstration ===\n")
    
    # Physical constants
    print("Physical Constants:")
    print(f"Gravitational constant G = {PhysicsConstants.G} m³ kg⁻¹ s⁻²")
    print(f"Standard gravity g = {PhysicsConstants.g} m s⁻²")
    print(f"Speed of light c = {PhysicsConstants.c} m s⁻¹\n")
    
    # Length conversions
    print("Length Conversions:")
    distances = [
        Quantity(100, "cm"),
        Quantity(5, "ft"),
        Quantity(2.5, "km"),
    ]
    for dist in distances:
        print(f"{dist} = {dist.to_si():.3f} m")
    print()
    
    # Mass conversions
    print("Mass Conversions:")
    masses = [
        Quantity(500, "g"),
        Quantity(10, "lb"),
        Quantity(2000, "mg"),
    ]
    for m in masses:
        print(f"{m} = {m.to_si():.3f} kg")
    print()
    
    # Time conversions
    print("Time Conversions:")
    times = [
        Quantity(500, "ms"),
        Quantity(2, "min"),
        Quantity(0.5, "hr"),
    ]
    for t in times:
        print(f"{t} = {t.to_si():.3f} s")
    print()
    
    # Dimensional analysis example
    print("Dimensional Analysis:")
    print("Calculating kinetic energy: KE = 0.5 * m * v²")
    m = Quantity(2, "kg")
    v = 10  # m/s
    KE = 0.5 * m.to_si() * v**2
    print(f"Mass: {m}")
    print(f"Velocity: {v} m/s")
    print(f"Kinetic Energy: {KE} J")
    print(f"Units check: [kg] * [m/s]² = [kg⋅m²/s²] = [J] ✓\n")


if __name__ == "__main__":
    demonstrate_units()
