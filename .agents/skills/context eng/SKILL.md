---
name: realis-context-engineering
description: Designs and maintains the REALIS context engineering and AI orchestration layer responsible for collecting, structuring, filtering, compressing, retrieving, validating, and delivering simulation, physics, computer vision, experiment, project, and user interaction context to AI systems. Use this skill whenever implementing or modifying AI context pipelines, prompt construction, context retrieval, memory, RAG, tool selection, structured AI outputs, simulation-aware reasoning, context compression, conversation history, experiment context, or AI-to-simulation communication.
---

# REALIS Context Engineering Skill

## 1. PURPOSE

The REALIS Context Engineering system is responsible for deciding:

"What information should the AI know, in what format, at what level of detail, and at what time?"

The AI should NOT receive the entire REALIS application state blindly.

Instead:

Raw System Data
    ↓
Context Collection
    ↓
Context Selection
    ↓
Context Transformation
    ↓
Context Compression
    ↓
Context Assembly
    ↓
AI
    ↓
Structured Response / Command
    ↓
Validation
    ↓
REALIS Systems


# 2. CORE RESPONSIBILITY

Context Engineering is responsible for:

- Context collection
- Context selection
- Context prioritization
- Context formatting
- Context compression
- Context retrieval
- Conversation context
- Simulation context
- Physics context
- Experiment context
- Computer vision context
- Project context
- User intent
- AI tool context
- Structured prompt construction
- Context validation
- Context budgeting
- Context relevance
- Context freshness
- Context persistence
- AI output parsing
- AI command validation

It should NOT be responsible for:

- Physics calculations
- Rendering
- React UI
- Computer vision inference
- Database business logic
- Direct simulation mutation

It coordinates information between those systems and the AI.


# 3. CORE PRINCIPLE

The AI should receive:

Relevant Context

not:

All Available Context


Use:

RELEVANCE
+
RECENCY
+
IMPORTANCE
+
TASK REQUIREMENTS

to determine what enters the AI context.


# 4. REALIS AI ARCHITECTURE

Recommended architecture:

                    USER
                      │
                      ▼
                USER INTENT
                      │
                      ▼
              CONTEXT ENGINE
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   Simulation      Physics         CV
     Context       Context       Context
        │             │             │
        └─────────────┼─────────────┘
                      ▼
                Experiment
                   Context
                      │
                      ▼
              Context Selection
                      │
                      ▼
              Context Compression
                      │
                      ▼
               Prompt Builder
                      │
                      ▼
                     AI
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
     Explanation          Structured Command
                                  │
                                  ▼
                              Validator
                                  │
                                  ▼
                         Simulation Engine


# 5. CONTEXT LAYERS

REALIS should treat context as multiple layers.

### Layer 1: System Context

Contains:

- REALIS capabilities
- Available tools
- System rules
- Architecture
- Current AI role

### Layer 2: User Context

Contains:

- Current request
- Current intent
- Relevant conversation information
- Current task

### Layer 3: Simulation Context

Contains:

- Current simulation
- Simulation status
- Simulation time
- Active experiment
- Current objects
- Relevant parameters

### Layer 4: Physics Context

Contains only physics information relevant to the current task.

Examples:

- Forces
- Velocities
- Mass
- Position
- Collision events
- Constraints

### Layer 5: Visual Context

Contains:

- Detected objects
- Scene graph
- Geometry
- Relationships
- Relevant CV output

### Layer 6: Historical Context

Contains:

- Previous experiment results
- Previous commands
- Previous snapshots
- Relevant conversation history

### Layer 7: Retrieved Knowledge

Contains:

- Documentation
- Physics explanations
- Engineering references
- REALIS internal documentation

Do not automatically inject every layer into every request.


# 6. CONTEXT SELECTION

For every AI request ask:

1. What is the user asking?
2. What information is required?
3. What information is useful?
4. What information is irrelevant?
5. What information is potentially misleading?
6. What information is stale?
7. What information is authoritative?

Only then build the context.

Example:

User:

"Why did the block stop moving?"

Required:

- Block velocity
- Forces
- Friction
- Collision state
- Simulation time
- Relevant physics events

Not required:

- Entire application state
- UI state
- Camera position
- Unrelated objects
- Previous unrelated conversations


# 7. CONTEXT PRIORITY

Prioritize information approximately as:

1. Current user request
2. Current simulation state
3. Relevant physics state
4. Relevant experiment state
5. Relevant recent events
6. Relevant conversation context
7. Retrieved documentation
8. Older historical information

Current authoritative state must override stale historical information.


# 8. SOURCE AUTHORITY

When multiple sources contain conflicting information, prefer:

1. Authoritative simulation state
2. Authoritative physics state
3. Current experiment state
4. Validated application state
5. Recent user-provided information
6. Retrieved documentation
7. AI-generated assumptions

Never allow the AI to silently treat guesses as authoritative facts.


# 9. CONTEXT FRESHNESS

Every dynamic context item should conceptually have:

- Source
- Timestamp
- Version
- Relevance
- Authority

Example:

```json
{
  "source": "simulation",
  "timestamp": 1723456,
  "version": 42,
  "relevance": 0.98,
  "authority": "authoritative"
}