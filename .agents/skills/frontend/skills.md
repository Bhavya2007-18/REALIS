---
name: realis-frontend
description: Develops and maintains the REALIS frontend architecture using React, TypeScript, Vite, Tailwind CSS, React Three Fiber, Zustand, and modern frontend engineering principles. Responsible for UI architecture, state management, user workflows, simulation controls, viewport integration, command dispatching, component systems, performance optimization, accessibility, responsiveness, and communication with simulation, physics, AI, and visualization systems.
---

# REALIS Frontend Skill

## Purpose

The REALIS frontend is the user-facing operating system of the platform.

Its job is not merely displaying buttons.

Its purpose is:

- Present simulations
- Present visualizations
- Present AI explanations
- Present experiment controls
- Present engineering tools
- Collect user input
- Convert interactions into commands
- Synchronize with simulation state
- Display simulation results

The frontend should remain a consumer of state and a producer of commands.

It should never become the source of truth for simulation logic.

---

# Core Architecture

REALIS Frontend Architecture:

User
 ↓
Frontend UI
 ↓
Command Layer
 ↓
Simulation Engine
 ↓
Physics Engine
 ↓
Simulation State
 ↓
Frontend State
 ↓
Visualization

Frontend never directly manipulates physics.

Frontend never directly manipulates simulation internals.

Frontend consumes state.

Frontend emits commands.

---

# Technology Stack

Primary Technologies:

- React
- TypeScript
- Vite
- Tailwind CSS
- React Three Fiber
- Zustand
- React Query
- Framer Motion

Supporting Technologies:

- Three.js
- React Router
- Shadcn UI
- Zod
- React Hook Form

Use technologies already present before introducing new dependencies.

Avoid dependency bloat.

---

# State Ownership

Frontend owns:

- UI state
- Modal state
- Sidebar state
- Theme state
- Selected object state
- Form state
- Camera preferences
- Temporary interaction state

Simulation Engine owns:

- Simulation lifecycle
- Simulation time
- Experiment state

Physics Engine owns:

- Position
- Velocity
- Acceleration
- Forces
- Collisions

Do not duplicate ownership.

---

# State Management

Use Zustand as the primary frontend state layer.

Preferred separation:

UI Store
 ├─ theme
 ├─ sidebar
 ├─ dialogs
 └─ preferences

Selection Store
 ├─ selected object
 ├─ hovered object
 └─ active tool

Viewport Store
 ├─ camera
 ├─ controls
 └─ rendering settings

Simulation Store
 ├─ simulation snapshot
 ├─ telemetry
 └─ events

Avoid giant global stores.

Prefer multiple focused stores.

---

# Component Design

Components should be:

- Reusable
- Composable
- Testable
- Predictable
- Isolated

Avoid:

God Components

Example:

BAD

SimulationPage.tsx
    5000+ lines

GOOD

SimulationPage
 ├─ Toolbar
 ├─ Viewport
 ├─ Sidebar
 ├─ Timeline
 ├─ Inspector
 ├─ AI Panel
 └─ Status Bar

---

# Command Pattern

Frontend actions become commands.

Example:

User clicks:

"Apply Force"

↓

Frontend Command

↓

Simulation Engine

↓

Physics Engine

Never:

Button
 ↓
Directly mutate physics

---

# Layout System

Primary Layout:

App Shell
 ├─ Top Bar
 ├─ Left Sidebar
 ├─ Main Viewport
 ├─ Right Inspector
 ├─ Bottom Timeline
 └─ Notification Layer

The viewport is the primary focus area.

Avoid cluttering the workspace.

---

# Simulation Controls

Frontend should expose:

- Play
- Pause
- Resume
- Stop
- Reset
- Step Forward
- Time Scale
- Snapshot
- Replay

Controls dispatch commands.

Controls do not execute physics.

---

# Object Inspector

Object Inspector should display:

- Object Name
- Object Type
- Position
- Rotation
- Velocity
- Mass
- Material
- Constraints
- Forces

Inspector reads simulation state.

Inspector does not own simulation state.

---

# AI Integration

AI should be treated as a system panel.

AI may:

- Explain simulations
- Explain forces
- Explain collisions
- Suggest experiments
- Generate commands

AI should not directly mutate state.

Flow:

AI
 ↓
Structured Command
 ↓
Validation
 ↓
Simulation Engine

---

# Viewport Integration

Viewport is powered by:

React Three Fiber
 +
Three.js

Viewport responsibilities:

- Render scene
- Render overlays
- Render gizmos
- Render helpers
- Render debug visuals

Viewport does not perform physics calculations.

---

# Camera System

Support:

- Orbit Controls
- Pan
- Zoom
- Focus Object
- Reset Camera
- Follow Object

Camera state belongs to frontend.

Camera movement should not modify simulation state.

---

# Selection System

Support:

- Click Select
- Multi Select
- Hover
- Focus
- Deselect

Selection state belongs to frontend.

Simulation should not depend on selection state.

---

# Timeline System

Timeline responsibilities:

- Show simulation time
- Show events
- Show snapshots
- Show replay markers

Timeline should consume simulation state.

Not generate simulation state.

---

# Event System

Display:

- Simulation Started
- Simulation Paused
- Simulation Resumed
- Collision Occurred
- Constraint Broken
- Snapshot Created
- Experiment Completed

Events originate from the Simulation Engine.

Frontend visualizes them.

---

# Forms

Use:

React Hook Form
+
Zod

for validation.

Never trust user input.

Validate:

- Mass
- Force
- Velocity
- Dimensions
- Constraints
- Experiment parameters

before dispatching commands.

---

# Notifications

Notifications should be:

- Informative
- Non-blocking
- Actionable

Examples:

✓ Simulation Started

✓ Snapshot Saved

⚠ Invalid Mass Value

⚠ Simulation Error

---

# Accessibility

Frontend must support:

- Keyboard navigation
- Focus states
- Screen reader compatibility
- Proper labels
- Semantic HTML

Accessibility is not optional.

---

# Responsiveness

Support:

- Desktop
- Laptop
- Tablet

Prioritize desktop experience.

REALIS is a professional engineering application.

Do not sacrifice desktop workflows for mobile-first design.

---

# Performance

Optimize:

- Re-renders
- State updates
- Three.js objects
- React component trees
- Event listeners

Avoid:

- unnecessary renders
- large prop chains
- repeated calculations

Measure before optimizing.

---

# Loading States

Always handle:

- Loading
- Success
- Empty
- Error

Avoid blank screens.

---

# Error Handling

Detect:

- Failed API calls
- Invalid simulation state
- Missing resources
- Rendering errors

Provide meaningful feedback.

Never silently fail.

---

# Frontend Testing

Test:

- Components
- State stores
- Commands
- Forms
- Viewport interactions
- Navigation
- Error states

Use:

- Vitest
- React Testing Library

where appropriate.

---

# Debug Mode

Provide developer tools for:

- Simulation State
- Selected Object
- Camera State
- Performance Metrics
- Event Stream

Debug tools should be separate from production UI.

---

# Architectural Boundaries

Frontend must NOT:

- Solve physics
- Detect collisions
- Process images
- Perform CV analysis
- Generate scene graphs
- Execute physics integration

Frontend SHOULD:

- Display information
- Collect input
- Dispatch commands
- Visualize results

---

# Integration Map

Computer Vision
 ↓
Scene Graph
 ↓
Simulation Engine
 ↓
Physics Engine
 ↓
Simulation State
 ↓
Frontend
 ↓
React Three Fiber
 ↓
User

The frontend is a bridge between users and systems.

It is not the source of simulation truth.

---

# When To Use This Skill

Use this skill when:

- Creating React components
- Creating pages
- Creating UI systems
- Creating state stores
- Creating inspectors
- Creating simulation controls
- Creating dashboards
- Creating AI panels
- Creating viewport tools
- Creating forms
- Creating layouts
- Optimizing rendering
- Improving UX
- Managing frontend architecture

Use together with:

- architecture
- simulation-engine
- physics-engine
- 3d-geometry
- context-engineering

when work spans multiple systems.

---

# Final Design Principle

The REALIS frontend should evolve toward:

UNDERSTAND
 ↓
CONTROL
 ↓
VISUALIZE
 ↓
EXPERIMENT
 ↓
LEARN

The frontend exists to make complex engineering simulations intuitive,
interactive, and understandable.