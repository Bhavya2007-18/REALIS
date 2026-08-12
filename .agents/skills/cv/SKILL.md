---
name: realis-computer-vision
description: Develops and maintains the REALIS computer vision pipeline for converting sketches, diagrams, images, and visual input into structured engineering scene representations. Uses OpenCV, image processing, edge detection, contours, Hough transforms, geometric reasoning, semantic labeling, spatial relationships, scene graphs, physics-aware interpretation, and future ML/CV models. Use when implementing, debugging, or extending sketch recognition, object detection, scene understanding, visual-to-physics conversion, image preprocessing, or CV-to-simulation integration.
---

# REALIS Computer Vision Skill

## 1. Purpose

This skill governs all computer vision and visual understanding functionality
inside REALIS.

REALIS computer vision is not merely an image-processing system.

Its primary purpose is:

Visual Input
    ↓
Computer Vision
    ↓
Geometric Understanding
    ↓
Semantic Understanding
    ↓
Spatial Relationships
    ↓
Engineering Scene Graph
    ↓
Physics Representation
    ↓
REALIS Scene
    ↓
Simulation

The ultimate objective is to allow a user to draw or provide a visual
representation of an engineering system and convert it into a structured
representation that REALIS can simulate and explain.

---

# 2. Core Responsibility

The CV system should answer:

1. What objects are present?
2. Where are they?
3. What geometric properties do they have?
4. How are they related spatially?
5. What do they represent semantically?
6. Which objects are connected?
7. Which objects may be constraints?
8. Which objects may represent forces or vectors?
9. Which information is sufficiently reliable to become simulation state?
10. Which information is uncertain and requires clarification?

Never treat raw image pixels as the final representation.

The desired output is structured information.

---

# 3. Current REALIS CV Pipeline

The existing REALIS pipeline includes concepts such as:

- Edge detection
- Hough transforms
- Contour extraction
- Semantic labeling
- Spatial inference
- Hypothesis generation
- Intent fusion
- Scene graph generation

Preserve and extend existing functionality instead of replacing it
without understanding the current implementation.

The intended progression is:

Image
 ↓
Preprocessing
 ↓
Edges / Features
 ↓
Contours / Geometric Primitives
 ↓
Candidate Objects
 ↓
Semantic Labels
 ↓
Spatial Relationships
 ↓
Scene Graph
 ↓
Physics Representation
 ↓
Simulation

---

# 4. Technology

Primary tools:

- Python
- OpenCV
- NumPy

Potential supporting technologies:

- SciPy
- scikit-image
- PyTorch
- ONNX
- YOLO or other object detection models
- segmentation models
- OCR
- computer vision transformers

Do not introduce ML models when deterministic computer vision is
sufficient.

Do not introduce heavy dependencies simply because they are popular.

Choose the simplest reliable technique for the problem.

---

# 5. Image Preprocessing

Preprocessing should be treated as a configurable pipeline.

Possible stages:

Input Image
 ↓
Resize
 ↓
Color Space Conversion
 ↓
Grayscale
 ↓
Noise Reduction
 ↓
Contrast Adjustment
 ↓
Thresholding
 ↓
Morphological Operations
 ↓
Edge Detection

Use only the stages necessary for the specific input.

Do not blindly apply every preprocessing operation.

---

# 6. Sketch Understanding

REALIS must be able to reason about engineering sketches.

Potential visual elements include:

- Lines
- Circles
- Arcs
- Rectangles
- Polygons
- Arrows
- Points
- Anchors
- Springs
- Rods
- Pulleys
- Blocks
- Surfaces
- Hinges
- Joints
- Constraints
- Force vectors
- Velocity vectors
- Labels
- Dimensions
- Text

The system should distinguish between:

Geometric primitive
and
Semantic engineering object.

For example:

A rectangle is geometry.

A rectangle representing a rigid block is a semantic object.

Do not confuse the two layers.

---

# 7. Geometric Primitive Detection

Use appropriate techniques for each primitive.

Examples:

Lines:
- Canny
- HoughLinesP
- line fitting

Circles:
- HoughCircles
- contour fitting

Contours:
- findContours
- polygon approximation
- contour hierarchy

Polygons:
- approxPolyDP
- geometric validation

Arcs:
- contour analysis
- circle fitting
- geometric reasoning

Do not assume a single detection algorithm works for every image.

---

# 8. Geometry Validation

Raw detector output should not automatically become a REALIS object.

Every candidate should be validated.

Example:

Detected line
 ↓
Check length
 ↓
Check orientation
 ↓
Check confidence
 ↓
Check nearby geometry
 ↓
Determine semantic meaning

Use:

- confidence scores
- geometric constraints
- spatial relationships
- contextual information

to reduce false positives.

---

# 9. Semantic Interpretation

Separate detection from interpretation.

Example:

Computer Vision:

"Detected rectangle at coordinates X."

Semantic reasoning:

"This rectangle may represent a rigid body."

Physics reasoning:

"This rigid body may have mass M and participate in a collision."

Do not collapse these three stages into one function.

Prefer:

Detection
→ Geometry
→ Semantics
→ Physics interpretation

---

# 10. Scene Graph

The primary output of the CV pipeline should be a structured scene graph.

Example:

Scene
├── Objects
│   ├── Block
│   ├── Ground
│   └── Pulley
│
├── Constraints
│   ├── FixedJoint
│   └── Rope
│
├── Forces
│   └── Gravity
│
└── Relationships
    ├── Block rests_on Ground
    ├── Rope connects Block to Pulley
    └── Pulley attached_to Support

The scene graph should contain explicit relationships.

Avoid returning only a flat list of detected objects.

---

# 11. Scene Graph Data Model

Prefer structured data.

Example:

```python
scene = {
    "objects": [],
    "constraints": [],
    "forces": [],
    "relationships": [],
    "metadata": {}
}