// Canonical geometry extraction.
//
// REALIS holds geometry in two operational schemas that grew independently:
//
//   objects[]  — 2D drafts, PIXEL coordinates, rotation as a DEGREES scalar,
//                position as top-left {x,y} (rect) or centre {cx,cy} (circle),
//                radius under `r` (and sometimes `radius` for arcs)
//   shapes3D[] — native 3D, rotation as a RADIANS [x,y,z] triple, position as
//                an [x,y,z] array, size under a per-type `params` object
//
// This module is the single place that reads either schema and produces one
// canonical geometry description. Every fallback chain (`r ?? radius`,
// `params ?? dimensions ?? flat`) lives here instead of being re-invented in
// each consumer, which is how the two schemas silently diverged.
//
// Pure module: no THREE.js, React, or store imports.

import { degreesToRadians, pixelsToMetres, DEFAULT_PIXELS_PER_METRE } from './units.js';

/** Canonical geometry kinds. Maps many authoring types onto few physics shapes. */
export const GeometryKind = Object.freeze({
  BOX: 'box',
  SPHERE: 'sphere',
  CYLINDER: 'cylinder',
  CONE: 'cone',
  TORUS: 'torus',
  PLANE: 'plane',
  CAPSULE: 'capsule',
  MESH: 'mesh',
  POLYLINE: 'polyline',
  ANNOTATION: 'annotation'
});

/** True when the entity uses the native 3D schema (position as an array). */
export function isShape3D(entity) {
  return !!entity && Array.isArray(entity.position);
}

function num(v, fallback) {
  return Number.isFinite(v) ? v : fallback;
}

/**
 * Radius of a 2D draft, tolerating the historical `r` / `radius` split.
 * @returns {number}
 */
export function draftRadius(obj) {
  return num(obj?.r, num(obj?.radius, 0));
}

/**
 * Canonical geometry for a native 3D shape. Sizes are taken from `params` with
 * the same defaults the renderer uses, so the canonical scene agrees with what
 * is actually drawn.
 * @param {object} shape
 * @returns {{kind:string, dimensions:{x:number,y:number,z:number}, radius:number, parameters:object}}
 */
export function geometryFromShape3D(shape) {
  const p = shape?.params || {};
  const scale = Array.isArray(shape?.scale) ? shape.scale : [1, 1, 1];
  const sx = num(scale[0], 1);
  const sy = num(scale[1], 1);
  const sz = num(scale[2], 1);

  switch (shape?.type) {
    case 'cube': {
      const w = num(p.width, 10) * sx;
      const h = num(p.height, 10) * sy;
      const d = num(p.depth, 10) * sz;
      return { kind: GeometryKind.BOX, dimensions: { x: w, y: h, z: d }, radius: 0, parameters: { ...p } };
    }
    case 'sphere': {
      const r = num(p.radius, 5) * Math.max(sx, sy, sz);
      return { kind: GeometryKind.SPHERE, dimensions: { x: r * 2, y: r * 2, z: r * 2 }, radius: r, parameters: { ...p } };
    }
    case 'cylinder': {
      // A truncated cone is still a cylinder to the physics layer; the wider
      // end bounds it, so contact tests stay conservative.
      const rt = num(p.radiusTop, 5);
      const rb = num(p.radiusBottom, 5);
      const r = Math.max(rt, rb) * Math.max(sx, sz);
      const h = num(p.height, 10) * sy;
      return { kind: GeometryKind.CYLINDER, dimensions: { x: r * 2, y: h, z: r * 2 }, radius: r, parameters: { ...p } };
    }
    case 'cone': {
      const r = num(p.radius, 5) * Math.max(sx, sz);
      const h = num(p.height, 10) * sy;
      return { kind: GeometryKind.CONE, dimensions: { x: r * 2, y: h, z: r * 2 }, radius: r, parameters: { ...p } };
    }
    case 'torus': {
      const r = num(p.radius, 5);
      const tube = num(p.tube, 2);
      const outer = (r + tube) * Math.max(sx, sz);
      return {
        kind: GeometryKind.TORUS,
        dimensions: { x: outer * 2, y: tube * 2 * sy, z: outer * 2 },
        radius: outer,
        parameters: { ...p }
      };
    }
    case 'plane': {
      const w = num(p.width, 20) * sx;
      const d = num(p.depth, 20) * sz;
      return { kind: GeometryKind.PLANE, dimensions: { x: w, y: 0, z: d }, radius: 0, parameters: { ...p } };
    }
    case 'capsule': {
      const r = num(p.radius, 2) * Math.max(sx, sz);
      const len = num(p.length, 10) * sy;
      return {
        kind: GeometryKind.CAPSULE,
        dimensions: { x: r * 2, y: len + r * 2, z: r * 2 },
        radius: r,
        parameters: { ...p }
      };
    }
    case 'extruded_solid': {
      const depth = num(p.distance, num(shape?.distance, 10));
      return {
        kind: GeometryKind.MESH,
        dimensions: { x: 0, y: 0, z: depth * sz },
        radius: 0,
        parameters: { ...p, distance: depth, direction: p.direction || shape?.direction || 'positive' }
      };
    }
    case 'obj':
      return { kind: GeometryKind.MESH, dimensions: { x: 0, y: 0, z: 0 }, radius: 0, parameters: { ...p, url: shape?.url } };
    default:
      return { kind: GeometryKind.BOX, dimensions: { x: 10 * sx, y: 10 * sy, z: 10 * sz }, radius: 0, parameters: { ...p } };
  }
}

/**
 * Canonical geometry for a 2D draft. 2D drafts lie on the world X/Z ground
 * plane, so a draft's on-screen height becomes the canonical Z extent and the
 * extrusion `depth` becomes the Y (vertical) extent.
 *
 * Dimensions are returned in METRES, not the draft's native pixels. Emitting
 * pixel extents alongside a metre-valued transform would put two unit systems
 * in one canonical object (master spec §1.8) — physics would then compute a
 * 300 m box sitting at 2.5 m, and a round trip would multiply the size by
 * `pixelsPerMetre` on every save.
 *
 * @param {object} obj
 * @param {number} [pixelsPerMetre]
 * @returns {{kind:string, dimensions:{x:number,y:number,z:number}, radius:number, parameters:object}}
 */
export function geometryFromDraft(obj, pixelsPerMetre = DEFAULT_PIXELS_PER_METRE) {
  const toM = (px) => pixelsToMetres(px, pixelsPerMetre);
  const depth = toM(num(obj?.depth, 0));

  switch (obj?.type) {
    case 'rect': {
      const w = toM(Math.abs(num(obj.width, 0)));
      const h = toM(Math.abs(num(obj.height, 0)));
      return { kind: GeometryKind.BOX, dimensions: { x: w, y: depth, z: h }, radius: 0, parameters: {} };
    }
    case 'circle': {
      const r = toM(draftRadius(obj));
      return {
        kind: depth > 0 ? GeometryKind.CYLINDER : GeometryKind.SPHERE,
        dimensions: { x: r * 2, y: depth, z: r * 2 },
        radius: r,
        parameters: {}
      };
    }
    case 'polygon': {
      const r = toM(draftRadius(obj));
      return {
        kind: GeometryKind.CYLINDER,
        dimensions: { x: r * 2, y: depth, z: r * 2 },
        radius: r,
        parameters: { sides: num(obj.sides, 6) }
      };
    }
    case 'arc': {
      const r = toM(draftRadius(obj));
      return {
        kind: GeometryKind.POLYLINE,
        dimensions: { x: r * 2, y: depth, z: r * 2 },
        radius: r,
        // Angles are already radians and unit-free.
        parameters: { startAngle: num(obj.startAngle, 0), endAngle: num(obj.endAngle, 0) }
      };
    }
    case 'path':
    case 'bezier': {
      const pts = Array.isArray(obj.points) ? obj.points : [];
      const xs = pts.map((pt) => num(pt.x, 0));
      const ys = pts.map((pt) => num(pt.y, 0));
      const w = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
      const h = ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
      return {
        kind: GeometryKind.POLYLINE,
        dimensions: { x: toM(w), y: depth, z: toM(h) },
        radius: 0,
        parameters: { pointCount: pts.length }
      };
    }
    case 'ruler':
    case 'dimension': {
      // Measurement annotations carry no mass and are not simulated.
      const dx = num(obj.x2, 0) - num(obj.x1, 0);
      const dy = num(obj.y2, 0) - num(obj.y1, 0);
      return {
        kind: GeometryKind.ANNOTATION,
        dimensions: { x: toM(Math.abs(dx)), y: 0, z: toM(Math.abs(dy)) },
        radius: 0,
        parameters: { length: toM(Math.hypot(dx, dy)) }
      };
    }
    default:
      return { kind: GeometryKind.BOX, dimensions: { x: 0, y: depth, z: 0 }, radius: 0, parameters: {} };
  }
}

/** Geometry kinds that are annotations rather than simulable bodies. */
export function isAnnotationKind(kind) {
  return kind === GeometryKind.ANNOTATION;
}

/**
 * Canonical world-space transform for a 2D draft, converting pixels → metres
 * and the degrees-scalar screen rotation → radians about the vertical axis.
 *
 * The negation matches the existing rendering convention (screen-space rotation
 * is clockwise, world Y rotation is counter-clockwise); see scene/transform.js,
 * which performs the inverse mapping.
 *
 * @param {object} obj
 * @param {number} [pixelsPerMetre]
 * @returns {{position:{x,y,z}, rotation:{x,y,z}, scale:{x,y,z}}}
 */
export function transformFromDraft(obj, pixelsPerMetre = DEFAULT_PIXELS_PER_METRE) {
  const toM = (px) => pixelsToMetres(px, pixelsPerMetre);

  let cx = 0;
  let cz = 0;
  switch (obj?.type) {
    case 'rect':
      // Drafts store the top-left corner; canonical transforms are centred.
      cx = num(obj.x, 0) + Math.abs(num(obj.width, 0)) / 2;
      cz = num(obj.y, 0) + Math.abs(num(obj.height, 0)) / 2;
      break;
    case 'ruler':
    case 'dimension':
      cx = (num(obj.x1, 0) + num(obj.x2, 0)) / 2;
      cz = (num(obj.y1, 0) + num(obj.y2, 0)) / 2;
      break;
    case 'path':
    case 'bezier': {
      const pts = Array.isArray(obj.points) ? obj.points : [];
      if (pts.length) {
        cx = pts.reduce((s, p) => s + num(p.x, 0), 0) / pts.length;
        cz = pts.reduce((s, p) => s + num(p.y, 0), 0) / pts.length;
      }
      break;
    }
    default:
      cx = num(obj?.cx, num(obj?.x, 0));
      cz = num(obj?.cy, num(obj?.y, 0));
      break;
  }

  const verticalCentre = num(obj?.y_override, num(obj?.depth, 0) / 2);

  return {
    position: { x: toM(cx), y: toM(verticalCentre), z: toM(cz) },
    rotation: { x: 0, y: -degreesToRadians(num(obj?.rotation, 0)), z: 0 },
    scale: { x: 1, y: 1, z: 1 }
  };
}

/**
 * Canonical world-space transform for a native 3D shape. Already metres and
 * radians, so this only normalizes array → {x,y,z} and guards non-finite values.
 * Scale is folded into the geometry dimensions (see geometryFromShape3D) and
 * reported here as identity so size is never applied twice.
 * @param {object} shape
 * @returns {{position:{x,y,z}, rotation:{x,y,z}, scale:{x,y,z}}}
 */
export function transformFromShape3D(shape) {
  const p = Array.isArray(shape?.position) ? shape.position : [0, 0, 0];
  const r = Array.isArray(shape?.rotation) ? shape.rotation : [0, 0, 0];
  return {
    position: { x: num(p[0], 0), y: num(p[1], 0), z: num(p[2], 0) },
    rotation: { x: num(r[0], 0), y: num(r[1], 0), z: num(r[2], 0) },
    scale: { x: 1, y: 1, z: 1 }
  };
}
