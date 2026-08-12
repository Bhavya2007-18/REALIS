---
name: realis-architecture
description: Designs, analyzes, and maintains the architecture of REALIS, an AI-powered engineering and physics simulation platform. Use when a task affects multiple subsystems, requires architectural decisions, introduces new features, changes data flow, refactors major components, connects frontend/backend/physics/simulation/CV/AI systems, or requires deciding where functionality belongs.
---

# REALIS Architecture Skill

## Purpose

This skill governs the overall software architecture of REALIS.

REALIS is an AI-powered interactive engineering and physics simulation
platform combining:

- React frontend
- Three.js / React Three Fiber 3D viewport
- Zustand application state
- Python / FastAPI backend
- C++ physics engine
- Simulation engine
- Computer vision pipeline
- AI / LLM context system
- Scientific visualization

The architecture should allow these systems to work together as one
coherent engineering environment.

---

# Core Product Loop

REALIS follows this conceptual loop:

BUILD
  ↓
SIMULATE
  ↓
OBSERVE
  ↓
EXPERIMENT
  ↓
ASK AI
  ↓
UNDERSTAND
  ↓
EXPERIMENT AGAIN

Every major architectural decision should support this loop.

---

# System Architecture

The high-level architecture is:

                    REALIS
                       │
        ┌──────────────┼──────────────┐
        │              │              │
     Frontend       Backend        AI Layer
        │              │              │
        │              │              │
     3D/CAD       Simulation      Context
        │              │              │
        └──────────────┼──────────────┘
                       │
                 Physics Engine
                       │
                 Simulation State
                       │
                 Visualization

Computer Vision can feed the system through:

Sketch/Image
    ↓
Computer Vision
    ↓
Scene Graph
    ↓
Physics Representation
    ↓
REALIS Scene
    ↓
Simulation

---

# Architectural Principles

## 1. Understand Before Modifying

Before changing architecture:

1. Inspect the existing implementation.
2. Identify the relevant subsystem.
3. Trace the data flow.
4. Identify existing abstractions.
5. Identify dependencies.
6. Determine whether the requested feature already partially exists.
7. Make the smallest appropriate change.

Do not rewrite functioning systems simply because another architecture
looks cleaner.

---

## 2. Single Source of Truth

Each important type of state should have a clear owner.

Examples:

Simulation state
→ Simulation Engine

Physical state
→ Physics Engine / Simulation State

UI state
→ Frontend / Zustand

AI context
→ Context Engineering layer

Rendered representation
→ 3D Viewport

Do not create multiple competing sources of truth.

---

# Separation of Responsibilities

## Frontend

Responsible for:

- UI
- user interaction
- controls
- panels
- forms
- state presentation
- viewport interaction

The frontend should NOT become the physics engine.

---

## 3D Geometry

Responsible for:

- Three.js
- React Three Fiber
- scene graph
- meshes
- materials
- cameras
- transforms
- raycasting
- visual representation

The renderer visualizes state.

It should not own the physical truth.

---

## Physics Engine

Responsible for:

- forces
- acceleration
- velocity
- rigid body dynamics
- collision detection
- collision resolution
- friction
- restitution
- constraints
- torque
- angular motion

---

## Simulation Engine

Responsible for:

- simulation lifecycle
- timestep
- stepping
- pause
- resume
- reset
- snapshots
- replay
- state updates
- simulation events
- experiment execution

---

## Backend

Responsible for:

- API communication
- server-side orchestration
- persistence where required
- AI communication
- simulation services where appropriate
- validation
- external integrations

---

## Computer Vision

Responsible for:

- image processing
- edge detection
- contours
- object detection
- semantic interpretation
- spatial relationships
- scene graph generation
- physics representation generation

---

## Context Engineering

Responsible for:

- constructing AI context
- selecting relevant simulation information
- summarizing state
- managing context size
- tool/context interfaces
- AI-facing structured data

The LLM should not directly inspect arbitrary application internals.

---

# Data Flow

Prefer explicit data flow.

Example:

User
 ↓
Frontend
 ↓
Application State
 ↓
Simulation Request
 ↓
Simulation Engine
 ↓
Physics Engine
 ↓
Simulation State
 ↓
Frontend
 ↓
3D Visualization

For AI:

Simulation State
 ↓
Context Builder
 ↓
Structured AI Context
 ↓
LLM
 ↓
Explanation / Recommendation
 ↓
Frontend

For sketch simulation:

Image
 ↓
CV Pipeline
 ↓
Scene Graph
 ↓
Physics Representation
 ↓
REALIS Scene
 ↓
Simulation
 ↓
Visualization

---

# Cross-System Communication

When systems communicate, prefer explicit contracts.

Avoid:

- hidden global state
- direct manipulation of another subsystem's internals
- duplicated state
- circular dependencies
- UI components directly controlling physics internals

Prefer:

- typed interfaces
- domain objects
- events
- commands
- state updates
- explicit API contracts

---

# Dependency Direction

Prefer dependencies flowing toward domain logic.

For example:

Frontend
   ↓
Application / State
   ↓
Simulation
   ↓
Physics

Not:

Physics
   ↓
React component
   ↓
UI

Physics should not depend on React.

The core simulation should not depend on browser-specific UI code.

---

# Feature Design

When implementing a new feature, classify it first.

Ask:

1. Which subsystem owns this functionality?
2. Which subsystem produces its data?
3. Which subsystem consumes its data?
4. Is a new API required?
5. Is a new state representation required?
6. Does the feature cross subsystem boundaries?
7. Does an existing abstraction already support it?

---

# Multi-System Features

For features crossing multiple systems, explicitly map:

Input
 ↓
Owner
 ↓
Processing
 ↓
State
 ↓
Consumers
 ↓
Visualization
 ↓
AI Context if applicable

Example:

Force Visualization

Physics Engine
 ↓
Force State
 ↓
Simulation State
 ↓
R3F
 ↓
Force Arrow

AI explanation:

Force State
 ↓
Context Builder
 ↓
LLM
 ↓
Explanation

---

# State Management

REALIS currently uses Zustand.

Prefer extending the existing state architecture rather than introducing
another global state library.

Before adding state:

1. Search existing stores.
2. Determine whether the state already exists.
3. Determine who owns the state.
4. Determine whether derived state can be computed instead.

Avoid duplicating the same state across:

- React local state
- Zustand
- backend
- physics engine
- simulation engine

unless there is a clear synchronization strategy.

---

# API Boundaries

Use APIs when crossing process boundaries.

Example:

Frontend
   ↓
FastAPI
   ↓
Python service

Do not create unnecessary APIs between components that can communicate
through existing in-process abstractions.

---

# Backend / Frontend Boundary

Frontend should send structured requests.

Backend should return structured responses.

Avoid loosely formatted strings when structured data is appropriate.

Prefer:

{
  scene,
  objects,
  simulation,
  metadata
}

over opaque text blobs.

---

# Simulation / Rendering Boundary

The simulation should produce authoritative state.

Example:

Simulation State:

{
  objectId,
  position,
  rotation,
  velocity,
  angularVelocity,
  forces
}

The renderer consumes this state.

Do not make the renderer independently modify physical state.

---

# Architecture Decision Process

When asked to implement something substantial:

## Step 1

Inspect the existing codebase.

## Step 2

Identify the affected systems.

## Step 3

Map current data flow.

## Step 4

Identify the smallest architectural change.

## Step 5

Check for existing abstractions.

## Step 6

Implement.

## Step 7

Test the complete data flow.

## Step 8

Check for duplicated state or circular dependencies.

---

# Refactoring Rules

Do not perform large refactors without justification.

Before refactoring:

- Explain the existing problem.
- Identify affected files.
- Identify expected benefits.
- Identify risks.
- Determine whether incremental refactoring is possible.

Prefer:

Small change
 ↓
Test
 ↓
Small change
 ↓
Test

over:

Rewrite entire subsystem.

---

# Integration First

REALIS should prioritize integration over isolated feature count.

A feature that connects existing systems is often more valuable than
another isolated feature.

Prioritize:

1. Sketch → Scene → Simulation
2. Simulation → Visualization
3. Simulation → AI Context
4. User Experiment → Simulation
5. Simulation → Analytics
6. AI → Experiment suggestions

---

# Avoid Fake Integration

Do not create:

- mock physics presented as real physics
- hardcoded AI explanations presented as simulation analysis
- static animation presented as real simulation
- placeholder scene generation presented as completed sketch recognition
- fake backend calls
- disconnected UI controls

If something is a prototype, clearly keep the implementation labeled
and architected as a prototype.

---

# Performance Architecture

Consider performance boundaries explicitly.

High-frequency systems include:

- physics
- simulation loop
- rendering
- telemetry
- visualization

Do not route high-frequency simulation data through unnecessary React
renders or HTTP requests.

Prefer appropriate mechanisms such as:

- direct state access
- refs
- subscriptions
- WebSockets
- event streams
- buffered updates

where appropriate.

---

# Error Boundaries

Failures in one subsystem should not unnecessarily destroy the entire
application.

Examples:

CV failure
→ show error
→ preserve existing scene

AI failure
→ simulation continues

Physics failure
→ stop simulation safely
→ preserve scene state

Backend failure
→ frontend remains usable where possible

---

# Architecture Review Checklist

Before approving a major change:

- [ ] Correct subsystem owns the functionality.
- [ ] Existing abstractions were inspected.
- [ ] Data flow is explicit.
- [ ] No unnecessary duplicate state.
- [ ] No circular dependency introduced.
- [ ] Physics remains independent of UI.
- [ ] Rendering remains separate from physics.
- [ ] AI receives structured context.
- [ ] Backend boundaries are appropriate.
- [ ] Existing functionality is preserved.
- [ ] Cross-system integration is tested.
- [ ] No fake implementation is presented as complete.

---

# When To Use This Skill

Use this skill when:

- Adding a major feature
- Modifying multiple subsystems
- Refactoring architecture
- Changing state ownership
- Designing APIs
- Connecting frontend and backend
- Connecting simulation and physics
- Connecting simulation and visualization
- Connecting simulation and AI
- Connecting CV and simulation
- Introducing a new service
- Choosing where code should live
- Resolving architectural conflicts
- Reviewing a proposed implementation
- Planning a large feature

Use this skill together with the relevant specialist skills when a task
crosses multiple domains.

Examples:

Physics + Simulation
→ architecture + physics-engine + simulation-engine

3D + Physics
→ architecture + 3d-geometry + physics-engine

CV + Simulation
→ architecture + cv + simulation-engine

AI + Simulation
→ architecture + context-engineering + simulation-engine

Frontend + Backend
→ architecture + frontend + backend