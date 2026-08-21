// Canonical scene validation (master spec §4.6, §1.4 "no silent failures").
//
// Before this module there was NO scene validation of any kind in the codebase.
// Failures surfaced as a `throw` on the first problem, a bare `{valid, reason}`
// string, or a silent console.warn that dropped the entity from the simulation
// without telling anyone.
//
// This validator:
//   • never mutates the scene it inspects
//   • never throws — it returns every problem it finds
//   • identifies WHICH entity failed (objectId / constraintId / path)
//   • uses stable machine-readable codes so tests and the AI layer can match
//     on them without parsing prose
//
// Pure module: no THREE.js, React, or store imports.

import { diagnostic, Severity, Category, hasBlockingError } from './diagnostics.js';
import { GeometryKind } from './geometry.js';

/** Geometry kinds that legitimately carry no volume and so need no mass. */
const NON_SOLID_KINDS = new Set([
  GeometryKind.ANNOTATION,
  GeometryKind.POLYLINE,
  GeometryKind.PLANE
]);

const KNOWN_CONSTRAINT_TYPES = new Set([
  'distance', 'fixed', 'hinge', 'slider', 'spring', 'motor', 'contact'
]);

function isFiniteNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function checkVec3(vec, path, objectId, out, { requireFinite = true } = {}) {
  if (!vec || typeof vec !== 'object') {
    out.push(diagnostic({
      severity: Severity.ERROR,
      category: Category.SCENE,
      code: 'SCENE_VEC3_MISSING',
      message: `Expected a {x, y, z} vector at ${path}.`,
      objectId,
      path
    }));
    return;
  }
  if (!requireFinite) return;
  for (const axis of ['x', 'y', 'z']) {
    if (!isFiniteNum(vec[axis])) {
      out.push(diagnostic({
        severity: Severity.ERROR,
        category: Category.SCENE,
        code: 'SCENE_NON_FINITE_VALUE',
        message: `${path}.${axis} is ${String(vec[axis])}; expected a finite number.`,
        objectId,
        path: `${path}.${axis}`,
        metadata: { actual: vec[axis] }
      }));
    }
  }
}

/**
 * Validate a canonical scene.
 *
 * @param {object} scene  A canonical scene (see buildCanonicalScene).
 * @returns {{valid:boolean, errors:Array, warnings:Array, diagnostics:Array}}
 *   `valid` is false when any ERROR/FATAL diagnostic was produced. Warnings do
 *   not block simulation.
 */
export function validateScene(scene) {
  const diagnostics = [];

  if (!scene || typeof scene !== 'object') {
    diagnostics.push(diagnostic({
      severity: Severity.FATAL,
      category: Category.SCENE,
      code: 'SCENE_MISSING',
      message: 'Scene is null or not an object.'
    }));
    return finish(diagnostics);
  }

  // ── Metadata / schema version ──────────────────────────────────────
  if (!scene.metadata || typeof scene.metadata !== 'object') {
    diagnostics.push(diagnostic({
      severity: Severity.WARNING,
      category: Category.SCENE,
      code: 'SCENE_METADATA_MISSING',
      message: 'Scene has no metadata block.',
      path: 'metadata'
    }));
  } else if (!scene.metadata.schemaVersion) {
    diagnostics.push(diagnostic({
      severity: Severity.WARNING,
      category: Category.SCENE,
      code: 'SCENE_SCHEMA_VERSION_MISSING',
      message: 'Scene has no schemaVersion; it cannot be migrated safely.',
      path: 'metadata.schemaVersion'
    }));
  }

  // ── Objects ────────────────────────────────────────────────────────
  const objects = Array.isArray(scene.objects) ? scene.objects : [];
  if (!Array.isArray(scene.objects)) {
    diagnostics.push(diagnostic({
      severity: Severity.ERROR,
      category: Category.SCENE,
      code: 'SCENE_OBJECTS_NOT_ARRAY',
      message: 'scene.objects must be an array.',
      path: 'objects'
    }));
  }

  const seenIds = new Set();
  const materialIds = new Set(
    (Array.isArray(scene.materials) ? scene.materials : []).map((m) => m.id)
  );
  const layerIds = new Set(
    (Array.isArray(scene.layers) ? scene.layers : []).map((l) => l.id)
  );

  objects.forEach((o, i) => {
    const path = `objects[${i}]`;

    if (!o || typeof o !== 'object') {
      diagnostics.push(diagnostic({
        severity: Severity.ERROR,
        category: Category.SCENE,
        code: 'SCENE_OBJECT_INVALID',
        message: `${path} is not an object.`,
        path
      }));
      return;
    }

    // Identity
    if (!o.id) {
      diagnostics.push(diagnostic({
        severity: Severity.ERROR,
        category: Category.SCENE,
        code: 'SCENE_OBJECT_ID_MISSING',
        // Name it by whatever identity it does have, so the user can find it.
        message: `${path}${o.name ? ` ("${o.name}")` : ''} has no id; it cannot be selected, constrained, or saved.`,
        path: `${path}.id`,
        metadata: { name: o.name, type: o.type, index: i }
      }));
    } else if (seenIds.has(o.id)) {
      diagnostics.push(diagnostic({
        severity: Severity.ERROR,
        category: Category.SCENE,
        code: 'SCENE_DUPLICATE_ID',
        message: `Duplicate object id "${o.id}"; ids must be unique.`,
        objectId: o.id,
        path: `${path}.id`
      }));
    } else {
      seenIds.add(o.id);
    }

    // Transform
    if (!o.transform) {
      diagnostics.push(diagnostic({
        severity: Severity.ERROR,
        category: Category.SCENE,
        code: 'SCENE_TRANSFORM_MISSING',
        message: `${path} has no transform.`,
        objectId: o.id,
        path: `${path}.transform`
      }));
    } else {
      checkVec3(o.transform.position, `${path}.transform.position`, o.id, diagnostics);
      checkVec3(o.transform.rotation, `${path}.transform.rotation`, o.id, diagnostics);
      checkVec3(o.transform.scale, `${path}.transform.scale`, o.id, diagnostics);
      const s = o.transform.scale;
      if (s && ['x', 'y', 'z'].some((a) => s[a] === 0)) {
        diagnostics.push(diagnostic({
          severity: Severity.ERROR,
          category: Category.SCENE,
          code: 'SCENE_DEGENERATE_SCALE',
          message: `${path} has a zero scale component, producing degenerate geometry.`,
          objectId: o.id,
          path: `${path}.transform.scale`,
          metadata: { scale: s }
        }));
      }
    }

    // Geometry
    const geom = o.geometry;
    if (!geom) {
      diagnostics.push(diagnostic({
        severity: Severity.ERROR,
        category: Category.SCENE,
        code: 'SCENE_GEOMETRY_MISSING',
        message: `${path} has no geometry.`,
        objectId: o.id,
        path: `${path}.geometry`
      }));
    } else {
      const kinds = Object.values(GeometryKind);
      if (!kinds.includes(geom.kind)) {
        diagnostics.push(diagnostic({
          severity: Severity.ERROR,
          category: Category.SCENE,
          code: 'SCENE_UNKNOWN_GEOMETRY_KIND',
          message: `${path} has unknown geometry kind "${geom.kind}".`,
          objectId: o.id,
          path: `${path}.geometry.kind`,
          metadata: { actual: geom.kind, expected: kinds }
        }));
      }
      const solid = !NON_SOLID_KINDS.has(geom.kind);
      const d = geom.dimensions || {};
      for (const axis of ['x', 'y', 'z']) {
        if (d[axis] !== undefined && !isFiniteNum(d[axis])) {
          diagnostics.push(diagnostic({
            severity: Severity.ERROR,
            category: Category.SCENE,
            code: 'SCENE_NON_FINITE_VALUE',
            message: `${path}.geometry.dimensions.${axis} is ${String(d[axis])}.`,
            objectId: o.id,
            path: `${path}.geometry.dimensions.${axis}`,
            metadata: { actual: d[axis] }
          }));
        } else if (isFiniteNum(d[axis]) && d[axis] < 0) {
          diagnostics.push(diagnostic({
            severity: Severity.ERROR,
            category: Category.SCENE,
            code: 'SCENE_NEGATIVE_DIMENSION',
            message: `${path}.geometry.dimensions.${axis} is negative (${d[axis]}).`,
            objectId: o.id,
            path: `${path}.geometry.dimensions.${axis}`,
            metadata: { actual: d[axis] }
          }));
        }
      }
      // A solid with no extent cannot collide; warn rather than error because a
      // freshly-drawn shape can legitimately be momentarily zero-sized.
      if (solid && isFiniteNum(d.x) && isFiniteNum(d.z) && d.x === 0 && d.z === 0) {
        diagnostics.push(diagnostic({
          severity: Severity.WARNING,
          category: Category.SCENE,
          code: 'SCENE_ZERO_EXTENT',
          message: `${path} ("${o.name || o.id}") has zero extent and cannot participate in collisions.`,
          objectId: o.id,
          path: `${path}.geometry.dimensions`
        }));
      }
      if (
        (geom.kind === GeometryKind.SPHERE || geom.kind === GeometryKind.CAPSULE) &&
        isFiniteNum(geom.radius) && geom.radius <= 0
      ) {
        diagnostics.push(diagnostic({
          severity: Severity.ERROR,
          category: Category.SCENE,
          code: 'SCENE_INVALID_RADIUS',
          message: `${path} is a ${geom.kind} with radius ${geom.radius}; radius must be > 0.`,
          objectId: o.id,
          path: `${path}.geometry.radius`,
          metadata: { actual: geom.radius }
        }));
      }
    }

    // Physical properties
    const phys = o.physical;
    if (!phys) {
      diagnostics.push(diagnostic({
        severity: Severity.ERROR,
        category: Category.SCENE,
        code: 'SCENE_PHYSICAL_MISSING',
        message: `${path} has no physical properties.`,
        objectId: o.id,
        path: `${path}.physical`
      }));
    } else {
      const solid = !geom || !NON_SOLID_KINDS.has(geom.kind);
      if (!isFiniteNum(phys.mass)) {
        diagnostics.push(diagnostic({
          severity: Severity.ERROR,
          category: Category.SCENE,
          code: 'SCENE_NON_FINITE_VALUE',
          message: `${path}.physical.mass is ${String(phys.mass)}.`,
          objectId: o.id,
          path: `${path}.physical.mass`,
          metadata: { actual: phys.mass }
        }));
      } else if (phys.mass < 0) {
        diagnostics.push(diagnostic({
          severity: Severity.ERROR,
          category: Category.SCENE,
          code: 'SCENE_NEGATIVE_MASS',
          message: `${path} has negative mass (${phys.mass}).`,
          objectId: o.id,
          path: `${path}.physical.mass`,
          metadata: { actual: phys.mass }
        }));
      } else if (phys.mass === 0 && !phys.isStatic && solid) {
        // Zero mass on a dynamic body means infinite acceleration.
        diagnostics.push(diagnostic({
          severity: Severity.ERROR,
          category: Category.SCENE,
          code: 'SCENE_ZERO_MASS_DYNAMIC',
          message: `${path} ("${o.name || o.id}") is dynamic with mass 0; set a positive mass or mark it static.`,
          objectId: o.id,
          path: `${path}.physical.mass`
        }));
      } else if (phys.mass > 0 && phys.isStatic) {
        diagnostics.push(diagnostic({
          severity: Severity.WARNING,
          category: Category.SCENE,
          code: 'SCENE_STATIC_WITH_MASS',
          message: `${path} is static but carries mass ${phys.mass}; the mass will be ignored.`,
          objectId: o.id,
          path: `${path}.physical.mass`,
          metadata: { actual: phys.mass }
        }));
      }

      for (const [key, label] of [['restitution', 'restitution'], ['friction', 'friction']]) {
        const v = phys[key];
        if (!isFiniteNum(v)) {
          diagnostics.push(diagnostic({
            severity: Severity.ERROR,
            category: Category.SCENE,
            code: 'SCENE_NON_FINITE_VALUE',
            message: `${path}.physical.${key} is ${String(v)}.`,
            objectId: o.id,
            path: `${path}.physical.${key}`,
            metadata: { actual: v }
          }));
        } else if (v < 0 || v > 1) {
          // Restitution > 1 injects energy every bounce; friction > 1 is
          // physically possible but almost always a data-entry slip.
          diagnostics.push(diagnostic({
            severity: v < 0 ? Severity.ERROR : Severity.WARNING,
            category: Category.SCENE,
            code: 'SCENE_COEFFICIENT_OUT_OF_RANGE',
            message: `${path}.physical.${label} is ${v}; expected 0..1.`,
            objectId: o.id,
            path: `${path}.physical.${key}`,
            metadata: { actual: v, expectedRange: [0, 1] }
          }));
        }
      }
    }

    // Dangling material / layer references
    if (o.materialId && materialIds.size > 0 && !materialIds.has(o.materialId)) {
      diagnostics.push(diagnostic({
        severity: Severity.WARNING,
        category: Category.SCENE,
        code: 'SCENE_DANGLING_MATERIAL_REF',
        message: `${path} references material "${o.materialId}", which is not defined in the scene.`,
        objectId: o.id,
        path: `${path}.materialId`,
        metadata: { actual: o.materialId }
      }));
    }
    if (o.layerId && layerIds.size > 0 && !layerIds.has(o.layerId)) {
      diagnostics.push(diagnostic({
        severity: Severity.WARNING,
        category: Category.SCENE,
        code: 'SCENE_DANGLING_LAYER_REF',
        message: `${path} references layer "${o.layerId}", which is not defined in the scene.`,
        objectId: o.id,
        path: `${path}.layerId`,
        metadata: { actual: o.layerId }
      }));
    }
  });

  // ── Constraints ────────────────────────────────────────────────────
  const constraints = Array.isArray(scene.constraints) ? scene.constraints : [];
  const seenConstraintIds = new Set();

  constraints.forEach((c, i) => {
    const path = `constraints[${i}]`;
    if (!c || typeof c !== 'object') {
      diagnostics.push(diagnostic({
        severity: Severity.ERROR,
        category: Category.CONSTRAINT,
        code: 'CONSTRAINT_INVALID',
        message: `${path} is not an object.`,
        path
      }));
      return;
    }

    if (!c.id) {
      diagnostics.push(diagnostic({
        severity: Severity.ERROR,
        category: Category.CONSTRAINT,
        code: 'CONSTRAINT_ID_MISSING',
        message: `${path} has no id.`,
        path: `${path}.id`
      }));
    } else if (seenConstraintIds.has(c.id)) {
      diagnostics.push(diagnostic({
        severity: Severity.ERROR,
        category: Category.CONSTRAINT,
        code: 'CONSTRAINT_DUPLICATE_ID',
        message: `Duplicate constraint id "${c.id}".`,
        constraintId: c.id,
        path: `${path}.id`
      }));
    } else {
      seenConstraintIds.add(c.id);
    }

    if (c.type && !KNOWN_CONSTRAINT_TYPES.has(c.type)) {
      diagnostics.push(diagnostic({
        severity: Severity.WARNING,
        category: Category.CONSTRAINT,
        code: 'CONSTRAINT_UNKNOWN_TYPE',
        message: `${path} has unrecognized type "${c.type}"; it may not be simulated.`,
        constraintId: c.id,
        path: `${path}.type`,
        metadata: { actual: c.type, expected: [...KNOWN_CONSTRAINT_TYPES] }
      }));
    }

    // Dangling body references — the failure mode pruneConstraints only cleans
    // up after a delete, and which nothing checked at creation time.
    if (!c.objectA) {
      diagnostics.push(diagnostic({
        severity: Severity.ERROR,
        category: Category.CONSTRAINT,
        code: 'CONSTRAINT_MISSING_TARGET',
        message: `${path} has no objectA.`,
        constraintId: c.id,
        path: `${path}.objectA`
      }));
    } else if (!seenIds.has(c.objectA)) {
      diagnostics.push(diagnostic({
        severity: Severity.ERROR,
        category: Category.CONSTRAINT,
        code: 'CONSTRAINT_DANGLING_REF',
        message: `${path} references object "${c.objectA}", which does not exist in the scene.`,
        constraintId: c.id,
        objectId: c.objectA,
        path: `${path}.objectA`,
        metadata: { actual: c.objectA }
      }));
    }
    // objectB is optional — a constraint may anchor a single body to the world.
    if (c.objectB && !seenIds.has(c.objectB)) {
      diagnostics.push(diagnostic({
        severity: Severity.ERROR,
        category: Category.CONSTRAINT,
        code: 'CONSTRAINT_DANGLING_REF',
        message: `${path} references object "${c.objectB}", which does not exist in the scene.`,
        constraintId: c.id,
        objectId: c.objectB,
        path: `${path}.objectB`,
        metadata: { actual: c.objectB }
      }));
    }
    if (c.objectA && c.objectB && c.objectA === c.objectB) {
      diagnostics.push(diagnostic({
        severity: Severity.ERROR,
        category: Category.CONSTRAINT,
        code: 'CONSTRAINT_SELF_REFERENCE',
        message: `${path} connects object "${c.objectA}" to itself.`,
        constraintId: c.id,
        objectId: c.objectA,
        path
      }));
    }

    const params = c.parameters || {};
    if (params.distance !== undefined) {
      if (!isFiniteNum(params.distance)) {
        diagnostics.push(diagnostic({
          severity: Severity.ERROR,
          category: Category.CONSTRAINT,
          code: 'CONSTRAINT_NON_FINITE_PARAM',
          message: `${path}.parameters.distance is ${String(params.distance)}.`,
          constraintId: c.id,
          path: `${path}.parameters.distance`,
          metadata: { actual: params.distance }
        }));
      } else if (params.distance < 0) {
        diagnostics.push(diagnostic({
          severity: Severity.ERROR,
          category: Category.CONSTRAINT,
          code: 'CONSTRAINT_NEGATIVE_DISTANCE',
          message: `${path} has negative distance (${params.distance}).`,
          constraintId: c.id,
          path: `${path}.parameters.distance`,
          metadata: { actual: params.distance }
        }));
      }
    }
    if (
      isFiniteNum(params.minLimit) && isFiniteNum(params.maxLimit) &&
      params.minLimit > params.maxLimit
    ) {
      diagnostics.push(diagnostic({
        severity: Severity.ERROR,
        category: Category.CONSTRAINT,
        code: 'CONSTRAINT_LIMITS_INVERTED',
        message: `${path} has minLimit (${params.minLimit}) greater than maxLimit (${params.maxLimit}).`,
        constraintId: c.id,
        path: `${path}.parameters`,
        metadata: { minLimit: params.minLimit, maxLimit: params.maxLimit }
      }));
    }
  });

  // ── Environment & simulation settings ──────────────────────────────
  if (scene.environment) {
    checkVec3(scene.environment.gravity, 'environment.gravity', undefined, diagnostics);
  }

  const sim = scene.simulationSettings;
  if (sim) {
    if (!isFiniteNum(sim.dt) || sim.dt <= 0) {
      diagnostics.push(diagnostic({
        severity: Severity.ERROR,
        category: Category.SIMULATION,
        code: 'SIM_INVALID_TIMESTEP',
        message: `simulationSettings.dt is ${String(sim.dt)}; must be a positive number.`,
        path: 'simulationSettings.dt',
        metadata: { actual: sim.dt }
      }));
    } else if (sim.dt > 0.1) {
      // Large fixed steps make explicit integrators diverge.
      diagnostics.push(diagnostic({
        severity: Severity.WARNING,
        category: Category.SIMULATION,
        code: 'SIM_LARGE_TIMESTEP',
        message: `simulationSettings.dt is ${sim.dt}s; steps above 0.1s risk solver instability.`,
        path: 'simulationSettings.dt',
        metadata: { actual: sim.dt, recommendedMax: 0.1 }
      }));
    }
    if (sim.subSteps !== undefined && (!Number.isInteger(sim.subSteps) || sim.subSteps < 1)) {
      diagnostics.push(diagnostic({
        severity: Severity.ERROR,
        category: Category.SIMULATION,
        code: 'SIM_INVALID_SUBSTEPS',
        message: `simulationSettings.subSteps is ${String(sim.subSteps)}; must be an integer >= 1.`,
        path: 'simulationSettings.subSteps',
        metadata: { actual: sim.subSteps }
      }));
    }
  }

  return finish(diagnostics);
}

function finish(diagnostics) {
  const errors = diagnostics.filter(
    (d) => d.severity === Severity.ERROR || d.severity === Severity.FATAL
  );
  const warnings = diagnostics.filter((d) => d.severity === Severity.WARNING);
  return {
    valid: !hasBlockingError(diagnostics),
    errors,
    warnings,
    diagnostics
  };
}
