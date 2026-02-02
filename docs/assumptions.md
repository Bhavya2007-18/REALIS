# Core Assumptions

## Coordinate Systems

### Right-Handed Coordinate System
REALIS uses a right-handed coordinate system:
- **X-axis**: Right
- **Y-axis**: Up
- **Z-axis**: Out of screen (toward viewer)

Rotations follow the right-hand rule.

### Euler Angles
- Order: XYZ (roll-pitch-yaw)
- Gimbal lock avoided by using quaternions internally

## Units

### SI Base Units
All calculations use **SI units**:
- Length: meters (m)
- Mass: kilograms (kg)
- Time: seconds (s)
- Force: newtons (N)
- Energy: joules (J)

### Physical Constants
- Gravitational constant: G = 6.67430×10⁻¹¹ m³ kg⁻¹ s⁻²
- Standard gravity: g = 9.80665 m/s²

## Numerical Precision

### Floating Point
- C++: `float` (32-bit) for performance
- Python: `float64` (64-bit) for validation
- Tolerance: ε = 1×10⁻⁶ for comparisons

### Time Stepping
- **Fixed timestep only**
- Default: dt = 0.01 s (100 Hz)
- No variable timestep to ensure determinism

## Physics Assumptions

### Rigid Bodies
- Bodies are perfectly rigid (no deformation)
- Mass distribution is constant
- Inertia tensor is constant in body frame

### Collisions
- Contact points are instantaneous
- No penetration recovery (position-based)
- Coefficient of restitution: 0 ≤ e ≤ 1

### Constraints
- Constraints are bilateral (equality)
- Solved iteratively
- Small drift is acceptable (<1% of constraint length)

## Limitations

### Not Modeled
- Air resistance (unless explicitly added)
- Friction (initially, can be added)
- Deformation of rigid bodies
- Relativistic effects
- Quantum effects

### Approximations
- Point masses for particles
- Uniform density for rigid bodies
- Linear damping for simplicity
- Small angle approximations (where noted)

## Determinism

### Guaranteed
- Same initial conditions → same results
- Platform-independent (IEEE 754)
- No randomness in core engine
- Reproducible builds

### Not Guaranteed
- Different compilers may produce slightly different results
- Floating point associativity varies
- Thread scheduling (if parallel)

## Engineering Philosophy

1. **Physics first**: If math says it's wrong, it's wrong
2. **No magic numbers**: Every constant has a physical meaning
3. **Explicit over implicit**: Make assumptions visible
4. **Fail loudly**: Assert on violations, don't silently continue
5. **Measure everything**: Energy, momentum, constraint drift

---

**Last updated**: 2026-02-02
