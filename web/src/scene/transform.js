// Canonical-scene transform helpers.
//
// These functions form the boundary between the rendering layer (Three.js /
// R3F, which may hold THREE.Object3D instances) and the canonical scene state
// (plain numeric data held in the Zustand store). They accept and return only
// plain numbers/arrays — NO THREE.js objects, React refs, or store handles —
// so that Three.js never leaks into the authoritative scene representation.
//
// All transform mutations funnel through these helpers so the mapping logic
// lives in exactly one place instead of being duplicated across viewport
// components.

/**
 * Clamp a value to a finite number, falling back when it is NaN/±Infinity or
 * not a number at all.
 * @param {number} value
 * @param {number} [fallback=0]
 * @returns {number}
 */
export function sanitizeNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Sanitize an `[x, y, z]` triple, replacing any non-finite component with the
 * matching component of `fallback`.
 * @param {unknown} vec
 * @param {[number, number, number]} [fallback=[0,0,0]]
 * @returns {[number, number, number]}
 */
export function sanitizeVec3Array(vec, fallback = [0, 0, 0]) {
  if (!Array.isArray(vec)) return [...fallback];
  return [
    sanitizeNumber(vec[0], fallback[0]),
    sanitizeNumber(vec[1], fallback[1]),
    sanitizeNumber(vec[2], fallback[2]),
  ];
}

/**
 * Normalize a raw `{ position, rotation, scale }` read off a rendering object
 * (all plain-number triples) into a sanitized transform patch for a native 3D
 * shape. Non-finite components fall back to the shape's previous value; zero
 * scale components fall back to the previous scale (or 1) to avoid collapsing
 * geometry into a degenerate, non-invertible mesh.
 *
 * @param {{position?:number[], rotation?:number[], scale?:number[]}} raw
 * @param {{position?:number[], rotation?:number[], scale?:number[]}} [prev={}]
 * @returns {{position:[number,number,number], rotation:[number,number,number], scale:[number,number,number]}}
 */
export function sanitizeShape3DTransform(raw, prev = {}) {
  const prevPos = Array.isArray(prev.position) ? prev.position : [0, 0, 0];
  const prevRot = Array.isArray(prev.rotation) ? prev.rotation : [0, 0, 0];
  const prevScale = Array.isArray(prev.scale) ? prev.scale : [1, 1, 1];

  const scale = sanitizeVec3Array(raw.scale, prevScale).map((s, i) =>
    s === 0 ? prevScale[i] || 1 : s
  );

  return {
    position: sanitizeVec3Array(raw.position, prevPos),
    rotation: sanitizeVec3Array(raw.rotation, prevRot),
    scale,
  };
}

/**
 * Map a 3D gizmo transform (plain numbers) back onto a 2D draft object's
 * schema. 2D drafts are laid out on the X/Z ground plane, and their rotation
 * is stored in degrees about the vertical (Y) axis. Position is always mapped;
 * rotation is only mapped when the active gizmo `mode` is `'rotate'` (scaling a
 * 2D draft via the 3D gizmo is intentionally a no-op — 2D size is edited in the
 * 2D canvas / inspector). Returns a partial patch to merge onto the object.
 *
 * @param {object} obj  The existing 2D draft object.
 * @param {{position?:number[], rotation?:number[]}} raw  Plain gizmo transform.
 * @param {string} mode  Active gizmo mode ('translate' | 'rotate' | 'scale').
 * @returns {object} Partial patch of 2D schema fields.
 */
export function map3DTransformTo2DObject(obj, raw, mode) {
  const patch = {};

  const px = raw.position ? sanitizeNumber(raw.position[0], NaN) : NaN;
  const pz = raw.position ? sanitizeNumber(raw.position[2], NaN) : NaN;
  if (Number.isFinite(px) && Number.isFinite(pz)) {
    if (obj.cx !== undefined) {
      patch.cx = px;
      patch.cy = pz;
    } else if (obj.x !== undefined) {
      patch.x = px - (obj.width || 0) / 2;
      patch.y = pz - (obj.height || 0) / 2;
    }
  }

  if (mode === 'rotate') {
    const ry = raw.rotation ? sanitizeNumber(raw.rotation[1], 0) : 0;
    patch.rotation = -((ry * 180) / Math.PI);
  }

  return patch;
}
