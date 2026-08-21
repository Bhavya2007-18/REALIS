/**
 * sceneSchema.test.mjs — zero-dependency unit tests for the persisted-scene schema.
 *
 * Uses only Node built-ins (node:test + node:assert), so it runs with NO extra install:
 *
 *     cd web && node --test src/models/sceneSchema.test.mjs
 *
 * (The project is `"type":"module"`, so sceneSchema.js imports cleanly as ESM.)
 * When a test runner is later added (Vitest is the natural fit for Vite), these same
 * assertions port over unchanged.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    SCENE_SCHEMA_VERSION,
    unwrapScene,
    readSceneVersion,
    migrateScene,
    validateScene,
    migrateAndValidateScene,
} from './sceneSchema.js';

test('current-version scene round-trips with no migration and no version warning', () => {
    const cur = {
        scene: {
            metadata: { schemaVersion: SCENE_SCHEMA_VERSION, version: SCENE_SCHEMA_VERSION },
            world: { gravity: { x: 0, y: 9.81, z: 0 } },
            bodies: [{ id: 'a', type: 'sphere' }],
            constraints: [],
            forces: [],
        },
    };
    const { scene, migrations } = migrateScene(cur);
    const v = validateScene(scene);
    assert.equal(v.valid, true);
    assert.equal(migrations.length, 0);
    assert.equal(v.warnings.some((w) => /version/i.test(w)), false);
});

test('legacy 1.0 scene migrates forward and becomes valid', () => {
    const legacy = { scene: { metadata: { version: '1.0' }, bodies: [{ id: 'x', type: 'rect' }] } };
    const { scene, fromVersion } = migrateScene(legacy);
    assert.equal(fromVersion, '1.0');
    assert.equal(scene.metadata.schemaVersion, SCENE_SCHEMA_VERSION);
    assert.equal(typeof scene.world.gravity, 'object');
    assert.deepEqual(scene.forces, []);
    assert.equal(validateScene(scene).valid, true);
});

test('bodies that is not an array is a fatal error', () => {
    const bad = { scene: { metadata: { schemaVersion: SCENE_SCHEMA_VERSION }, bodies: { not: 'array' } } };
    const v = validateScene(bad);
    assert.equal(v.valid, false);
    assert.ok(v.errors.some((e) => /bodies/.test(e)));
});

test('non-object payloads never throw and are invalid', () => {
    assert.equal(validateScene('hello').valid, false);
    assert.equal(validateScene(42).valid, false);
    assert.equal(validateScene(null).valid, false);
});

test('bare scene (no {scene} envelope) is unwrapped and validated', () => {
    const bare = { metadata: { schemaVersion: SCENE_SCHEMA_VERSION }, bodies: [{ id: 'b' }] };
    assert.equal(unwrapScene(bare), bare);
    assert.equal(validateScene(bare).valid, true);
});

test('unknown/newer schema version warns but stays valid (best-effort read)', () => {
    const newer = { scene: { metadata: { schemaVersion: '9.9.9' }, bodies: [{ id: 'c' }] } };
    const v = validateScene(newer);
    assert.equal(v.valid, true);
    assert.ok(v.warnings.length >= 1);
});

test('non-finite gravity is a fatal error', () => {
    const grav = { scene: { metadata: { schemaVersion: SCENE_SCHEMA_VERSION }, world: { gravity: { x: 0, y: Infinity, z: 0 } }, bodies: [] } };
    assert.equal(validateScene(grav).valid, false);
});

test('readSceneVersion tolerates both schemaVersion and legacy version', () => {
    assert.equal(readSceneVersion({ metadata: { schemaVersion: '1.1.0' } }), '1.1.0');
    assert.equal(readSceneVersion({ metadata: { version: '1.0' } }), '1.0');
    assert.equal(readSceneVersion({ metadata: {} }), null);
    assert.equal(readSceneVersion({}), null);
});

test('migrateScene does not mutate its input', () => {
    const input = { scene: { metadata: { version: '1.0' }, bodies: [] } };
    const snapshot = JSON.stringify(input);
    migrateScene(input);
    assert.equal(JSON.stringify(input), snapshot);
});

test('migrateAndValidateScene composes both steps', () => {
    const legacy = { scene: { metadata: { version: '1.0' }, bodies: [{ id: 'z' }] } };
    const r = migrateAndValidateScene(legacy);
    assert.equal(r.valid, true);
    assert.equal(r.scene.metadata.schemaVersion, SCENE_SCHEMA_VERSION);
    assert.ok(Array.isArray(r.migrations));
});
