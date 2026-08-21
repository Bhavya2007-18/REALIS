// Canonical scene projection.
//
// THE PROBLEM THIS SOLVES
// The store holds a `scene` slice of canonical shape, but nothing ever wrote to
// it — `scene.objects` was read in exactly two places (the undo partialize and
// exportSceneJSON) and written in none. Every "Save" therefore serialized an
// empty object list and silently discarded the user's entire scene.
//
// THE DIRECTION OF TRUTH
// The editor's operational arrays (`objects[]` for 2D drafts, `shapes3D[]` for
// native 3D) are the ONE authoritative mutable source. This module projects them
// into the canonical scene shape. The canonical scene is therefore a DERIVED
// view, never a second mutable copy — which is what keeps the master spec's
// "one concept = one canonical representation" rule true in practice rather than
// only on paper.
//
//   objects[] + shapes3D[]  ──buildCanonicalScene──▶  CanonicalScene
//        (authoritative)                                 (derived)
//
// Pure module: no THREE.js, React, or store imports.

import {
  geometryFromDraft,
  geometryFromShape3D,
  transformFromDraft,
  transformFromShape3D,
  isAnnotationKind
} from './geometry.js';
import {
  gravityFromLegacyStore,
  CANONICAL_UNITS,
  DEFAULT_PIXELS_PER_METRE,
  canonicalEarthGravity
} from './units.js';

/** Schema version this builder emits. Bump when the emitted shape changes. */
export const SCHEMA_VERSION = '2';

function num(v, fallback) {
  return Number.isFinite(v) ? v : fallback;
}

/**
 * Normalize the physical properties shared by both schemas. Annotations get
 * mass 0 and are marked non-simulable so downstream physics skips them instead
 * of trying to integrate a dimension line.
 */
function physicalFrom(entity, kind) {
  const annotation = isAnnotationKind(kind);
  const isStatic = annotation ? true : !!entity.isStatic;
  return {
    // A static body has infinite inertia; reporting mass 0 is the standard
    // encoding and keeps `inv_mass = 0` derivable without a special case.
    mass: annotation || isStatic ? 0 : num(entity.mass, 1),
    restitution: num(entity.restitution, 0.5),
    friction: num(entity.friction, 0.3),
    isStatic,
    simulable: !annotation
  };
}

/**
 * Project one 2D draft object into a canonical SceneObjectDef.
 * @param {object} obj
 * @param {number} pixelsPerMetre
 * @returns {object}
 */
export function canonicalObjectFromDraft(obj, pixelsPerMetre = DEFAULT_PIXELS_PER_METRE) {
  const geometry = geometryFromDraft(obj, pixelsPerMetre);
  const transform = transformFromDraft(obj, pixelsPerMetre);
  return {
    id: obj.id,
    name: obj.name || obj.type || 'Object',
    type: obj.type,
    origin: 'draft2d',
    transform,
    geometry,
    materialId: obj.material_id || undefined,
    layerId: obj.layerId || undefined,
    visible: obj.visible !== false,
    physical: physicalFrom(obj, geometry.kind),
    appearance: { color: obj.fill || obj.stroke || undefined }
  };
}

/**
 * Project one native 3D shape into a canonical SceneObjectDef.
 * @param {object} shape
 * @returns {object}
 */
export function canonicalObjectFromShape3D(shape) {
  const geometry = geometryFromShape3D(shape);
  const transform = transformFromShape3D(shape);
  return {
    id: shape.id,
    name: shape.name || shape.type || 'Shape',
    type: shape.type,
    origin: 'native3d',
    transform,
    geometry,
    materialId: shape.material_id || undefined,
    layerId: shape.layerId || undefined,
    visible: shape.visible !== false,
    physical: physicalFrom(shape, geometry.kind),
    appearance: { color: shape.color || undefined }
  };
}

/**
 * Normalize a constraint into the canonical form. Historically constraints were
 * written with six different reference-field spellings across the codebase
 * (`targetA`/`objectA`/`bodyA`/`bodyAId`/…); this collapses all of them onto
 * `objectA`/`objectB` and preserves everything else under `parameters`.
 * @param {object} c
 * @returns {object}
 */
export function canonicalConstraint(c) {
  const {
    id, type,
    targetA, targetB, objectA, objectB, bodyA, bodyB, bodyAId, bodyBId,
    ...rest
  } = c || {};
  return {
    id,
    type: type || 'distance',
    objectA: objectA ?? targetA ?? bodyA ?? bodyAId ?? null,
    objectB: objectB ?? targetB ?? bodyB ?? bodyBId ?? null,
    parameters: rest
  };
}

/** Project the store's keyed material map into the canonical material array. */
export function canonicalMaterials(materialMap) {
  if (!materialMap) return [];
  return Object.entries(materialMap).map(([id, m]) => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    density: num(m.density, 1000),
    restitution: num(m.restitution, 0.5),
    // The store uses snake_case and sometimes carries only a single `friction`.
    staticFriction: num(m.static_friction, num(m.friction, 0.3)),
    dynamicFriction: num(m.dynamic_friction, num(m.friction, 0.3))
  }));
}

/**
 * Build the full canonical scene from the authoritative editor state.
 *
 * Accepts a plain snapshot (typically `useStore.getState()`) and returns a fresh
 * canonical scene. Deliberately excludes all UI state (selection, tools, camera,
 * panels) and all runtime state (isPlaying, simTime, frames, telemetry) — the
 * canonical scene describes what exists, not what is being looked at or what is
 * currently happening.
 *
 * @param {object} state
 * @param {{pixelsPerMetre?:number, name?:string}} [opts]
 * @returns {object} canonical scene
 */
export function buildCanonicalScene(state, opts = {}) {
  const pixelsPerMetre = num(opts.pixelsPerMetre, DEFAULT_PIXELS_PER_METRE);
  const objects = Array.isArray(state?.objects) ? state.objects : [];
  const shapes3D = Array.isArray(state?.shapes3D) ? state.shapes3D : [];
  const constraints = Array.isArray(state?.constraints) ? state.constraints : [];
  const prevMeta = state?.scene?.metadata || {};
  const sim = state?.simulationSettings || {};

  const canonicalObjects = [
    ...objects.map((o) => canonicalObjectFromDraft(o, pixelsPerMetre)),
    ...shapes3D.map(canonicalObjectFromShape3D)
  ];

  return {
    metadata: {
      id: prevMeta.id || 'scene',
      name: opts.name || prevMeta.name || 'Untitled Scene',
      schemaVersion: SCHEMA_VERSION,
      createdAt: prevMeta.createdAt || null,
      // Caller stamps the real time; this module stays pure/deterministic so it
      // is testable and so identical state always projects to identical output.
      updatedAt: null
    },
    units: { ...CANONICAL_UNITS, pixelsPerMetre },
    objects: canonicalObjects,
    materials: canonicalMaterials(state?.materials),
    constraints: constraints.map(canonicalConstraint),
    // Forces are not yet authored in the editor; emitted for schema stability.
    forces: [],
    layers: (Array.isArray(state?.layers) ? state.layers : []).map((l) => ({
      id: l.id,
      name: l.name,
      color: l.color,
      visible: l.visible !== false,
      locked: !!l.locked
    })),
    activeLayerId: state?.activeLayerId ?? null,
    environment: {
      // The live store uses down-positive gravity; canonical is up-positive.
      gravity: sim.gravity ? gravityFromLegacyStore(sim.gravity) : canonicalEarthGravity(),
      coordinateConvention: 'right-handed'
    },
    simulationSettings: {
      dt: num(sim.timeStep, 0.016),
      subSteps: num(sim.subSteps, 1),
      fixedTimestep: true,
      integrator: 'semi_implicit_euler',
      constraintIterations: num(sim.solverIterations, 10),
      airResistance: num(sim.airResistance, 0.01),
      timeScale: num(sim.timeScale, 1)
    }
  };
}

/**
 * Restore editor-operational arrays from a canonical scene — the inverse of
 * buildCanonicalScene, used on import.
 *
 * Objects are routed back to the array they came from via `origin`, so a
 * round-trip does not collapse 3D shapes into 2D drafts (the previous importer
 * pushed everything through addCADObject, making 3D geometry unrestorable).
 *
 * @param {object} scene
 * @returns {{objects:Array, shapes3D:Array, constraints:Array, layers:Array, activeLayerId:(string|null)}}
 */
export function applyCanonicalScene(scene) {
  const out = { objects: [], shapes3D: [], constraints: [], layers: [], activeLayerId: null };
  if (!scene || typeof scene !== 'object') return out;

  const pixelsPerMetre = num(scene.units?.pixelsPerMetre, DEFAULT_PIXELS_PER_METRE);

  for (const o of Array.isArray(scene.objects) ? scene.objects : []) {
    if (o?.origin === 'native3d') {
      out.shapes3D.push(shape3DFromCanonical(o));
    } else {
      out.objects.push(draftFromCanonical(o, pixelsPerMetre));
    }
  }
  out.constraints = (Array.isArray(scene.constraints) ? scene.constraints : []).map((c) => ({
    ...(c.parameters || {}),
    id: c.id,
    type: c.type,
    targetA: c.objectA,
    targetB: c.objectB
  }));
  out.layers = Array.isArray(scene.layers) ? scene.layers.map((l) => ({ ...l })) : [];
  out.activeLayerId = scene.activeLayerId ?? null;
  return out;
}

/** Rebuild a native 3D shape entry from its canonical object. */
function shape3DFromCanonical(o) {
  const t = o.transform || {};
  const p = t.position || {};
  const r = t.rotation || {};
  return {
    id: o.id,
    name: o.name,
    type: o.type,
    position: [num(p.x, 0), num(p.y, 0), num(p.z, 0)],
    rotation: [num(r.x, 0), num(r.y, 0), num(r.z, 0)],
    // Scale was folded into geometry dimensions on the way out, so it restores
    // as identity — the dimensions in `params` already carry the final size.
    scale: [1, 1, 1],
    params: { ...(o.geometry?.parameters || {}) },
    color: o.appearance?.color,
    visible: o.visible !== false,
    material_id: o.materialId,
    layerId: o.layerId,
    mass: num(o.physical?.mass, 1),
    restitution: num(o.physical?.restitution, 0.5),
    friction: num(o.physical?.friction, 0.3),
    isStatic: !!o.physical?.isStatic
  };
}

/** Rebuild a 2D draft entry from its canonical object (metres → pixels). */
function draftFromCanonical(o, pixelsPerMetre) {
  const t = o.transform || {};
  const p = t.position || {};
  const r = t.rotation || {};
  const toPx = (m) => num(m, 0) * pixelsPerMetre;
  const dims = o.geometry?.dimensions || {};
  const wPx = toPx(dims.x);
  const hPx = toPx(dims.z);

  const base = {
    id: o.id,
    name: o.name,
    type: o.type,
    // Undo the negation applied in transformFromDraft.
    rotation: -((num(r.y, 0) * 180) / Math.PI),
    depth: toPx(dims.y),
    fill: o.appearance?.color,
    visible: o.visible !== false,
    material_id: o.materialId,
    layerId: o.layerId,
    mass: num(o.physical?.mass, 1),
    restitution: num(o.physical?.restitution, 0.5),
    friction: num(o.physical?.friction, 0.3),
    isStatic: !!o.physical?.isStatic
  };

  const cxPx = toPx(p.x);
  const cyPx = toPx(p.z);

  switch (o.type) {
    case 'rect':
      // Canonical transforms are centred; drafts store the top-left corner.
      return { ...base, x: cxPx - wPx / 2, y: cyPx - hPx / 2, width: wPx, height: hPx };
    case 'circle':
      return { ...base, cx: cxPx, cy: cyPx, r: toPx(o.geometry?.radius) };
    case 'polygon':
      return {
        ...base,
        cx: cxPx,
        cy: cyPx,
        r: toPx(o.geometry?.radius),
        sides: num(o.geometry?.parameters?.sides, 6)
      };
    case 'arc':
      return {
        ...base,
        cx: cxPx,
        cy: cyPx,
        r: toPx(o.geometry?.radius),
        startAngle: num(o.geometry?.parameters?.startAngle, 0),
        endAngle: num(o.geometry?.parameters?.endAngle, 0)
      };
    default:
      return { ...base, cx: cxPx, cy: cyPx };
  }
}
