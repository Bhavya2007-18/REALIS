/**
 * sceneSchema.js — Canonical contract for the PERSISTED SCENE (save/load JSON round-trip).
 *
 * Phase 1 (Canonical Scene) single source of truth for what a saved REALIS scene *is*
 * on disk, how to migrate an older file forward, and how to validate one without throwing.
 *
 * SCOPE — this owns the on-disk/exchange shape produced by useStore.exportSceneJSON and
 * consumed by useStore.importSceneJSON. It is intentionally SEPARATE from
 * `models/schema.js#validateModelSchema`, which validates *component-library models*
 * (a different lifecycle, throw-based, with physics_config/controls/v6Config). Do not merge
 * the two without a deliberate consolidation — they have different consumers and contracts.
 *
 * DESIGN RULES honored here:
 *  - 3.3 (units): a saved scene carries authoring-space bodies. We record the coordinate space
 *    HONESTLY in metadata rather than falsely claiming pure SI. We do NOT silently convert
 *    gravity sign/units at the persistence layer — that unification belongs to the Phase 2
 *    UI↔SI adapter, and flipping it here would surprise every load.
 *  - 3.4 (no silent failures): validateScene RETURNS { valid, errors, warnings } and never throws;
 *    migrateScene reports every transformation it applied.
 *  - 3.10 (no premature abstraction): pure functions, zero dependencies, no framework coupling.
 *
 * @typedef {{x:number,y:number,z:number}} Vec3Like
 * @typedef {{ valid:boolean, errors:string[], warnings:string[] }} ValidationResult
 * @typedef {{ scene:object, migrations:string[], fromVersion:(string|null) }} MigrationResult
 */

/** Current persisted-scene schema version. Bump on any breaking shape change and add a migration step. */
export const SCENE_SCHEMA_VERSION = '1.1.0';

/**
 * Coordinate space of the bodies stored in a scene file.
 * REALIS authoring is a mix of 2D CAD (pixel coords) and 3D primitives; a saved scene preserves
 * authoring space verbatim. Conversion to canonical SI happens later, at the physics boundary.
 */
export const SCENE_COORDINATE_SPACE = 'authoring';

/**
 * Documented gravity convention for a persisted scene, matching the live store
 * (useStore.simulationSettings) and models/schema.js: y is POSITIVE-DOWN (screen convention),
 * magnitude 9.81. The physics layer negates/relabels this into SI y-up at its own boundary.
 * Kept here so the convention is stated in exactly one place readable by persistence code.
 */
export const SCENE_GRAVITY_CONVENTION = Object.freeze({
    axisDownIsPositiveY: true,
    defaultGravity: Object.freeze({ x: 0, y: 9.81, z: 0 }),
    note: 'Store/scene convention: +y points down (screen space). Physics boundary converts to SI (y-up, -g).',
});

const DEFAULT_WORLD = Object.freeze({
    gravity: { x: 0, y: 9.81, z: 0 },
    timestep: 0.016,
    substeps: 1,
    units: 'mixed-authoring', // honest: bodies are authoring-space (2D pixels + 3D primitives), not pure SI
    coordinateSpace: SCENE_COORDINATE_SPACE,
});

// ── small pure helpers ───────────────────────────────────────────────────────
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isFiniteNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isVec3ish = (v) => isObject(v) && isFiniteNum(v.x) && isFiniteNum(v.y) && isFiniteNum(v.z);

/**
 * Unwrap the outer envelope. exportSceneJSON emits `{ scene: {...} }`; older/hand-authored
 * files may be the bare scene object. Returns the inner scene object (never null).
 * @param {*} data parsed JSON (already JSON.parse'd, or a plain object)
 * @returns {object}
 */
export function unwrapScene(data) {
    if (isObject(data) && isObject(data.scene)) return data.scene;
    if (isObject(data)) return data;
    return {};
}

/**
 * Read the schema version from a scene object, tolerating both the new `schemaVersion`
 * and the legacy `version` fields under `metadata`.
 * @param {object} scene
 * @returns {string|null}
 */
export function readSceneVersion(scene) {
    const md = isObject(scene?.metadata) ? scene.metadata : {};
    return md.schemaVersion || md.version || null;
}

/**
 * Migrate a scene object forward to SCENE_SCHEMA_VERSION. Non-mutating: returns a shallow-cloned,
 * normalized scene plus a human-readable list of the migrations applied (diagnostics, rule 3.4).
 *
 * Handled upgrades:
 *   (none | '1.0')  → '1.1.0'   add metadata.schemaVersion, ensure world defaults + coordinateSpace,
 *                                ensure bodies/constraints/forces arrays exist.
 * Unknown/newer versions are passed through unchanged (validateScene will warn).
 *
 * @param {*} rawInput parsed JSON envelope or bare scene
 * @returns {MigrationResult}
 */
export function migrateScene(rawInput) {
    const migrations = [];
    const src = unwrapScene(rawInput);
    const fromVersion = readSceneVersion(src);

    // Work on a shallow clone so callers' input is never mutated.
    const scene = { ...src };
    scene.metadata = isObject(src.metadata) ? { ...src.metadata } : {};
    scene.world = isObject(src.world) ? { ...src.world } : {};

    const knownOld = fromVersion === null || fromVersion === '1.0' || fromVersion === '1.0.0';

    if (knownOld) {
        if (fromVersion === null) migrations.push('No schema version found → assuming legacy 1.0 layout.');

        if (!scene.metadata.schemaVersion) {
            scene.metadata.schemaVersion = SCENE_SCHEMA_VERSION;
            migrations.push(`Stamped metadata.schemaVersion = ${SCENE_SCHEMA_VERSION}.`);
        }

        // Fill world defaults without overriding present values.
        for (const [k, v] of Object.entries(DEFAULT_WORLD)) {
            if (scene.world[k] === undefined) {
                scene.world[k] = typeof v === 'object' ? { ...v } : v;
                migrations.push(`world.${k} defaulted.`);
            }
        }
        if (scene.world.coordinateSpace === undefined) {
            scene.world.coordinateSpace = SCENE_COORDINATE_SPACE;
        }

        // Ensure collection fields are arrays so downstream .forEach is safe.
        for (const key of ['bodies', 'constraints', 'forces']) {
            if (scene[key] === undefined) {
                scene[key] = [];
                migrations.push(`${key}[] initialized to empty array.`);
            }
        }
    }

    return { scene, migrations, fromVersion };
}

/**
 * Validate a persisted scene WITHOUT throwing. Fatal structural problems populate `errors`
 * (and set valid=false); recoverable/quality issues populate `warnings`.
 *
 * @param {*} rawInput parsed JSON envelope or bare scene (validated after unwrap)
 * @returns {ValidationResult}
 */
export function validateScene(rawInput) {
    const errors = [];
    const warnings = [];

    if (!isObject(rawInput) && !Array.isArray(rawInput)) {
        return { valid: false, errors: ['Scene JSON did not parse to an object.'], warnings };
    }

    const scene = unwrapScene(rawInput);
    if (!isObject(scene)) {
        return { valid: false, errors: ['Scene payload is not an object.'], warnings };
    }

    // Version awareness (non-fatal): warn on unknown/newer files so we never silently mis-read them.
    const version = readSceneVersion(scene);
    if (version && version !== SCENE_SCHEMA_VERSION && version !== '1.0' && version !== '1.0.0') {
        warnings.push(`Scene schemaVersion "${version}" is newer/unknown (this build understands ${SCENE_SCHEMA_VERSION}); reading best-effort.`);
    }

    // world (optional, but if present must be well-formed)
    if (scene.world !== undefined) {
        if (!isObject(scene.world)) {
            errors.push('scene.world must be an object when present.');
        } else if (scene.world.gravity !== undefined && !isVec3ish(scene.world.gravity)) {
            errors.push('scene.world.gravity must be a finite {x,y,z} vector when present.');
        }
    }

    // bodies (optional, but if present must be an array of usable entities)
    if (scene.bodies !== undefined) {
        if (!Array.isArray(scene.bodies)) {
            errors.push('scene.bodies must be an array when present.');
        } else {
            scene.bodies.forEach((b, i) => {
                if (!isObject(b)) { errors.push(`scene.bodies[${i}] is not an object.`); return; }
                if (b.id === undefined || b.id === null || b.id === '') warnings.push(`scene.bodies[${i}] has no id (an id will be needed to reference it).`);
                if (!b.type && !b.position && !b.params && b.cx === undefined && b.x === undefined) {
                    warnings.push(`scene.bodies[${i}] has neither type nor position/params — import may misclassify it.`);
                }
            });
        }
    } else {
        warnings.push('scene has no bodies array (empty scene).');
    }

    // constraints / forces (optional arrays)
    for (const key of ['constraints', 'forces']) {
        if (scene[key] !== undefined && !Array.isArray(scene[key])) {
            errors.push(`scene.${key} must be an array when present.`);
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Convenience: migrate then validate in one call.
 * @param {*} rawInput
 * @returns {{ scene:object, migrations:string[], fromVersion:(string|null) } & ValidationResult}
 */
export function migrateAndValidateScene(rawInput) {
    const { scene, migrations, fromVersion } = migrateScene(rawInput);
    const { valid, errors, warnings } = validateScene(scene);
    return { scene, migrations, fromVersion, valid, errors, warnings };
}
