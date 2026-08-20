---
name: realis-physics-engine
description: Develops and maintains the REALIS physics engine for engineering and physics simulation. Covers rigid body dynamics, Newtonian mechanics, forces, torque, collisions, friction, constraints, integration, numerical stability, coordinate systems, simulation state, deterministic stepping, and physics-to-rendering integration. Use when implementing, debugging, extending, optimizing, or reviewing physical behavior, collision systems, constraints, force calculations, numerical integration, or the connection between physics and the REALIS simulation engine.
---

# REALIS Physics Engine Skill

## 1. Purpose

This skill governs the physics engine and physical computation layer of
REALIS.

The physics engine exists to provide physically meaningful simulation
results that can be consumed by the simulation engine, 3D renderer,
analytics systems, and AI context system.

The core architecture is:

Physical Parameters
        ↓
Physics State
        ↓
Forces / Constraints
        ↓
Physics Solver
        ↓
Integration
        ↓
Updated Physics State
        ↓
Simulation Engine
        ↓
3D Visualization / AI / Analytics

The physics engine is the source of truth for physical behavior.

---

# 2. Core Responsibility

The physics engine should be responsible for:

- Rigid body dynamics
- Forces
- Acceleration
- Velocity
- Position
- Angular velocity
- Angular acceleration
- Torque
- Momentum
- Gravity
- Friction
- Collision detection
- Collision response
- Constraints
- Joints
- Springs
- Restitution
- Damping
- Numerical integration
- Physical state updates

The physics engine should NOT be responsible for:

- React UI
- Three.js rendering
- UI state
- AI responses
- Computer vision
- HTTP request handling
- User interface behavior

Keep physics independent from presentation.

---

# 3. REALIS Physics Architecture

Use this conceptual architecture:

                 SIMULATION ENGINE
                        │
                        ▼
                 Physics Request
                        │
                        ▼
                 PHYSICS ENGINE
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
     Forces         Constraints      Collisions
        │               │               │
        └───────────────┼───────────────┘
                        ▼
                  Physics Solver
                        │
                        ▼
                 Numerical Integrator
                        │
                        ▼
                  Physics State
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
        3D Viewport             AI Context