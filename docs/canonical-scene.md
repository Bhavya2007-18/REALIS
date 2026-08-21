# Canonical Scene (Phase 1)

Owner: **Agent 1 — Design**. Agents 2 and 3 consume this contract; changes to it
follow the §1.7 shared-contract protocol.

The scene answers one question: **what exists in the physical world?** Not what is
selected, not what is being looked at, not what is currently happening.

## The direction of truth

```
objects[] + shapes3D[]  ──buildCanonicalScene──▶  CanonicalScene  ──serializeScene──▶  JSON
   (authoritative,              (pure)              (derived)                          (on disk)
    mutable, in the store)                                             ◀──deserializeScene──
```

The editor's operational arrays are the **one** authoritative mutable source for
geometry. The canonical scene is a **derived projection**, rebuilt on demand — it
is never a second mutable copy. This is what makes "one concept = one canonical
representation" (§1.3) true in practice rather than only on paper: there is no
`DesignObject` / `PhysicsObject` / `SimulationObject` triple to keep in sync,
because there is only ever one mutable representation and one function that
projects it.

Consequence: never write to `state.scene.objects`. It does not exist as state.
Call `getCanonicalScene()` when you need the canonical form.

## Modules

All of these are **pure** — no THREE.js, React, or store imports — so they run
under `node --test` with zero extra dependencies and produce identical output for
identical input (§1.9).

| Module | Responsibility |
|---|---|
| `units.js` | The single declaration of the SI convention, plus the legacy conversions. |
| `diagnostics.js` | The structured error model of §16: `Severity`, `Category`, `diagnostic()`. |
| `geometry.js` | Reads either schema and produces one canonical geometry description. |
| `entity.js` | Ids, deterministic names, clones, constraint pruning. |
| `buildCanonicalScene.js` | The projection, and its inverse `applyCanonicalScene`. |
| `validateScene.js` | Every scene invariant, reported — never thrown. |
| `serialization.js` | `Scene → JSON → Scene`, schema versioning, migration. |

## Units (§1.8)

Canonically **metres, kilograms, seconds, radians, newtons, joules**, with
gravity **up-positive** (Earth = `y: -9.81`).

Three places deviate, and the deviations are **converted at the boundary, not
silently tolerated**:

| Where | Native form | Converted by |
|---|---|---|
| `objects[]` positions and sizes | pixels | `pixelsToMetres`, via `pixelsPerMetre` (default 100) |
| `objects[]` rotation | degrees, screen-clockwise | `-degreesToRadians(r)` about world Y |
| `simulationSettings.gravity` | **down-positive** (`y: +9.81`) | `gravityFromLegacyStore` / `gravityToLegacyStore` |

The live store's down-positive gravity is Agent 2's contract, so it is converted
rather than changed. Changing it requires the §1.7 protocol.

A canonical object never mixes unit systems: if `transform.position` is in
metres, `geometry.dimensions` is in metres too. Getting this wrong is not
cosmetic — it made physics see a 300 m box sitting at 2.5 m, and multiplied every
saved size by 100 on each round trip. The round-trip test catches it.

## Validation (§4.6, §1.4)

```js
const { valid, errors, warnings, diagnostics } = useStore.getState().validateCurrentScene();
```

`validateScene` **never mutates, never throws, and never stops at the first
problem.** It returns every issue it finds, each naming the entity responsible
(`objectId` / `constraintId` / `path`) so the UI can select it.

- `ERROR` / `FATAL` → `valid: false`. Blocks simulation and export.
- `WARNING` → `valid: true`. Physically suspicious but runnable — e.g. restitution
  above 1 injects energy every bounce, but the user may want it.

Diagnostics land in `state.sceneDiagnostics` and render in
`components/SceneDiagnosticsPanel.jsx`. The status bar always shows the current
verdict; clicking it validates and opens the panel. Clicking a row selects the
offending body. A diagnostic nobody can see is a silent failure with extra steps.

Codes are stable strings (`SCENE_ZERO_MASS_DYNAMIC`, `CONSTRAINT_DANGLING_REF`,
…) so tests and the AI layer match on them instead of parsing prose. Adding a
code is additive; renaming one is a contract change.

## Serialization and schema versioning (§4.7)

```js
const json = useStore.getState().exportSceneJSON();
const { ok, diagnostics } = useStore.getState().importSceneJSON(json);
```

`SCHEMA_VERSION = '2'`.

| Version | Shape | Migration |
|---|---|---|
| absent | pre-versioning: flat arrays, gravity under `world`, no `units` | `migrateLegacyToV2` |
| `'1'` | `transform` present, but no `origin` and no `geometry` | `migrateV1ToV2` (infers `origin`) |
| `'2'` | current: `origin` + `geometry` on every object, explicit `units` | — |

A file newer than `SCHEMA_VERSION` is **refused** (`IMPORT_UNSUPPORTED_VERSION`)
rather than parsed with fields we cannot interpret.

Import is **atomic**: it validates first and applies nothing on failure, so a
malformed or invalid file leaves the current scene exactly as it was. (The
previous importer called `clearDesign()` *before* parsing, so a bad file wiped
the user's work and left nothing to restore.)

Every imported id is passed to `reserveEntityIds` before anything new can be
created, so a body added after an import can never be issued an id the import
already used.

`origin: 'draft2d' | 'native3d'` is what routes each object back to the array it
came from. Without it, a round trip flattens every 3D shape into a 2D draft.

## Entity identity

`withEntityIdentity` in the store is the single mutation boundary that guarantees
the canonical Body invariants: **every body has a unique id, a name, a visibility
flag, and physics values.** The caller's own `id` and `name` always win, so import
and paste keep their identity.

Identity used to be the caller's responsibility. Any path that forgot produced a
body that could not be selected, deleted, constrained, or serialized — and the
failure surfaced much later as a validation error about `objects[0]` with no way
to say which object that was.

`newEntityId` is a monotonic base-36 counter, so a given sequence of operations
always produces the same ids. It previously mixed in `Math.random`, which made
every created scene un-reproducible and every id-bearing assertion unwritable.

## What the canonical scene deliberately excludes

UI state (`selectedIds`, `activeTool`, camera, panel visibility) and runtime state
(`isPlaying`, `simTime`, `simulationFrames`, telemetry). A test asserts this: the
serialized string must not contain `simulationFrames`. Saving runtime state into
the scene is how a "scene file" quietly becomes a session dump.

## Tests

```bash
npm test
```

59 tests over the pure modules — projection, unit conversion, validation (one case
per diagnostic code), migration for each version, and the **Scene → JSON → Scene
round trip**. That round trip is the test that would have caught the original
data-loss bug, and it caught the mixed-units bug while being written.

```bash
node scripts/check-store-roundtrip.mjs
```

22 integration checks that load the real Zustand store through Vite and drive the
actual `exportSceneJSON` / `importSceneJSON` / `validateCurrentScene` actions —
verifying the wiring, not just the modules (§25). Kept out of `npm test` because
it boots Vite.

## Bugs this phase fixed

1. **Export always emitted `objects: []`.** It read `s.scene.objects`, which
   nothing ever wrote. Every save silently discarded the entire scene.
2. **Export/import key mismatch.** Export wrote `scene.simulation`; import read
   `scene.world`. Gravity, timestep and substeps were dropped on every round trip.
3. **3D shapes were unrestorable.** Import pushed everything through
   `addCADObject`, so native 3D geometry came back as 2D drafts.
4. **A malformed file destroyed the scene.** `clearDesign()` ran before parsing.
5. **`schemaVersion` was written but never read.** No migration existed.
6. **No scene validation existed at all.** Zero checks on ids, dangling refs,
   mass, coefficient ranges, or timestep.
7. **Mixed units within one canonical object.** Dimensions in pixels alongside a
   metre-valued transform.
8. **Bodies could be created without an id.**
9. **Non-deterministic ids** via `Math.random`.
10. **The undo partialize snapshotted `scene.objects`/`scene.materials`**, which
    nothing wrote — a duplicate empty payload in every history entry, and a
    second apparent source of truth.
