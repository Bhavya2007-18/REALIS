---
name: realis-3d-geometry
description: Develops and maintains the REALIS 3D engineering viewport using Three.js, React Three Fiber, React Three Drei, WebGL, 3D geometry, meshes, materials, transforms, cameras, raycasting, scene graphs, model loading, object interaction, and physics-to-rendering integration. Use when modifying the 3D viewport, geometry, rendering, camera systems, object manipulation, 3D interactions, simulation visualization, or integration between simulation state and the 3D scene.
---

# REALIS 3D Geometry Skill

## Purpose

This skill governs development of the REALIS 3D viewport and all
Three.js / React Three Fiber functionality.

REALIS uses:

- Three.js
- React Three Fiber
- React Three Drei
- WebGL
- React
- Zustand

The REALIS viewport is an engineering and physics visualization
environment.

It is NOT merely a decorative 3D scene.

---

# Technology Stack

Use:

- Three.js for 3D rendering and low-level 3D functionality.
- React Three Fiber for integrating Three.js with React.
- React Three Drei for reusable Three.js/R3F helpers.
- Zustand for shared application state where appropriate.

Do not introduce another 3D rendering framework unless there is a
strong architectural reason.

Do not replace React Three Fiber with vanilla Three.js without
first checking the existing architecture.

---

# Core Architecture

REALIS should follow this conceptual flow:

Simulation State
        ↓
3D Scene State
        ↓
React Three Fiber
        ↓
Three.js
        ↓
WebGL

The simulation/physics system is authoritative.

The renderer visualizes simulation state.

The renderer must not independently implement physics.

---

# 3D Mathematics

Understand and correctly use:

- Vector3
- Vector2
- Euler
- Quaternion
- Matrix4
- Box3
- Sphere
- Plane
- Ray
- Color
- Object3D
- Group
- Mesh
- BufferGeometry
- Material

Always distinguish between:

- Local coordinates
- World coordinates
- Position
- Rotation
- Scale
- Direction
- Velocity
- Acceleration

Avoid unnecessary conversions between coordinate systems.

---

# Object Representation

REALIS objects may contain:

- id
- type
- geometry
- position
- rotation
- scale
- material
- mass
- velocity
- angular velocity
- forces
- constraints

Physics properties belong to simulation state.

Rendering properties belong to the 3D representation.

Do not unnecessarily mix rendering state and simulation state.

---

# Physics Integration

Physics must flow into rendering:

Physics Engine
      ↓
Simulation Engine
      ↓
Simulation State
      ↓
3D Renderer

Do NOT implement independent physics inside visual React components.

Bad:

useFrame(() => {
    object.position.y -= 0.01
})

Good:

useFrame(() => {
    object.position.copy(simulationPosition)
})

The physics engine determines the physical state.

Three.js displays that state.

---

# React Three Fiber

Use R3F idiomatically.

Prefer:

- Canvas
- useFrame
- useThree
- refs
- declarative scene components
- Suspense for asynchronous assets
- Drei helpers where appropriate

Avoid unnecessary React state updates inside high-frequency
render loops.

Use refs and direct Three.js object updates where appropriate.

---

# Performance

REALIS may eventually contain many:

- rigid bodies
- meshes
- vectors
- trajectories
- debug objects
- visualization overlays

Therefore:

- Avoid recreating geometries every frame.
- Avoid recreating materials every frame.
- Avoid unnecessary React re-renders.
- Use refs for high-frequency updates.
- Use instancing when many identical objects exist.
- Dispose of resources correctly.
- Profile before optimizing.
- Keep physics computation outside React rendering.

Do not prematurely optimize without evidence.

---

# Camera

Support engineering-oriented camera interaction:

- Orbit
- Pan
- Zoom
- Perspective
- Orthographic
- Focus on selected object
- Fit scene
- Reset camera

Camera controls should integrate with the existing REALIS viewport.

---

# Object Interaction

Support:

- Selection
- Hover
- Raycasting
- Dragging
- Translation
- Rotation
- Scaling
- Transform gizmos
- Object highlighting
- Multi-selection where appropriate

Interactions must integrate with REALIS's state management.

Do not create a second independent selection system if one already exists.

---

# Scene Graph

Maintain a logical scene structure:

Scene
├── Environment
├── Simulation Objects
├── Constraints
├── Visualization
├── Debug
└── UI / Interaction Helpers

Keep simulation objects separate from purely visual overlays.

---

# Physics Visualization

REALIS should eventually visualize:

- Forces
- Net force
- Velocity
- Acceleration
- Angular velocity
- Torque
- Momentum
- Trajectories
- Collision points
- Collision normals
- Constraints
- Bounding boxes
- Coordinate axes
- Energy
- Simulation annotations

These visualizations should help users understand the simulation.

They should not exist merely for decoration.

---

# Model Loading

Use appropriate Three.js/R3F loaders.

Prefer GLTF/GLB for web-oriented assets where appropriate.

Maintain compatibility with existing REALIS model formats such as OBJ
where they are already supported.

Do not remove existing import functionality without justification.

---

# Materials and Lighting

Use physically understandable lighting and materials.

The viewport should prioritize:

- Geometry readability
- Depth perception
- Physical relationships
- Object separation
- Simulation clarity

Avoid excessive visual effects that make engineering information harder
to understand.

---

# Simulation Visualization

The viewport should be capable of showing:

Simulation State
        ↓
Object Position
Object Rotation
Velocity
Forces
Constraints
Energy
        ↓
Three.js Visualization

Simulation values should remain the source of truth.

---

# Existing Architecture

Before modifying the viewport:

1. Inspect the existing REALIS 3D architecture.
2. Identify the current Canvas.
3. Identify the current scene components.
4. Identify the state store.
5. Identify object representations.
6. Identify existing controls and gizmos.
7. Identify how simulation state reaches the viewport.
8. Reuse existing abstractions where possible.

Do not rewrite the viewport simply because a different architecture
would be cleaner.

---

# Integration Rules

When a task touches multiple systems:

Frontend
   ↓
State
   ↓
Simulation
   ↓
Physics
   ↓
3D Rendering

Trace the complete data flow before making changes.

If the task involves physics visualization, coordinate with:

- physics-engine
- simulation-engine
- architecture

If the task involves AI-generated scene information, coordinate with:

- context-engineering
- computer-vision
- architecture

---

# When To Use This Skill

Use this skill when:

- Modifying the REALIS 3D viewport
- Creating 3D objects
- Adding geometry
- Adding meshes
- Adding materials
- Adding lights
- Modifying cameras
- Adding controls
- Adding transform gizmos
- Implementing raycasting
- Implementing selection
- Implementing object manipulation
- Loading 3D models
- Adding physics visualization
- Showing forces
- Showing velocity
- Showing trajectories
- Showing constraints
- Connecting simulation state to rendering
- Optimizing Three.js/R3F performance
- Debugging Three.js
- Debugging React Three Fiber

Do not use this skill for:

- Pure backend work
- FastAPI API design
- OpenCV image processing
- LLM context engineering
- Physics solver implementation
- Pure CSS work unrelated to the 3D viewport