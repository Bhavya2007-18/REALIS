# Validation Methodology

## Philosophy

**Every physics concept must be validated in Python before implementation in C++.**

The validation process ensures:
1. Physics is mathematically correct
2. Numerical methods are stable
3. Energy/momentum conservation is verified
4. Edge cases are understood

## Validation Pipeline

```
[Physics Research]
       ↓
[Python Experiment]
       ↓
  [Does it work?] ──No──→ [Revise approach]
       ↓ Yes              ↑
  [Plot results]          │
       ↓                  │
  [Check energy]          │
       ↓                  │
[Drift acceptable?] ──No──┘
       ↓ Yes
[Document findings]
       ↓
[Implement in C++]
       ↓
  [Write tests]
       ↓
[Verify matches Python]
```

## Python Validation

### Required Elements
Every physics experiment must:

1. **Plot trajectories**
   - Visualize motion/fields
   - Show instabilities
   - Use proper scales

2. **Log energy**
   - Track total energy
   - Measure drift
   - Plot over time

3. **Check conservation laws**
   - Momentum conservation
   - Angular momentum conservation
   - Energy conservation (where applicable)

4. **Reveal instability**
   - Don't hide problems
   - Quantify drift
   - Document numerical limits

### Example Validation
```python
# 1. Setup
positions, velocities = simulate(dt=0.01, duration=10.0)

# 2. Plot
plot_trajectory(positions)

# 3. Energy
energies = calculate_energies(positions, velocities)
plot_energy(energies)

# 4. Check drift
drift = (energies[-1] - energies[0]) / energies[0] * 100
assert abs(drift) < 1.0, f"Energy drift {drift}% too large!"

# 5. Document
print(f"Timestep: {dt}")
print(f"Energy drift: {drift:.6f}%")
print(f"Stable: {abs(drift) < 1.0}")
```

## C++ Validation

### Unit Tests
Test individual components:
```cpp
void test_vec3_addition() {
    Vec3 v1(1, 2, 3);
    Vec3 v2(4, 5, 6);
    Vec3 result = v1 + v2;
    assert(result.x == 5);
    assert(result.y == 7);
    assert(result.z == 9);
}
```

### Physics Tests
Validate physical correctness:
```cpp
void test_free_fall() {
    RigidBody body;
    body.mass = 1.0;
    body.position = Vec3(0, 10, 0);
    
    // Simulate 1 second
    for (int i = 0; i < 100; ++i) {
        body.apply_force(Vec3(0, -9.81, 0));
        body.integrate(0.01);
    }
    
    // Check final position (analytical solution)
    float expected_y = 10.0 - 0.5 * 9.81 * 1.0 * 1.0;
    assert(abs(body.position.y - expected_y) < 0.01);
}
```

### Regression Tests
Prevent backsliding:
```cpp
void long_run_stability_test() {
    // Run for 10000 steps
    // Ensure energy drift < 0.1%
    // Ensure no crashes
    // Ensure deterministic results
}
```

## Acceptance Criteria

### For Python Experiments
✅ **Pass** if:
- Plots show expected behavior
- Energy drift < 1% over 100 seconds
- Conservation laws satisfied to 6 decimal places
- Instabilities are documented

### For C++ Implementation
✅ **Pass** if:
- Matches Python results to 4 decimal places
- All unit tests pass
- All physics tests pass
- Energy drift ≤ Python version
- No memory leaks (valgrind)
- Deterministic across runs

## Test Coverage

### Required Coverage
- Unit tests: All math operations
- Physics tests: All integrators, forces, constraints
- Regression tests: Known issues from bug reports
- Performance tests: No degradation > 10%

### Continuous Integration
- Run all tests on every commit
- Fail build if any test fails
- Track performance metrics
- Monitor energy drift trends

## Documentation Requirements

Every validated feature needs:
1. **Physics derivation** (in docs/)
2. **Python validation** (in physics_lab/)
3. **C++ implementation** (in engine/)
4. **Test suite** (in tests/)
5. **Example scenario** (in examples/)

---

**Remember**: If it's not validated, it's not physics—it's guessing.
