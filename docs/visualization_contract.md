# Visualization Contract

## 1. Core Principle
Visualization follows the **Observer Pattern**. It observes the physics world but CANNOT modify it.

## 2. Data Ownership
- **Physics World**: Owns `RigidBody`, `Constraint`, `Contact`.
- **VisualAdapter**: Creates PROJECTIONS (copies) of physics data.
- **Viewer**: Owns `VisualState` (the Snapshot).

## 3. Strict Rules
1. **Immutable Snapshots**: The viewer never accesses `RigidBody` pointers directly during rendering. It only accesses `VisualBody` (POD struct).
2. **Fixed Timestep**: The physics loop `world.step()` runs at fixed `dt` (e.g., 1/60s). Rendering runs as fast as possible (or VSynced), consuming the latest AVAILABLE snapshot.
3. **No Interpolation**: To guarantee diagnostic truth, we render the Discrete state exactly. Smoothing is forbidden as it hides solver jitter.

## 4. Extension Guidelines
- To add 3D: Implement `Renderer3D` and update `VisualAdapter` to copy Quaternions instead of projecting Euler angles. The `VisualState` must remain a DTO.
