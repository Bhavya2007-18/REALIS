# Known Limitations

## Numerical Stability

### Integration Methods
- **Euler**: Conditionally stable, dt < 2/ω for oscillators
- **Semi-Implicit Euler**: Better but still has energy drift
- **Verlet**: Best energy conservation, but 2nd order only

### Constraint Drift
- Distance constraints: Drift accumulates over time
- Mitigation: Baumgarte stabilization (planned)
- Current: Accept <1% drift over 100 seconds

## Performance

### Collision Detection
- Broadphase: O(n²) naive implementation
- Narrowphase: GJK/SAT implemented, but not optimized
- Target: O(n log n) with spatial hashing (future)

### Large Simulations
- Current: Designed for <1000 rigid bodies
- Bottleneck: Contact solver
- Future: Parallel constraint solver

## Physics Coverage

### Not Yet Implemented
- ❌ Friction (static and dynamic)
- ❌ Joint motors
- ❌ Continuous collision detection
- ❌ Articulated body dynamics (Featherstone)
- ❌ Fluid-structure interaction
- ❌ Thermal coupling
- ❌ Electromagnetic forces

### Partially Implemented
- ⚠️ Soft bodies (mass-spring only)
- ⚠️ Fluids (SPH concept, not production)
- ⚠️ Multibody (forward kinematics only)

## Numerical Precision

### Single vs Double Precision
- Current: `float` (32-bit) in C++
- Limitation: Precision issues at large scales
- Workaround: Keep simulations in reasonable bounds
- Future: Optional double precision build

### Catastrophic Cancellation
- Small mass + large dt = instability
- Small forces on heavy objects: precision loss
- Recommendation: Scale masses to [0.1, 100] kg

## Platform Dependencies

### Floating Point
- Assumes IEEE 754 compliance
- Different CPUs may give slightly different results
- Compiler optimizations affect reproducibility

### Threading
- Not thread-safe (current implementation)
- No OpenMP/SIMD optimizations yet
- Parallelization planned for future

## Scale Limitations

### Too Small
- Minimum stable mass: ~0.001 kg
- Minimum distance: ~0.0001 m
- Below this: numerical issues

### Too Large
- Maximum stable mass: ~10000 kg
- Maximum distance: ~10000 m
- Maximum velocity: ~1000 m/s
- Above this: precision loss

### Recommended Ranges
- Mass: 0.1 - 100 kg
- Length: 0.01 - 100 m
- Velocity: 0.01 - 100 m/s
- Time: 0.001 - 10000 s

## Known Issues

### Energy Drift
- Non-symplectic integrators accumulate error
- Constraints violate energy conservation slightly
- Collisions lose energy (intentional damping)

### Constraint Stabilization
- Position-based only
- No velocity-level correction
- Can cause jitter in stiff systems

### Contact Stacking
- Stacked objects can be unstable
- Needs shock propagation (not implemented)
- Use lighter objects or smaller timesteps

## Workarounds

### For Stability
1. Use smallest dt that meets performance
2. Keep masses within 100x range
3. Avoid very stiff constraints
4. Use Verlet for energy-critical scenarios

### For Performance
1. Reduce number of contacts
2. Use broadphase culling
3. Limit constraint iterations
4. Simplify collision geometry

### For Accuracy
1. Validate against analytical solutions
2. Monitor energy drift
3. Run convergence tests
4. Compare with reference implementations

## Future Improvements

### Short Term (v0.2)
- Friction implementation
- Better contact solver
- Spatial hashing broadphase

### Medium Term (v0.5)
- Featherstone algorithm
- Continuous collision detection
- SIMD optimization

### Long Term (v1.0)
- GPU acceleration
- Fluid-structure interaction
- Higher-order integrators

---

**Remember**: These are limitations, not bugs. We document honestly.

**Last updated**: 2026-02-02
