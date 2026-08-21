// Scene serialization: Scene → JSON → Scene, with schema versioning and
// migration (master spec §4.7).
//
// WHAT WAS BROKEN
//   • Export read `s.scene.objects`, which nothing ever wrote → every save
//     produced `objects: []` and lost the user's entire scene.
//   • Export wrote `scene.simulation` but import read `scene.world`, so gravity
//     and timestep were dropped on every round trip.
//   • Import routed every object through the 2D `addCADObject` path, so 3D
//     shapes could never be restored.
//   • `schemaVersion` was written but never read, and no migration existed.
//
// Pure module: no THREE.js, React, or store imports. Callers supply state and
// apply the result, which keeps this fully testable.

import { buildCanonicalScene, applyCanonicalScene, SCHEMA_VERSION } from './buildCanonicalScene.js';
import { validateScene } from './validateScene.js';
import { diagnostic, Severity, Category } from './diagnostics.js';

/**
 * Serialize authoritative editor state to a canonical JSON string.
 *
 * @param {object} state  Editor state snapshot (e.g. useStore.getState()).
 * @param {{pretty?:boolean, now?:string, name?:string, pixelsPerMetre?:number}} [opts]
 *   `now` is injected rather than read from the clock so output is deterministic
 *   and round-trip tests can assert exact equality.
 * @returns {string} JSON
 */
export function serializeScene(state, opts = {}) {
  const scene = buildCanonicalScene(state, opts);
  if (opts.now) scene.metadata.updatedAt = opts.now;
  if (!scene.metadata.createdAt) scene.metadata.createdAt = opts.now || null;
  return JSON.stringify({ scene }, null, opts.pretty === false ? 0 : 2);
}

/**
 * Migrate a parsed scene payload up to the current schema version.
 *
 * Version history:
 *   (absent) — pre-versioning legacy payloads: objects lived in flat 2D/3D
 *              arrays, gravity under `world`, no `units` block.
 *   '1'      — first canonical shape: `transform` present, but objects carried
 *              no `origin` discriminator and no `geometry` block.
 *   '2'      — current: `origin` + `geometry` on every object, explicit `units`.
 *
 * @param {object} payload  Parsed `{ scene: ... }` or a bare scene.
 * @returns {{scene:object, diagnostics:Array, migratedFrom:(string|null)}}
 */
export function migrateScene(payload) {
  const diagnostics = [];
  const raw = payload && payload.scene ? payload.scene : payload;

  if (!raw || typeof raw !== 'object') {
    diagnostics.push(diagnostic({
      severity: Severity.FATAL,
      category: Category.SCENE,
      code: 'IMPORT_MALFORMED',
      message: 'Payload contains no scene object.'
    }));
    return { scene: null, diagnostics, migratedFrom: null };
  }

  const from = raw.metadata?.schemaVersion ?? null;
  let scene = raw;

  if (from === SCHEMA_VERSION) {
    return { scene, diagnostics, migratedFrom: from };
  }

  if (from === null) {
    diagnostics.push(diagnostic({
      severity: Severity.INFO,
      category: Category.SCENE,
      code: 'IMPORT_MIGRATED_LEGACY',
      message: `Scene has no schemaVersion; migrating as pre-versioned legacy to v${SCHEMA_VERSION}.`,
      metadata: { to: SCHEMA_VERSION }
    }));
    scene = migrateLegacyToV2(raw);
  } else if (from === '1') {
    diagnostics.push(diagnostic({
      severity: Severity.INFO,
      category: Category.SCENE,
      code: 'IMPORT_MIGRATED',
      message: `Migrating scene from schemaVersion 1 to ${SCHEMA_VERSION}.`,
      metadata: { from, to: SCHEMA_VERSION }
    }));
    scene = migrateV1ToV2(raw);
  } else {
    // A newer file than this build understands. Refuse rather than silently
    // dropping fields we cannot interpret.
    diagnostics.push(diagnostic({
      severity: Severity.ERROR,
      category: Category.SCENE,
      code: 'IMPORT_UNSUPPORTED_VERSION',
      message: `Scene schemaVersion "${from}" is newer than the supported version "${SCHEMA_VERSION}".`,
      metadata: { from, supported: SCHEMA_VERSION }
    }));
    return { scene: null, diagnostics, migratedFrom: from };
  }

  return { scene, diagnostics, migratedFrom: from };
}

/** Pre-versioning payloads: flat arrays + `world` gravity. */
function migrateLegacyToV2(raw) {
  const objects = [];
  // Legacy files stored drafts and 3D shapes either in one `objects` array or
  // in separate `objects` / `shapes3D` arrays. Route by shape, not by position.
  const legacyObjects = Array.isArray(raw.objects) ? raw.objects : [];
  const legacyShapes = Array.isArray(raw.shapes3D) ? raw.shapes3D : [];

  for (const o of [...legacyObjects, ...legacyShapes]) {
    if (!o || typeof o !== 'object') continue;
    objects.push({ ...o, origin: Array.isArray(o.position) ? 'native3d' : 'draft2d' });
  }

  const world = raw.world || {};
  return {
    ...raw,
    metadata: { ...(raw.metadata || {}), schemaVersion: SCHEMA_VERSION },
    objects,
    environment: raw.environment || {
      gravity: world.gravity || { x: 0, y: -9.81, z: 0 },
      coordinateConvention: 'right-handed'
    },
    simulationSettings: raw.simulationSettings || {
      dt: world.timestep ?? 0.016,
      subSteps: world.substeps ?? 1
    },
    __needsRebuild: true
  };
}

/** v1 → v2: add the `origin` discriminator so 3D shapes restore correctly. */
function migrateV1ToV2(raw) {
  const objects = (Array.isArray(raw.objects) ? raw.objects : []).map((o) => {
    if (!o || typeof o !== 'object') return o;
    if (o.origin) return o;
    // v1 had no origin. Infer it: a v1 object with a `params` block or an array
    // position came from the native-3D path.
    const inferred = o.params || Array.isArray(o.position) ? 'native3d' : 'draft2d';
    return { ...o, origin: inferred };
  });
  return {
    ...raw,
    metadata: { ...(raw.metadata || {}), schemaVersion: SCHEMA_VERSION },
    objects
  };
}

/**
 * Parse, migrate and validate a scene JSON string, returning the operational
 * arrays the store should adopt.
 *
 * Never throws and never partially applies: on failure it returns
 * `applied: null` so the caller can leave the existing scene untouched. (The
 * previous importer called clearDesign() *before* parsing, so a malformed file
 * wiped the user's work.)
 *
 * @param {string|object} json
 * @returns {{ok:boolean, applied:(object|null), scene:(object|null), diagnostics:Array, validation:(object|null)}}
 */
export function deserializeScene(json) {
  const diagnostics = [];
  let payload;

  try {
    payload = typeof json === 'string' ? JSON.parse(json) : json;
  } catch (err) {
    diagnostics.push(diagnostic({
      severity: Severity.FATAL,
      category: Category.SCENE,
      code: 'IMPORT_PARSE_FAILED',
      message: `Scene JSON could not be parsed: ${err.message}`,
      metadata: { error: String(err.message) }
    }));
    return { ok: false, applied: null, scene: null, diagnostics, validation: null };
  }

  const { scene, diagnostics: migrationDiagnostics } = migrateScene(payload);
  diagnostics.push(...migrationDiagnostics);

  if (!scene) {
    return { ok: false, applied: null, scene: null, diagnostics, validation: null };
  }

  const validation = validateScene(scene);
  diagnostics.push(...validation.diagnostics);

  if (!validation.valid) {
    return { ok: false, applied: null, scene, diagnostics, validation };
  }

  return {
    ok: true,
    applied: applyCanonicalScene(scene),
    scene,
    diagnostics,
    validation
  };
}
