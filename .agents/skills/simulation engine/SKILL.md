---
name: realis-simulation-engine
description: Develops and maintains the REALIS simulation engine responsible for orchestrating simulation lifecycle, time progression, physics execution, experiments, state management, commands, events, snapshots, replay, reset, pause/resume, deterministic execution, telemetry, and synchronization between computer vision, physics, 3D visualization, frontend, and AI systems. Use this skill whenever implementing, modifying, debugging, optimizing, or reviewing simulation lifecycle, simulation stepping, experiment execution, state synchronization, replay, snapshots, timing, or physics-to-application integration.
---

# REALIS Simulation Engine

## 1. PURPOSE

The REALIS Simulation Engine is the orchestration layer that controls how
a simulation is created, initialized, executed, paused, resumed, reset,
recorded, reproduced, observed, and communicated to other systems.

The fundamental distinction is:

- Computer Vision understands visual input.
- Simulation Engine controls the simulation.
- Physics Engine calculates physical behavior.
- 3D/Rendering Engine visualizes the simulation.
- AI explains, analyzes, or suggests actions.

The Simulation Engine is the bridge between these systems.

The core pipeline is:

Computer Vision
    ↓
Scene Graph
    ↓
Physics Representation
    ↓
Simulation Engine
    ↓
Physics Engine
    ↓
Physics State
    ↓
Simulation State
    ↓
3D Visualization / Analytics / AI


## 2. PRIMARY RESPONSIBILITIES

The Simulation Engine is responsible for:

- Simulation lifecycle
- Simulation initialization
- Simulation time
- Fixed timestep management
- Simulation stepping
- Start
- Pause
- Resume
- Stop
- Reset
- Restart
- Simulation commands
- Experiment execution
- Experiment configuration
- Parameter management
- State management
- State snapshots
- State restoration
- Replay
- Deterministic execution
- Event generation
- Telemetry
- Simulation diagnostics
- Synchronization with the Physics Engine
- Synchronization with frontend consumers
- Synchronization with AI systems
- Synchronization with visualization systems
- Experiment reproducibility

The Simulation Engine must NOT be responsible for:

- React UI implementation
- Three.js rendering
- CSS
- OpenCV processing
- Image preprocessing
- Low-level collision algorithms
- Low-level force calculations
- Low-level numerical solvers
- LLM implementation
- Browser-specific rendering logic

Keep these responsibilities separated.


# 3. ARCHITECTURAL ROLE

The Simulation Engine sits between the application layer and the
physics layer.

Preferred architecture:

                    REALIS APPLICATION
                           │
                           ▼
                  SIMULATION ENGINE
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
      CLOCK            EXPERIMENT           STATE
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
                    PHYSICS ENGINE
                           │
                           ▼
                     PHYSICS STATE
                           │
                           ▼
                  SIMULATION STATE
                    │       │       │
                    ▼       ▼       ▼
                  3D       AI    ANALYTICS


The Simulation Engine controls execution.

The Physics Engine calculates physical behavior.

The renderer visualizes the result.

The AI consumes structured state and may submit validated commands.


# 4. SOURCE OF TRUTH

Simulation lifecycle state must have one authoritative owner.

The Simulation Engine owns:

- Simulation status
- Simulation time
- Step count
- Simulation configuration
- Experiment configuration
- Simulation commands
- Snapshot history
- Replay state
- Simulation-level events

The Physics Engine owns physical state such as:

- Position
- Rotation
- Velocity
- Acceleration
- Force
- Torque
- Collision state
- Physical constraints

The renderer owns visual representation.

The frontend owns UI state.

Do not create multiple competing sources of truth.

BAD:

React timer
    ↓
Physics

Browser timer
    ↓
Simulation

Physics timer
    ↓
Simulation

GOOD:

Simulation Engine
    ↓
Authoritative Simulation Time
    ↓
Physics Step
    ↓
Physics State
    ↓
Render State


# 5. SIMULATION LIFECYCLE

Simulation lifecycle must be explicit.

Recommended states:

CREATED
    ↓
INITIALIZED
    ↓
READY
    ↓
RUNNING
    ↓
PAUSED
    ↓
RUNNING
    ↓
STOPPED

Errors should transition into an explicit error state where appropriate.

Example:

RUNNING
    ↓
ERROR
    ↓
Preserve Last Valid State
    ↓
Report Diagnostic


Avoid hidden lifecycle states.

Avoid ambiguous meanings for:

- stop
- reset
- restart
- pause


# 6. INITIALIZATION

Simulation initialization should create a complete and validated initial
state.

Preferred flow:

Scene Definition
    ↓
Validation
    ↓
Create Simulation
    ↓
Create Physics Bodies
    ↓
Create Constraints
    ↓
Set Parameters
    ↓
Capture Initial State
    ↓
READY

The initial state must be reproducible.

Do not duplicate initialization logic across:

- frontend
- physics
- simulation
- backend

There should be one authoritative initialization path.


# 7. SIMULATION STATE

A simulation state may contain:

```text
SimulationState
├── simulationId
├── status
├── simulationTime
├── timestep
├── step
├── initialState
├── currentState
├── parameters
├── entities
├── constraints
├── events
├── experimentMetadata
└── version