# Physics Lab 🔬

**Where all physics starts.**

## Philosophy

This is the physics discovery layer. Every concept, algorithm, and phenomenon is explored, validated, and understood here before entering production code.

## The Three Rules

Every experiment in this lab **must**:

1. **📊 Plot** - Visualize the physics
   - Show trajectories, energies, forces
   - Make instabilities visible
   - Use meaningful scales and labels

2. **📝 Log Energy** - Track conservation laws
   - Total energy over time
   - Kinetic vs. potential energy
   - Identify drift and dissipation

3. **⚠️ Reveal Instability** - Be honest about failure
   - If an integrator explodes, show it
   - If energy drifts, measure it
   - If constraints drift, quantify it

**If physics is not proven here, it does not enter C++.**

## Directory Structure

### core_math/
Mathematical primitives and operations.
- `vectors.py` - Vector operations with validation
- `matrices.py` - Matrix operations and transformations
- `quaternions.py` - Rotation representations
- `units.py` - Unit conversions and dimensional analysis

### kinematics/
Motion without considering forces.
- `point_motion.py` - Particle trajectories and velocities
- `plots.py` - Kinematic visualization utilities

### forces/
Force interactions and validation.
- `gravity.py` - Gravitational force experiments
- `force_superposition.py` - Multiple force combinations
- `validation.py` - Force validation utilities

### rigid_body/
Rotational dynamics and inertia.
- `inertia_tensor.py` - Moment of inertia calculations
- `torque_response.py` - Rotational response to torques
- `angular_stability.py` - Angular stability analysis

### collisions/
Collision detection and response.
- `collision_1d.py` - 1D elastic/inelastic collisions
- `sat.py` - Separating Axis Theorem for convex shapes
- `gjk.py` - Gilbert-Johnson-Keerthi distance algorithm

### constraints/
Constraint-based dynamics.
- `pendulum.py` - Pendulum constraint experiments
- `joints.py` - Joint constraint analysis
- `drift_analysis.py` - Constraint drift measurement

### integration/
Numerical integration methods.
- `euler.py` - Forward Euler integration
- `semi_implicit.py` - Semi-implicit Euler (symplectic)
- `verlet.py` - Verlet integration
- `energy_drift.py` - Energy conservation analysis across integrators

### multibody/
Multi-body systems.
- `articulated_chain.py` - Articulated body chains

### soft_body/
Deformable body physics.
- `mass_spring.py` - Mass-spring system experiments
- `fem_intro.py` - Finite Element Method introduction

### fluids/
Fluid dynamics simulations.
- `sph.py` - Smoothed Particle Hydrodynamics
- `navier_stokes.py` - Navier-Stokes equations

### thermo/
Thermodynamics and heat transfer.
- `heat_diffusion.py` - Heat diffusion experiments

### electromagnetism/
Electromagnetic simulations.
- `fields.py` - Electric and magnetic field experiments

## Running Experiments

Each experiment is self-contained and can be run independently:

```bash
cd physics_lab/kinematics
python point_motion.py
```

Expected outputs:
- Plots saved to local directory or displayed
- Console output with energy logs
- Clear indication of stability/instability

## Writing New Experiments

Template structure:

```python
"""
Experiment: [Name]
Purpose: [What physics concept is being explored]
"""

import numpy as np
import matplotlib.pyplot as plt

def setup_experiment():
    """Initialize parameters and state"""
    pass

def run_simulation(dt, num_steps):
    """Run the simulation"""
    positions = []
    energies = []
    
    for step in range(num_steps):
        # Update physics
        # Log energy
        pass
    
    return positions, energies

def plot_results(positions, energies):
    """Visualize results"""
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8))
    
    # Plot trajectories
    ax1.plot(positions)
    ax1.set_title('[Experiment Name]')
    
    # Plot energy conservation
    ax2.plot(energies)
    ax2.set_title('Energy Conservation')
    ax2.set_ylabel('Total Energy')
    
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    positions, energies = run_simulation(dt=0.01, num_steps=1000)
    plot_results(positions, energies)
    
    # Check for energy drift
    energy_drift = (energies[-1] - energies[0]) / energies[0]
    print(f"Energy drift: {energy_drift*100:.2f}%")
```

## Dependencies

Common Python libraries used:
- `numpy` - Numerical operations
- `matplotlib` - Plotting and visualization
- `scipy` - Scientific computing (optional)

Install with:
```bash
pip install numpy matplotlib scipy
```

## From Lab to Production

When an experiment successfully validates a physics concept:

1. ✅ **Document findings** - What works, what doesn't, stability ranges
2. ✅ **Identify parameters** - Critical constants, timestep limits
3. ✅ **Write specification** - Clear algorithm description
4. ✅ **Implement in C++** - Move to `engine/`
5. ✅ **Create regression test** - Protect the validated behavior

## Notes

- Experiments can be messy—that's expected
- Failures are valuable—they teach us boundaries
- Plots should be publication-quality
- Energy logs should reveal truth, not hide problems

---

**Remember: Every line of C++ code must be backed by Python validation.**
