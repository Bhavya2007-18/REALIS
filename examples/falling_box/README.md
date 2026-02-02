# Falling Box Example

A simple demonstration of rigid body dynamics.

## Description

A box falls under gravity and bounces on the ground.

## Physics Concepts

- Gravity force
- Rigid body integration
- Contact detection
- Impulse-based collision response
- Energy conservation (with losses at collision)

## Running the Example

```bash
# From the examples/falling_box directory
python run_falling_box.py
```

## Expected Behavior

The box should:
1. Fall with constant acceleration (9.81 m/s²)
2. Hit the ground
3. Bounce back (with reduced energy due to restitution < 1)
4. Eventually come to rest

## Validation

- Total momentum should be conserved (box + ground)
- Energy should decrease at each bounce by factor of e² (coefficient of restitution)
- Final state should be box at rest on ground
