// Store integration check (master spec §24 step 10 "inspect runtime", §25
// "do not stop at UI"). Loads the REAL Zustand store through Vite's module
// graph — same resolution the browser uses — and drives the actual
// exportSceneJSON / importSceneJSON actions end to end.
//
//   node scripts/check-store-roundtrip.mjs
//
// Kept out of `npm test` because it boots Vite; the pure-module suite in
// src/scene/__tests__ stays dependency-free and fast.

import { createServer } from 'vite';
import assert from 'node:assert/strict';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });

let failures = 0;
function check(label, fn) {
  try {
    fn();
    console.log(`  ok   ${label}`);
  } catch (err) {
    failures++;
    console.log(`  FAIL ${label}\n       ${err.message}`);
  }
}

try {
  const mod = await vite.ssrLoadModule('/src/store/useStore.js');
  const useStore = mod.default;
  const st = () => useStore.getState();

  console.log('\n1. Export carries real geometry');
  st().addShape3D({ type: 'cube', position: [1, 2, 3], params: { width: 10, height: 20, depth: 30 }, mass: 4 });
  st().addCADObject({ type: 'rect', x: 100, y: 200, width: 300, height: 400, rotation: 45, depth: 50, mass: 2 });

  const json = st().exportSceneJSON();
  const parsed = JSON.parse(json);

  check('exportSceneJSON emits both objects', () => assert.equal(parsed.scene.objects.length, 2));
  check('export is not the old empty list', () => assert.notDeepEqual(parsed.scene.objects, []));
  check('export stamps a real updatedAt', () => assert.ok(parsed.scene.metadata.updatedAt));
  check('export declares a schema version', () => assert.ok(parsed.scene.metadata.schemaVersion));

  console.log('\n2. Import restores through the store');
  const before = { objects: st().objects.length, shapes3D: st().shapes3D.length };
  st().setObjects([]);
  st().setShapes3D([]);
  const result = st().importSceneJSON(json);

  check('import reports ok', () => assert.equal(result.ok, true, JSON.stringify(result.diagnostics)));
  check('2D drafts restored to objects[]', () => assert.equal(st().objects.length, before.objects));
  check('3D shapes restored to shapes3D[] (not collapsed to 2D)', () => assert.equal(st().shapes3D.length, before.shapes3D));
  check('3D position survives the round trip', () => assert.deepEqual(st().shapes3D[0].position, [1, 2, 3]));
  check('2D rect position survives the round trip', () => {
    const r = st().objects[0];
    assert.ok(Math.abs(r.x - 100) < 1e-6 && Math.abs(r.y - 200) < 1e-6, `got x=${r.x} y=${r.y}`);
  });
  check('2D rect rotation survives in degrees', () => {
    assert.ok(Math.abs(st().objects[0].rotation - 45) < 1e-6, `got ${st().objects[0].rotation}`);
  });

  console.log('\n3. A bad file does not destroy the scene');
  const snapshot = { objects: st().objects.length, shapes3D: st().shapes3D.length };
  const bad = st().importSceneJSON('{ this is not json');

  check('malformed import reports failure', () => assert.equal(bad.ok, false));
  check('malformed import emits diagnostics', () => assert.ok(bad.diagnostics.length > 0));
  check('objects[] untouched after a failed import', () => assert.equal(st().objects.length, snapshot.objects));
  check('shapes3D[] untouched after a failed import', () => assert.equal(st().shapes3D.length, snapshot.shapes3D));
  check('diagnostics published to the store', () => assert.ok(st().sceneDiagnostics.length > 0));

  console.log('\n4. Gravity survives (old export/import key mismatch)');
  st().setSimulationSettings({ gravity: { x: 0, y: 9.81, z: 0 }, timeStep: 0.008, subSteps: 4 });
  const g = st().exportSceneJSON();
  check('canonical export is up-positive', () => assert.equal(JSON.parse(g).scene.environment.gravity.y, -9.81));
  st().setSimulationSettings({ gravity: { x: 0, y: 1, z: 0 }, timeStep: 0.5, subSteps: 1 });
  st().importSceneJSON(g);
  check('gravity restored down-positive', () => assert.equal(st().simulationSettings.gravity.y, 9.81));
  check('timeStep restored', () => assert.equal(st().simulationSettings.timeStep, 0.008));
  check('subSteps restored', () => assert.equal(st().simulationSettings.subSteps, 4));

  console.log('\n5. Validation is reachable from the store');
  const v = st().validateCurrentScene();
  check('validateCurrentScene returns a verdict', () => assert.equal(typeof v.valid, 'boolean'));
  check('current scene is valid', () => assert.equal(v.valid, true, JSON.stringify(v.errors)));

  st().addShape3D({ type: 'cube', mass: 0, isStatic: false, params: { width: 1, height: 1, depth: 1 } });
  const v2 = st().validateCurrentScene();
  check('a zero-mass dynamic body is caught', () => {
    assert.equal(v2.valid, false);
    assert.ok(v2.errors.some((e) => e.code === 'SCENE_ZERO_MASS_DYNAMIC'));
  });
  check('the failing body is identified by id', () => {
    assert.ok(v2.errors.find((e) => e.code === 'SCENE_ZERO_MASS_DYNAMIC').objectId);
  });

  console.log('\n6. Materials reach physics AND mass through one action');
  // The two material libraries used to disagree, and density never reached mass.
  // These checks pin the whole path: pick a material -> body carries that
  // material's physics -> mass is m = rho*V from the body's real geometry.
  st().addShape3D({ type: 'cube', params: { width: 0.1, height: 0.1, depth: 0.1 } });
  const cube = st().shapes3D.at(-1);
  st().applyMaterial(cube.id, 'steel');
  const steelCube = () => st().shapes3D.find((s) => s.id === cube.id);

  check('material_id is recorded on the body', () => assert.equal(steelCube().material_id, 'steel'));
  check('restitution comes from the canonical library', () => assert.equal(steelCube().restitution, 0.2));
  check('friction is the dynamic coefficient', () => assert.equal(steelCube().friction, 0.3));
  check('appearance follows the material', () => assert.equal(steelCube().color, '#9ca3af'));
  check('mass is derived m = rho*V (0.1m steel cube -> 7.85 kg)', () => {
    assert.ok(Math.abs(steelCube().mass - 7.85) < 1e-9, `got ${steelCube().mass}`);
  });

  st().applyMaterial(cube.id, 'rubber');
  check('switching material re-derives a lighter mass', () => {
    assert.ok(steelCube().mass < 7.85, `got ${steelCube().mass}`);
    assert.equal(steelCube().restitution, 0.85);
  });

  // Resizing has to move the mass, or the material assignment stops being true.
  st().setShapes3D((prev) => prev.map((s) => (s.id === cube.id ? { ...s, params: { width: 0.2, height: 0.2, depth: 0.2 } } : s)));
  const beforeRecompute = steelCube().mass;
  st().recomputeMassFromMaterial([cube.id]);
  check('recomputeMassFromMaterial follows a geometry change (8x volume)', () => {
    assert.ok(Math.abs(steelCube().mass - beforeRecompute * 8) < 1e-9, `got ${steelCube().mass}`);
  });

  const unknown = st().sceneDiagnostics.length;
  st().applyMaterial(cube.id, 'unobtainium');
  check('an unknown material is refused with a diagnostic, not silently ignored', () => {
    assert.ok(st().sceneDiagnostics.length > unknown);
    assert.equal(steelCube().material_id, 'rubber', 'the body must keep its real material');
  });

  // A plane has no volume, so mass cannot be derived: the user's value must
  // survive and a WARNING must say why (no fabricated number).
  st().addShape3D({ type: 'plane', mass: 42, isStatic: true, params: { width: 10, height: 10 } });
  const plane = st().shapes3D.at(-1);
  st().applyMaterial(plane.id, 'concrete');
  check('a body with no derivable volume keeps its own mass', () => {
    assert.equal(st().shapes3D.find((s) => s.id === plane.id).mass, 42);
  });

  const custom = st().materials.custom.density;
  st().upsertMaterial('custom', { density: 999 });
  check('upsertMaterial writes a custom density', () => {
    assert.equal(st().materials.custom.density, 999);
    assert.notEqual(st().materials.custom.density, custom);
  });
  st().upsertMaterial('custom', { restitution: 5, density: -3 });
  check('unphysical custom values are clamped, not stored', () => {
    assert.equal(st().materials.custom.restitution, 1);
    assert.equal(st().materials.custom.density, 999, 'a negative density must fall back');
  });

  console.log('\n7. Entity ids are deterministic and never collide');
  // Every creation path used to mint its own Math.random id. These checks pin
  // that ids come from the one counter and that an import cannot hand a newly
  // created body an id the imported scene already used.
  const idsBefore = new Set(st().shapes3D.map((s) => s.id));
  st().addShape3D({ type: 'sphere', params: { radius: 0.5 } });
  const fresh = st().shapes3D.at(-1);
  check('a created body gets an id', () => assert.ok(fresh.id));
  check('the new id is not a duplicate', () => assert.ok(!idsBefore.has(fresh.id)));
  check('a created body gets a display name', () => assert.ok(fresh.name));
  check('a created body is visible by default', () => assert.equal(fresh.visible, true));

  const exported = st().exportSceneJSON();
  st().importSceneJSON(exported);
  const importedIds = new Set([...st().objects, ...st().shapes3D].map((e) => e.id));
  st().addShape3D({ type: 'cube', params: { width: 1, height: 1, depth: 1 } });
  check('an id minted after an import cannot collide with an imported one', () => {
    assert.ok(!importedIds.has(st().shapes3D.at(-1).id), `collided on ${st().shapes3D.at(-1).id}`);
  });
} finally {
  await vite.close();
}

console.log(failures === 0 ? '\nAll store integration checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
