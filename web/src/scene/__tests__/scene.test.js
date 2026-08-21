// Canonical scene tests — run with Node's built-in runner (no new deps):
//   node --test src/scene/__tests__/
//
// These cover the failure modes that actually shipped:
//   • export emitting an empty object list (the data-loss bug)
//   • export/import key mismatch dropping gravity and timestep
//   • 3D shapes collapsing into 2D drafts on import
//   • no validation of ids, dangling refs, mass, or ranges

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCanonicalScene, applyCanonicalScene, SCHEMA_VERSION } from '../buildCanonicalScene.js';
import { validateScene } from '../validateScene.js';
import { serializeScene, deserializeScene, migrateScene } from '../serialization.js';
import { GeometryKind } from '../geometry.js';
import { Severity } from '../diagnostics.js';
import { degreesToRadians, gravityFromLegacyStore, EARTH_GRAVITY } from '../units.js';

/** Minimal but representative editor state: one 2D draft + one 3D shape. */
function makeState(overrides = {}) {
  return {
    objects: [
      {
        id: 'rect1',
        type: 'rect',
        name: 'Rect 1',
        x: 100, y: 200, width: 300, height: 400,
        rotation: 90,
        depth: 50,
        mass: 2, restitution: 0.4, friction: 0.6, isStatic: false,
        fill: '#ff0000'
      }
    ],
    shapes3D: [
      {
        id: 'cube1',
        type: 'cube',
        name: 'Cube 1',
        position: [1, 2, 3],
        rotation: [0, Math.PI / 2, 0],
        scale: [1, 1, 1],
        params: { width: 10, height: 20, depth: 30 },
        color: '#00ff00',
        mass: 5, restitution: 0.7, friction: 0.2, isStatic: false
      }
    ],
    constraints: [],
    materials: {
      steel: { density: 7850, restitution: 0.2, static_friction: 0.4, dynamic_friction: 0.3 }
    },
    layers: [{ id: 'default', name: 'Layer 0', color: '#3b82f6', visible: true, locked: false }],
    activeLayerId: 'default',
    simulationSettings: { gravity: { x: 0, y: 9.81, z: 0 }, timeStep: 0.016, subSteps: 2, solverIterations: 10 },
    scene: { metadata: { id: 's1', name: 'Test Scene', createdAt: '2020-01-01T00:00:00.000Z' } },
    ...overrides
  };
}

// ── The data-loss bug ─────────────────────────────────────────────────

test('buildCanonicalScene populates objects (regression: export emitted an empty list)', () => {
  const scene = buildCanonicalScene(makeState());
  assert.equal(scene.objects.length, 2, 'both the 2D draft and the 3D shape must be projected');
  assert.deepEqual(scene.objects.map((o) => o.id).sort(), ['cube1', 'rect1']);
});

test('serializeScene output contains the user geometry', () => {
  const json = serializeScene(makeState());
  const parsed = JSON.parse(json);
  assert.equal(parsed.scene.objects.length, 2);
  assert.notDeepEqual(parsed.scene.objects, []);
});

test('serializeScene records the current schema version', () => {
  const parsed = JSON.parse(serializeScene(makeState()));
  assert.equal(parsed.scene.metadata.schemaVersion, SCHEMA_VERSION);
});

// ── Projection correctness ────────────────────────────────────────────

test('2D rect projects from top-left to a centred canonical transform', () => {
  const scene = buildCanonicalScene(makeState(), { pixelsPerMetre: 100 });
  const rect = scene.objects.find((o) => o.id === 'rect1');
  // centre_x = x + width/2 = 100 + 150 = 250 px = 2.5 m
  assert.equal(rect.transform.position.x, 2.5);
  // centre_z = y + height/2 = 200 + 200 = 400 px = 4.0 m
  assert.equal(rect.transform.position.z, 4);
  assert.equal(rect.geometry.kind, GeometryKind.BOX);
  // Dimensions share the transform's unit system: metres, never pixels.
  assert.equal(rect.geometry.dimensions.x, 3);
  assert.equal(rect.geometry.dimensions.z, 4);
  assert.equal(rect.geometry.dimensions.y, 0.5);
});

test('2D geometry is expressed in metres, matching the transform units', () => {
  // Regression: dimensions were emitted in pixels while position was in metres,
  // so physics saw a 300 m box at 2.5 m and each save multiplied size by 100.
  const scene = buildCanonicalScene(makeState(), { pixelsPerMetre: 100 });
  const rect = scene.objects.find((o) => o.id === 'rect1');
  assert.ok(rect.geometry.dimensions.x < 10, `expected metres, got ${rect.geometry.dimensions.x}`);
  const scaled = buildCanonicalScene(makeState(), { pixelsPerMetre: 200 });
  assert.equal(scaled.objects.find((o) => o.id === 'rect1').geometry.dimensions.x, 1.5);
});

test('2D degrees rotation converts to canonical radians about the vertical axis', () => {
  const scene = buildCanonicalScene(makeState());
  const rect = scene.objects.find((o) => o.id === 'rect1');
  assert.equal(rect.transform.rotation.y, -degreesToRadians(90));
  assert.equal(rect.transform.rotation.x, 0);
});

test('3D shape keeps its radians rotation and array position', () => {
  const scene = buildCanonicalScene(makeState());
  const cube = scene.objects.find((o) => o.id === 'cube1');
  assert.deepEqual(cube.transform.position, { x: 1, y: 2, z: 3 });
  assert.equal(cube.transform.rotation.y, Math.PI / 2);
  assert.equal(cube.origin, 'native3d');
});

test('gravity is converted from the store down-positive to canonical up-positive', () => {
  const scene = buildCanonicalScene(makeState());
  assert.equal(scene.environment.gravity.y, -EARTH_GRAVITY);
  assert.equal(gravityFromLegacyStore({ x: 0, y: 9.81, z: 0 }).y, -9.81);
});

test('3D scale folds into geometry dimensions and is not double-applied', () => {
  const state = makeState();
  state.shapes3D[0].scale = [2, 3, 4];
  const scene = buildCanonicalScene(state);
  const cube = scene.objects.find((o) => o.id === 'cube1');
  assert.equal(cube.geometry.dimensions.x, 20);
  assert.equal(cube.geometry.dimensions.y, 60);
  assert.equal(cube.geometry.dimensions.z, 120);
  assert.deepEqual(cube.transform.scale, { x: 1, y: 1, z: 1 });
});

test('annotations get zero mass and are marked non-simulable', () => {
  const state = makeState({
    objects: [{ id: 'dim1', type: 'dimension', x1: 0, y1: 0, x2: 100, y2: 0, mass: 5 }],
    shapes3D: []
  });
  const scene = buildCanonicalScene(state);
  const dim = scene.objects[0];
  assert.equal(dim.geometry.kind, GeometryKind.ANNOTATION);
  assert.equal(dim.physical.mass, 0);
  assert.equal(dim.physical.simulable, false);
});

test('material map projects to the canonical array with both friction fields', () => {
  const scene = buildCanonicalScene(makeState());
  const steel = scene.materials.find((m) => m.id === 'steel');
  assert.equal(steel.staticFriction, 0.4);
  assert.equal(steel.dynamicFriction, 0.3);
  assert.equal(steel.density, 7850);
});

test('constraint reference aliases all normalize to objectA/objectB', () => {
  const state = makeState({
    constraints: [
      { id: 'c1', type: 'distance', targetA: 'rect1', targetB: 'cube1', distance: 5 },
      { id: 'c2', type: 'hinge', bodyA: 'rect1', bodyB: 'cube1' },
      { id: 'c3', type: 'fixed', bodyAId: 'rect1', bodyBId: 'cube1' }
    ]
  });
  const scene = buildCanonicalScene(state);
  for (const c of scene.constraints) {
    assert.equal(c.objectA, 'rect1', `${c.id} objectA`);
    assert.equal(c.objectB, 'cube1', `${c.id} objectB`);
  }
  assert.equal(scene.constraints[0].parameters.distance, 5);
});

test('canonical scene excludes UI and runtime state', () => {
  const state = makeState({
    selectedIds: ['rect1'], activeTool: 'select', camera: { zoom: 2 },
    isPlaying: true, simTime: 12.5, simulationFrames: [{}, {}]
  });
  const scene = buildCanonicalScene(state);
  const keys = Object.keys(scene);
  for (const forbidden of ['selectedIds', 'activeTool', 'camera', 'isPlaying', 'simTime', 'simulationFrames']) {
    assert.ok(!keys.includes(forbidden), `canonical scene must not carry "${forbidden}"`);
  }
  assert.equal(JSON.stringify(scene).includes('simulationFrames'), false);
});

// ── Round trip ────────────────────────────────────────────────────────

test('round trip restores 3D shapes as 3D, not collapsed into 2D drafts', () => {
  const json = serializeScene(makeState());
  const result = deserializeScene(json);
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics, null, 2));
  assert.equal(result.applied.shapes3D.length, 1, '3D shape must return to shapes3D');
  assert.equal(result.applied.objects.length, 1, '2D draft must return to objects');
  assert.equal(result.applied.shapes3D[0].id, 'cube1');
  assert.equal(result.applied.objects[0].id, 'rect1');
});

test('round trip preserves 3D position, rotation and physics', () => {
  const result = deserializeScene(serializeScene(makeState()));
  const cube = result.applied.shapes3D[0];
  assert.deepEqual(cube.position, [1, 2, 3]);
  assert.ok(Math.abs(cube.rotation[1] - Math.PI / 2) < 1e-12);
  assert.equal(cube.mass, 5);
  assert.equal(cube.restitution, 0.7);
  assert.equal(cube.friction, 0.2);
});

test('round trip preserves 2D rect geometry and degrees rotation', () => {
  const result = deserializeScene(serializeScene(makeState()));
  const rect = result.applied.objects[0];
  assert.ok(Math.abs(rect.x - 100) < 1e-9, `x was ${rect.x}`);
  assert.ok(Math.abs(rect.y - 200) < 1e-9, `y was ${rect.y}`);
  assert.ok(Math.abs(rect.width - 300) < 1e-9);
  assert.ok(Math.abs(rect.height - 400) < 1e-9);
  assert.ok(Math.abs(rect.rotation - 90) < 1e-9, `rotation was ${rect.rotation}`);
});

test('round trip preserves circle radius through the r/radius split', () => {
  const state = makeState({
    objects: [{ id: 'c1', type: 'circle', cx: 500, cy: 600, r: 75, depth: 0, mass: 1 }],
    shapes3D: []
  });
  const result = deserializeScene(serializeScene(state));
  const circle = result.applied.objects[0];
  assert.ok(Math.abs(circle.cx - 500) < 1e-9);
  assert.ok(Math.abs(circle.cy - 600) < 1e-9);
  assert.ok(Math.abs(circle.r - 75) < 1e-9, `r was ${circle.r}`);
});

test('round trip preserves layers and constraints', () => {
  const state = makeState({
    constraints: [{ id: 'c1', type: 'distance', targetA: 'rect1', targetB: 'cube1', distance: 12 }]
  });
  const result = deserializeScene(serializeScene(state));
  assert.equal(result.applied.constraints.length, 1);
  assert.equal(result.applied.constraints[0].targetA, 'rect1');
  assert.equal(result.applied.constraints[0].distance, 12);
  assert.equal(result.applied.layers.length, 1);
  assert.equal(result.applied.activeLayerId, 'default');
});

test('serialization is deterministic for identical state', () => {
  const a = serializeScene(makeState(), { now: '2024-01-01T00:00:00.000Z' });
  const b = serializeScene(makeState(), { now: '2024-01-01T00:00:00.000Z' });
  assert.equal(a, b);
});

// ── Validation ────────────────────────────────────────────────────────

test('a scene built from valid state validates clean', () => {
  const result = validateScene(buildCanonicalScene(makeState()));
  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.errors.length, 0);
});

test('validateScene never mutates its input', () => {
  const scene = buildCanonicalScene(makeState());
  const before = JSON.stringify(scene);
  validateScene(scene);
  assert.equal(JSON.stringify(scene), before);
});

test('validateScene reports null scene as FATAL instead of throwing', () => {
  const result = validateScene(null);
  assert.equal(result.valid, false);
  assert.equal(result.errors[0].severity, Severity.FATAL);
  assert.equal(result.errors[0].code, 'SCENE_MISSING');
});

test('duplicate object ids are an error naming the id', () => {
  const scene = buildCanonicalScene(makeState());
  scene.objects[1].id = scene.objects[0].id;
  const result = validateScene(scene);
  assert.equal(result.valid, false);
  const dup = result.errors.find((e) => e.code === 'SCENE_DUPLICATE_ID');
  assert.ok(dup, 'expected SCENE_DUPLICATE_ID');
  assert.equal(dup.objectId, 'rect1');
});

test('dangling constraint reference is an error identifying the missing object', () => {
  const scene = buildCanonicalScene(makeState());
  scene.constraints = [{ id: 'c1', type: 'distance', objectA: 'rect1', objectB: 'ghost', parameters: {} }];
  const result = validateScene(scene);
  assert.equal(result.valid, false);
  const dangling = result.errors.find((e) => e.code === 'CONSTRAINT_DANGLING_REF');
  assert.ok(dangling);
  assert.equal(dangling.objectId, 'ghost');
  assert.equal(dangling.constraintId, 'c1');
});

test('self-referencing constraint is an error', () => {
  const scene = buildCanonicalScene(makeState());
  scene.constraints = [{ id: 'c1', type: 'fixed', objectA: 'rect1', objectB: 'rect1', parameters: {} }];
  const result = validateScene(scene);
  assert.ok(result.errors.some((e) => e.code === 'CONSTRAINT_SELF_REFERENCE'));
});

test('dynamic body with zero mass is an error', () => {
  const scene = buildCanonicalScene(makeState());
  scene.objects[0].physical.mass = 0;
  scene.objects[0].physical.isStatic = false;
  const result = validateScene(scene);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === 'SCENE_ZERO_MASS_DYNAMIC'));
});

test('negative mass is an error', () => {
  const scene = buildCanonicalScene(makeState());
  scene.objects[0].physical.mass = -3;
  const result = validateScene(scene);
  assert.ok(result.errors.some((e) => e.code === 'SCENE_NEGATIVE_MASS'));
});

test('NaN in a transform is reported, not silently accepted', () => {
  const scene = buildCanonicalScene(makeState());
  scene.objects[0].transform.position.x = NaN;
  const result = validateScene(scene);
  assert.equal(result.valid, false);
  const nan = result.errors.find((e) => e.code === 'SCENE_NON_FINITE_VALUE');
  assert.ok(nan);
  assert.equal(nan.path, 'objects[0].transform.position.x');
});

test('Infinity in a transform is reported', () => {
  const scene = buildCanonicalScene(makeState());
  scene.objects[0].transform.position.y = Infinity;
  assert.equal(validateScene(scene).valid, false);
});

test('restitution above 1 warns (energy injection) without blocking', () => {
  const scene = buildCanonicalScene(makeState());
  scene.objects[0].physical.restitution = 1.5;
  const result = validateScene(scene);
  assert.equal(result.valid, true, 'a warning must not block simulation');
  assert.ok(result.warnings.some((w) => w.code === 'SCENE_COEFFICIENT_OUT_OF_RANGE'));
});

test('negative restitution is an error', () => {
  const scene = buildCanonicalScene(makeState());
  scene.objects[0].physical.restitution = -0.2;
  assert.equal(validateScene(scene).valid, false);
});

test('zero scale component is an error (degenerate geometry)', () => {
  const scene = buildCanonicalScene(makeState());
  scene.objects[0].transform.scale.y = 0;
  const result = validateScene(scene);
  assert.ok(result.errors.some((e) => e.code === 'SCENE_DEGENERATE_SCALE'));
});

test('invalid timestep is an error and a large one warns', () => {
  const bad = buildCanonicalScene(makeState());
  bad.simulationSettings.dt = 0;
  assert.ok(validateScene(bad).errors.some((e) => e.code === 'SIM_INVALID_TIMESTEP'));

  const big = buildCanonicalScene(makeState());
  big.simulationSettings.dt = 0.5;
  const result = validateScene(big);
  assert.equal(result.valid, true);
  assert.ok(result.warnings.some((w) => w.code === 'SIM_LARGE_TIMESTEP'));
});

test('dangling material reference warns and names the material', () => {
  const scene = buildCanonicalScene(makeState());
  scene.objects[0].materialId = 'unobtainium';
  const result = validateScene(scene);
  const w = result.warnings.find((x) => x.code === 'SCENE_DANGLING_MATERIAL_REF');
  assert.ok(w);
  assert.equal(w.metadata.actual, 'unobtainium');
});

test('validateScene accumulates every problem rather than stopping at the first', () => {
  const scene = buildCanonicalScene(makeState());
  scene.objects[0].physical.mass = -1;
  scene.objects[1].id = scene.objects[0].id;
  scene.constraints = [{ id: 'c1', type: 'distance', objectA: 'nope', parameters: {} }];
  const result = validateScene(scene);
  const codes = new Set(result.errors.map((e) => e.code));
  assert.ok(codes.has('SCENE_NEGATIVE_MASS'));
  assert.ok(codes.has('SCENE_DUPLICATE_ID'));
  assert.ok(codes.has('CONSTRAINT_DANGLING_REF'));
  assert.ok(result.errors.length >= 3);
});

// ── Migration & import safety ─────────────────────────────────────────

test('migrateScene passes a current-version scene through untouched', () => {
  const scene = buildCanonicalScene(makeState());
  const { scene: out, migratedFrom } = migrateScene({ scene });
  assert.equal(migratedFrom, SCHEMA_VERSION);
  assert.equal(out, scene);
});

test('migrateScene upgrades a v1 scene and infers the origin discriminator', () => {
  const v1 = {
    metadata: { schemaVersion: '1', name: 'old' },
    objects: [
      { id: 'a', type: 'cube', params: { width: 1 }, transform: {} },
      { id: 'b', type: 'rect', transform: {} }
    ]
  };
  const { scene, migratedFrom, diagnostics } = migrateScene({ scene: v1 });
  assert.equal(migratedFrom, '1');
  assert.equal(scene.metadata.schemaVersion, SCHEMA_VERSION);
  assert.equal(scene.objects[0].origin, 'native3d');
  assert.equal(scene.objects[1].origin, 'draft2d');
  assert.ok(diagnostics.some((d) => d.code === 'IMPORT_MIGRATED'));
});

test('migrateScene flags a pre-versioned legacy payload', () => {
  const { diagnostics } = migrateScene({ scene: { objects: [], world: { gravity: { x: 0, y: -9.81, z: 0 } } } });
  assert.ok(diagnostics.some((d) => d.code === 'IMPORT_MIGRATED_LEGACY'));
});

test('a future schema version is refused rather than silently mangled', () => {
  const { scene, diagnostics } = migrateScene({ scene: { metadata: { schemaVersion: '999' } } });
  assert.equal(scene, null);
  assert.ok(diagnostics.some((d) => d.code === 'IMPORT_UNSUPPORTED_VERSION'));
});

test('malformed JSON is reported and applies nothing (no destructive clear)', () => {
  const result = deserializeScene('{ not json');
  assert.equal(result.ok, false);
  assert.equal(result.applied, null, 'nothing may be applied when the file is unreadable');
  assert.ok(result.diagnostics.some((d) => d.code === 'IMPORT_PARSE_FAILED'));
});

test('an invalid scene applies nothing and reports why', () => {
  const scene = buildCanonicalScene(makeState());
  scene.objects[1].id = scene.objects[0].id;
  const result = deserializeScene(JSON.stringify({ scene }));
  assert.equal(result.ok, false);
  assert.equal(result.applied, null);
  assert.ok(result.diagnostics.some((d) => d.code === 'SCENE_DUPLICATE_ID'));
});

test('applyCanonicalScene tolerates a null scene without throwing', () => {
  const out = applyCanonicalScene(null);
  assert.deepEqual(out.objects, []);
  assert.deepEqual(out.shapes3D, []);
});

test('empty state produces a valid empty scene', () => {
  const scene = buildCanonicalScene({});
  assert.deepEqual(scene.objects, []);
  assert.equal(validateScene(scene).valid, true);
});
