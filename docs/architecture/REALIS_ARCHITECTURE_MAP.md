# REALIS — Architecture Map & System Audit

> **Status:** Living document. First written 2026-08-22 as the Phase-0 deliverable of the
> REALIS master execution mandate (AUDIT → MAP → determine state → implement in dependency order).
> This is the single north-star reference for the consolidation effort. Update it as phases land.

---

## 0. What REALIS is meant to be

A **unified, physics-based engineering simulation platform** built around one loop:

```
DESIGN → MODEL → CONFIGURE → SIMULATE → MEASURE → ANALYZE → TEST → COMPARE → VALIDATE → EXPORT → EXPLAIN → ITERATE
```

The user designs a mechanism, configures its physical parameters in **canonical SI units**,
runs a **single authoritative physics simulation**, measures real telemetry, analyzes it,
tests it against expectations, and iterates — with an AI assistant operating on the *same real data*.

## 1. Verdict up front (the thing to internalize)

REALIS today is **not one platform — it is a collection of disconnected demos** wearing one shell.
This is the exact anti-pattern the mandate forbids. The audit found:

- **6 independent physics loops** that each own play/step/reset in their own way.
- **3 mutually incompatible solver interface families** across 13 solvers, with **no shared base**.
- **2 clashing unit / gravity conventions** (screen-pixel *y-down +9.81* vs SI *y-up −9.81*) living under one "engine" umbrella that *claims* SI.
- **≥5 places** a body's position is represented (`objects`, `shapes3D`, `renderBodies`, `simulationFrames[].states`, plus Analyze/Test private copies).
- Real **dead + broken code** (`designToPhysicsWorldAdapter.js` is TS-in-a-`.js`-file, zero callers) and a **fake solver behind a dead branch** (`mechanicalAssemblySolver`).

**Therefore the real work is Phase 1–3 consolidation** (one canonical scene, one physics authority,
one telemetry/timeline contract), **not** Phase 6–8 greenfield. Do not build the AI assistant or
"final integration" on top of six diverging simulators.

### Deployment verdict
The `web/` app is **self-contained, JS-first**. The Python/FastAPI backend is **optional** (3-second
timeout with a client-side JS fallback). There is **no WASM**. The C++ engine is a **separate, dormant
desktop product**, effectively **dead relative to the web app** (a possible *future* WASM target, not a
current dependency). All consolidation happens in `web/`.

---

## 2. Component inventory (`web/`)

```
web/src/
├── App.jsx                      renders <AppLayout/>
├── layouts/AppLayout.jsx        Navbar, ActivityBar, Sidebar, WorkspaceRenderer, overlays, undo/redo hotkeys
├── workspaces/
│   ├── WorkspaceRenderer.jsx    switches on store.activeWorkspace
│   ├── DesignWorkspace.jsx      2024 LOC — 2D CAD authoring (+ preview rAF loop)
│   ├── SimulateWorkspace.jsx    984  LOC — nearest-to-canonical sim loop (fixed-step accumulator)
│   ├── AnalyzeWorkspace.jsx     legacy SimulationEngine loop (FPS-tied, gravity 500)
│   └── TestWorkspace.jsx        local Euler loop; writes back into authoring shapes3D
├── components/                  28 files incl. 9 *Lab.jsx (each its own rAF loop) + PropertiesPanel (2481 LOC), Viewport3D (840)
├── hooks/useSimulation.js       backend-batch path + client MechanicsSolver fallback
├── store/useStore.js            583 LOC — Zustand + zundo: THE live scene authority
├── types/
│   ├── simulation.ts            270 LOC — MATURE canonical sim contract — ★ ZERO importers (orphaned)
│   └── physicsWorld.ts          91  LOC — DUPLICATE type authority — only the dead adapter references it
├── models/
│   ├── schema.js                validateModelSchema() — throw-based, for component-library models
│   └── componentLibrary.js
├── services/                    aiAgentLoop, aiExecutor, aiTools, aiValidators, bus (mitt), exportManager,
│                                modelLoader, sceneSerializer, validationService
└── utils/
    ├── physicsEngine.js         524 LOC — functional 2D kernel (the intended shared core); header claims SI, runs pixels
    ├── simulationEngine.js      legacy class engine — only AnalyzeWorkspace uses it
    ├── simulationSafety.js      shared NaN guards / clamp / FIXED_STEP / throttled logger — under-used (3 importers)
    ├── SimulationDemoManager.js preset registry + per-lab config
    ├── v6RenderAdapter.js       correct sim→render separation w/ validation + fallback
    ├── designToPhysicsWorldAdapter.js  DEAD + BROKEN (TS syntax in .js, imports interfaces as values) — 0 callers
    └── solvers/                 13 solvers, ~5031 LOC (see §5)
```

---

## 3. State authority map — `store/useStore.js`

Zustand store wrapped in `zundo` temporal (undo/redo). **This is the live scene single source of truth.**

| Field | Meaning / convention | Notes |
|---|---|---|
| `objects[]` | 2D CAD entities, **pixel coords** (`x/y/cx/cy/r`) | authoring space |
| `shapes3D[]` | 3D primitives (sphere/box/cylinder) | authoring space; sim loops also **write render transforms back here** |
| `constraints[]`, `layers[]`, `materials{}` | 7 SI material presets | materials are genuinely SI |
| `simulationSettings` | `gravity {x:0, y:9.81, z:0}` — **+y = down (screen convention)**, `timeStep 0.016`, `solverIterations 10`, `subSteps 1`, `groundY 0`, `airResistance`, `frictionCoeff`, `ambientTemp 20`, `timeScale 1.0` | **≠ simulation.ts default** (`gravity y:-9.81`, SI y-up) |
| `simulationState{}`, `simulationFrames[]`, `currentFrameIndex` | timeline / playback | `simulationState.time` is a *write-target mirror*, not an authoritative clock |
| `isPlaying` | shared play flag, integrates zundo pause/resume | **every loop subscribes independently** — a shared flag, not a shared owner |
| `energyHistory[]` | 200-entry ring buffer | |
| `activeWorkspace` | current workspace — single source of truth | |
| `activeModelControls[]`, `analysisSettings`, `debugPhysics`, `aiMemory` (10-ring) | | |

**Known stubs / violations in the store**
- `saveHistorySnapshot: () => {}` — **no-op**, yet called ~9×.
- `fileTree` — hardcoded **fake C++ tree** (lines ~357-386).
- `fps: 60` — static, not measured.
- Serialization (§4) claimed `units:'SI'` but writes mixed pixel + SI bodies.
- **Uncommitted WIP** inverts zundo tracking in `setIsPlaying`/`togglePlayback` (`if playing → resume` instead of `→ pause`) — see §8.

---

## 4. Serialization boundary — `exportSceneJSON` / `importSceneJSON`

The one well-contained persistence seam (useStore.js ~536-577). Consumed **only** by
`SimulateWorkspace.jsx` (export at :500, import at :524 — *return value ignored*).

**Before Phase 1:**
- `export` wrote `metadata.version:'1.0'`, `world.units:'SI'`, `bodies:[...objects, ...shapes3D]`.
- `import` re-split bodies by heuristic (`if b.position || type==='sphere' || b.params → shape3D else CAD`),
  **called `clearDesign()` before parsing** (bad file ⇒ wipes current design *then* fails), swallowed
  errors to `console.error` + `return false`. **No schemaVersion, no migration, no `{valid,errors,warnings}`.**

**Phase 1 change (landed):** dedicated versioned schema (`models/sceneSchema.js`) — parse → **migrate → validate
*before* any mutation** → structured `{valid, errors, warnings}` result; export stamps `schemaVersion` and
records coordinate space honestly. See §9.

---

## 5. Physics authority map — the core problem

### 5.1 Six competing execution loops

| Authority | Loop | Drives | File |
|---|---|---|---|
| **SimulateWorkspace** *(nearest-canonical)* | TRUE fixed-step accumulator + render interpolation | MechanicsSolver/Thermal `.step()`, V6/assembly `.tick()` → `renderBodies`/`shapes3D` | `workspaces/SimulateWorkspace.jsx` ~257-390 |
| **9 Lab components** | per-component rAF, variable clamped dt | own solver `.step()/.tick()` → local SVG | `components/*Lab.jsx` |
| **useSimulation** | backend batch (`POST /simulate`) + JS fallback | precomputed frames; fallback runs MechanicsSolver batch | `hooks/useSimulation.js:104,179` |
| **AnalyzeWorkspace** | rAF calling fixed `engine.update(0.016)` — **FPS-count-tied (wrong)** | legacy `SimulationEngine` | `workspaces/AnalyzeWorkspace.jsx:16,60` |
| **TestWorkspace** | local Euler rAF; writes results into authoring `shapes3D` | `localBodies` | `workspaces/TestWorkspace.jsx:33,184` |
| **DesignWorkspace** | preview rAF + dynamic MechanicsSolver import | preview only | `workspaces/DesignWorkspace.jsx:143` |

`Viewport3D` `useFrame` is **render-only** (v6 trail interpolation), never integration — good.

### 5.2 Three incompatible solver interface families (no shared base)

1. **WORLD** — `setBodies()` → `step()` *(no arg)* → `getSnapshot()/reset()/updateSettings()`
   → `MechanicsSolver`, `thermalSolver`.
2. **LAB (variable-dt)** — `constructor(config)` → `updateConfig()` → `step(deltaSeconds)` *(returns snapshot)* → `getSnapshot()/reset()`
   → projectile, pendulum, doublePendulum, spring, orbital, inclinedRamp, freeFall, crankSlider.
3. **ACCUMULATOR (real-dt)** — `constructor(config)` → `tick(realDt)` *(internal fixed step)* → `getSnapshot()/reset()/updateConfig()`
   → v6, collision *(also exposes `step`)*, mechanicalAssembly.

No `pause`/`resume`/single-`step` primitive exists on **any** solver — those live only in the store.
There is **no single authoritative sim clock**; every solver keeps its own `this.time`.

> **Phase 2 progress (this session):** `web/src/utils/solverInterface.js` now provides the canonical
> handle — `createSolverHandle(solver, {family})` returns `{ step(dt), getSnapshot(), reset(),
> updateConfig(), setBodies(), pause()/resume()/isPaused(), getTime()/getFrame(), family }`. It
> dispatches to all three families (explicit `family`, else auto-detect: `tick`→ACCUM, else `step`
> arity 0→WORLD / ≥1→LAB — verified against all 13 solvers, incl. the dual-interface
> `collisionSolver`/`mechanicalAssemblySolver`), owns the single monotonic clock, adds handle-level
> pause/resume, and guards/clamps `dt` via `simulationSafety`. First adoption: **`FreeFallLab.jsx`**
> (behavior-identical — LAB `step()` already returns `getSnapshot()`). Tests: `solverInterface.test.mjs`
> (13 cases) + python3 logic-mirror (18/18, 6/6). **Not yet adopted** by the other 8 loops or the store
> pause/resume — that migration is build-gated (§11).

### 5.3 Per-solver taxonomy

| Solver | Model | Integrator | Family | Quality |
|---|---|---|---|---|
| MechanicsSolver | multibody + PBD constraints + impulse collisions | Symplectic Euler (via physicsEngine) | WORLD | KEEP/REFACTOR — best canonical-world candidate; **couples to `useStore`**, runs pixel units (`groundY 600`) |
| thermalSolver | heat diffusion | explicit diffusion | WORLD | KEEP |
| projectileSolver | analytical closed-form + Euler reference | analytical + semi-implicit Euler | LAB | KEEP (accurate) |
| pendulumSolver | nonlinear θ″=−(g/L)sinθ + elliptic-integral period | semi-implicit Euler, 8 substeps | LAB | KEEP |
| doublePendulumSolver | coupled Lagrangian EOM | **RK4**, 8 substeps | LAB | KEEP |
| springOscillatorSolver | forced SHO + analytical twin | **RK4**, 4 substeps | LAB | KEEP — `step()` returns void (sibling inconsistency) |
| orbitalSolver | Newtonian two-body | **RK4** fixed dt, **km units** | LAB | KEEP |
| inclinedRampSolver | RK4 + exact stick/slip event detection | **RK4** + bisection | LAB | KEEP (excellent) |
| freeFallSolver | analytical impact + restitution bounce | semi-implicit Euler, 4 substeps | LAB | KEEP |
| crankSliderSolver | analytical pos/vel/accel, integrates θ | Euler / RK4 | LAB | KEEP — NaN geometry guards present |
| collisionSolver | exact 1D impulse + Euler positions | impulse + Euler, **accumulator dt 1/240** | ACCUM | KEEP |
| v6PhysicsSolver | crank dynamics (torque/inertia, combustion, PID governor) + slider-crank kinematics | semi-implicit Euler, **accumulator dt 1/240** | ACCUM | KEEP |
| mechanicalAssemblySolver | **prescribed sinusoid + PD follower — NOT dynamics** | Euler follower, accumulator | ACCUM | **DEPRECATE** — fake solver, keyed off brittle `id/label` string match, behind a **dead branch** (`shaft_ring_assembly` preset does not exist) |

Supporting kernels: `physicsEngine.js` (functional 2D core — the intended shared kernel; header claims SI
but uses pixel `groundY 600`), `simulationEngine.js` (legacy — **REMOVE** after Analyze migrates).

### 5.4 Units & gravity — the convention clash (rule 3.3 hotspot)

- **Screen-space, y-down, +9.81**, pixel distances: `physicsEngine.js`, `simulationEngine.js`, all presets, `MechanicsSolver` (`groundY 600`).
- **Physical, y-up, applied as −g**, genuine SI meters: all LAB solvers.
- **Nonphysical:** `AnalyzeWorkspace` uses `gravity 500`.
- **Double sign-flip** across backend boundary: `useSimulation.js:104` then `:181`.
- `physicsEngine.js:3` **declares** canonical SI m/kg/s while running pixels — the header is aspirational, not true.

### 5.5 Diagnostics (rule 3.4 hotspot)
No central watchdog. NaN/Infinity handled **inline and silently** — `physicsEngine.integrate` clamps
`V_MAX 500 / W_MAX 100` and sanitizes in place; `v6RenderAdapter` falls back to last-valid with throttled
logs. **Instability is hidden (clamped), never surfaced to the UI.** `simulationSafety.js` has the right
primitives but only 3 importers.

---

## 6. Telemetry, Analyze, Test, AI (Phase 3 / 6 surfaces)

- **Telemetry:** `energyHistory` (store ring buffer, sampled) + per-solver snapshots. No unified `SimTelemetry`
  channel despite `simulation.ts` defining `SimTelemetry`/`BodyTelemetry` (netForce, kineticEnergy) — orphaned.
- **Analyze/Test:** run their **own** simulators (see §5.1), so measured data can diverge from what SimulateWorkspace produced. This breaks MEASURE→ANALYZE→TEST fidelity.
- **AI (`services/ai*`):** agent loop + tools + validators exist; must be pointed at the *canonical* telemetry/scene once §5 is consolidated, not at a private path (rule 3.5).

---

## 7. Rule-by-rule violation ledger

| Rule | Status | Evidence |
|---|---|---|
| 3.1 one source of truth | ✗ | body position in ≥5 stores; duplicate type authorities `simulation.ts` vs `physicsWorld.ts` |
| 3.2 physics authority | ✗ | 6 loops, 3 engines; renderer NOT an engine (the one bright spot) |
| 3.3 canonical SI | ✗ | pixel vs SI split; `units:'SI'` claim is false; gravity 500 |
| 3.4 no silent failures | ✗ | NaN silently clamped; backend failure → console.warn only; import swallows errors |
| 3.5 no fake functionality | ✗ | `mechanicalAssemblySolver` fake + dead branch; `fileTree` fake; `fps` static; `saveHistorySnapshot` no-op |
| 3.6 preserve working fn | ⚠ | import `clearDesign()`-before-validate can destroy a good design on a bad file |
| 3.7 shared-state discipline | ⚠ | store is high-traffic; uncommitted WIP present (§8) — edit surgically |
| 3.8 determinism | ⚠ | LAB solvers variable-dt (not deterministic); accumulator solvers OK |
| 3.9 float tolerance | n/a yet | needs test harness |
| 3.10 no premature abstraction | ✓ | keep |

---

## 8. ⚠ Uncommitted work-in-progress (do not clobber — rule 3.7)

At audit time the working tree had **uncommitted** changes NOT made by this effort:

- `M web/src/store/useStore.js` — **inverts zundo undo-tracking** in `setIsPlaying` + `togglePlayback`:
  changed `if (playing) pause(); else resume();` → `if (playing) resume(); else pause();`.
  *Effect:* history recording is now ON during playback. If the sim mutates store state every frame,
  this floods the 50-entry undo ring with physics frames. **Looks like a regression; flagged for owner review.**
- `?? web/src/types/physicsWorld.ts` — untracked; duplicate type authority.
- `?? web/src/utils/designToPhysicsWorldAdapter.js` — untracked; **dead + non-executable** (TS syntax in `.js`,
  imports interfaces as runtime values, gravity default +9.81, and a latent bug pushing raw quaternion as
  `angularState`). Zero callers.

These three are **owner decisions** (untracked deletions are irrecoverable; the store edit may be intentional),
so they are surfaced rather than removed unilaterally.

---

## 9. Current implementation state by phase

| Phase | Title | State | Gap |
|---|---|---|---|
| 1 | Canonical Scene + Design | **partial** | store is authoritative but serialization was lossy/unsafe; duplicate type authorities exist |
| 2 | Physics + Simulation | **fragmented → foundation landed** | canonical solver handle + single clock + pause/resume exist (`solverInterface.js`), piloted in `FreeFallLab`; 8 loops + store not yet migrated; SI/units + watchdog still open |
| 3 | Telemetry + Analyze + Test + AI-data | **fragmented** | each surface runs its own sim; `SimTelemetry` orphaned |
| 4 | Unified Lab Platform | **façade** | 9 labs are independent demos behind one shell |
| 5 | Experiments + Advanced Analysis | **absent/partial** | depends on 2+3 |
| 6 | AI Engineering Assistant | **scaffold** | services exist; not bound to canonical data |
| 7 | Performance + Hardening | **premature** | cannot optimize before 3 (observability) |
| 8 | Final Integration | **blocked** | needs 1-3 done + end-to-end validation |

---

## 10. Dependency-ordered plan

**Phase 1 — Canonical Scene (in progress this session).** Promote `simulation.ts` as the one runtime sim
contract; add a **versioned persisted-scene schema** with migration + `{valid,errors,warnings}` (validate
*before* mutate); retire the duplicate `physicsWorld.ts` + dead adapter (pending owner nod, §8); document the
gravity/units convention in ONE place.

**Phase 2 — One Physics Authority.** Define a **single solver interface** (`init/reset/updateConfig/step(dt)/getSnapshot` + `pause/resume`)
and a **single sim clock** ✅ *(`solverInterface.js` — done + tested; piloted in `FreeFallLab`)*; **remaining:** migrate the
other 8 loops + the store's play/pause onto the handle (build-gated, one at a time); adopt canonical SI end-to-end with an
explicit **UI↔SI adapter** (kill the pixel/SI ambiguity); make `MechanicsSolver` the canonical world solver decoupled from
`useStore`; retire `simulationEngine.js`; add a **central instability watchdog** that surfaces divergence to the UI.

**Phase 3 — One Telemetry/Timeline.** Route Analyze + Test through the canonical frames/telemetry; implement the
orphaned `SimTelemetry`/`BodyTelemetry`; replace `fps`/`saveHistorySnapshot`/`fileTree` stubs with real data.

**Phase 4-8** proceed only behind their gates (don't build 6 on a broken 2; don't optimize 7 before 3; don't
declare 8 without end-to-end validation).

---

## 11. ⚙ Environmental constraint — verification cannot run in this session

`node`, `npm`, `npx`, `bun`, `deno` are **all absent** from PATH; no version manager; network is locked to
`agentrouter.org` + `api.anthropic.com`. Therefore **`vite build`, `eslint`, and JS tests cannot be executed
here.** All changes in this effort are made **static-correct and additive/backward-compatible**, and every
change ships with the exact commands to run in a proper Node environment (see the quality-gate block in each
phase report). Runtime verification (§24 acceptance) is the owner's to run.
