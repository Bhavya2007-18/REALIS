// Entity lifecycle helpers for the canonical scene (Phase 4).
//
// Pure functions — NO THREE.js, React, or store imports. This module owns the
// shared logic for stable ids, deterministic names, clones, and constraint
// cleanup so those snippets stop being copy-pasted (and drifting) across the
// store and the viewport components. Everything here operates on plain scene
// data only.

let idCounter = 0;

/**
 * Generate an entity id.
 *
 * Deterministic by construction: a monotonic counter, so the same sequence of
 * operations from a fresh module always produces the same ids (§1.9). The
 * previous Math.random suffix made every created scene un-reproducible and any
 * id-bearing assertion unwritable.
 *
 * Uniqueness against ids from other sessions is preserved by `reserveEntityIds`,
 * which the import path calls to push the counter past every id already present
 * in a loaded scene — so newly created bodies cannot collide with imported ones.
 *
 * @param {string} [prefix='']
 * @returns {string}
 */
export function newEntityId(prefix = '') {
  idCounter += 1;
  return `${prefix}${idCounter.toString(36)}`;
}

/**
 * Advance the id counter past every id in `ids` so subsequently generated ids
 * cannot collide with them. Ids not in the generated form are ignored.
 *
 * @param {Iterable<string>} ids
 * @returns {number} the counter value after reserving
 */
export function reserveEntityIds(ids) {
  for (const id of ids || []) {
    if (typeof id !== 'string') continue;
    // Generated ids end in a base-36 counter, optionally after a `type_` prefix.
    const tail = id.slice(id.lastIndexOf('_') + 1);
    const n = parseInt(tail, 36);
    if (Number.isFinite(n) && n > idCounter) idCounter = n;
  }
  return idCounter;
}

/** Reset the id counter. Test-only; keeps id assertions reproducible. */
export function __resetEntityIds() {
  idCounter = 0;
}

/** Physics defaults applied to any body created without explicit values. */
export const PHYSICS_DEFAULTS = Object.freeze({
  mass: 1.0,
  restitution: 0.5,
  friction: 0.3,
  isStatic: false
});

/**
 * Guarantee the canonical Body invariants: every body has a unique id, a
 * display name, a visibility flag, and physics values.
 *
 * This is the ONE place identity is minted. Identity used to be each call
 * site's job, so any path that forgot produced a body that could not be
 * selected, deleted, constrained, or serialized — and the failure surfaced much
 * later as a validation error about "objects[0]" with no way to say which
 * object that was.
 *
 * The caller's own id and name always win, so import and paste keep the
 * identity they arrived with.
 *
 * @param {object} entity
 * @param {Array} siblings  Entities already in the same array, for name uniqueness.
 * @returns {object} a new object; `entity` is not mutated
 */
export function withEntityIdentity(entity, siblings) {
  const e = entity || {};
  const id = e.id || newEntityId(e.type ? `${e.type}_` : '');
  return {
    visible: true,
    ...PHYSICS_DEFAULTS,
    name: nextEntityName(siblings, e.type),
    ...e,
    // Assigned after the spread so a caller passing an explicit
    // `id: undefined` cannot erase the identity we just guaranteed.
    id
  };
}

/**
 * Turn a type token into a display label: 'extruded_solid' -> 'Extruded Solid'.
 * @param {string} type
 * @returns {string}
 */
function titleizeType(type) {
  if (!type) return 'Object';
  return String(type)
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Deterministic next name for a new entity of `type`. Scans `list` for the
 * highest existing "<Label> <n>" index so generated names stay unique and
 * stable across the session (e.g. "Cube 1", "Cube 2", ...).
 * @param {Array<{name?:string,type?:string}>} list
 * @param {string} type
 * @returns {string}
 */
export function nextEntityName(list, type) {
  const label = titleizeType(type);
  const prefix = `${label} `;
  let max = 0;
  for (const item of list || []) {
    const name = item && item.name;
    if (typeof name === 'string' && name.startsWith(prefix)) {
      const n = parseInt(name.slice(prefix.length), 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return `${label} ${max + 1}`;
}

/**
 * True when an entity uses the native 3D schema (position stored as an
 * [x, y, z] array) rather than the 2D draft schema.
 * @param {object} entity
 * @returns {boolean}
 */
export function isShape3D(entity) {
  return !!entity && Array.isArray(entity.position);
}

/**
 * Offset a clone's position in place, dispatching on its schema. 3D shapes move
 * on the ground plane (x/z); 2D drafts move by their own coordinate fields.
 * @param {object} clone
 * @param {number} offset2D
 * @param {number} offset3D
 * @returns {object} the same clone, mutated
 */
function offsetClone(clone, offset2D, offset3D) {
  if (isShape3D(clone)) {
    clone.position = [
      clone.position[0] + offset3D,
      clone.position[1],
      clone.position[2] + offset3D,
    ];
    return clone;
  }
  switch (clone.type) {
    case 'rect':
      clone.x += offset2D;
      clone.y += offset2D;
      break;
    case 'circle':
    case 'polygon':
    case 'arc':
      clone.cx += offset2D;
      clone.cy += offset2D;
      break;
    case 'path':
    case 'bezier':
      if (Array.isArray(clone.points)) {
        clone.points = clone.points.map((p) => ({ ...p, x: p.x + offset2D, y: p.y + offset2D }));
      }
      break;
    case 'ruler':
    case 'dimension':
      clone.x1 += offset2D;
      clone.y1 += offset2D;
      clone.x2 += offset2D;
      clone.y2 += offset2D;
      break;
    default:
      if (typeof clone.x === 'number') {
        clone.x += offset2D;
        clone.y += offset2D;
      } else if (typeof clone.cx === 'number') {
        clone.cx += offset2D;
        clone.cy += offset2D;
      }
      break;
  }
  return clone;
}

/**
 * Deep-clone a scene entity into an independent copy with a fresh stable id, a
 * fresh deterministic name (only if the source was named), and a small position
 * offset so the copy is visibly distinct. `siblings` should include entities
 * already present *and* clones produced earlier in the same batch so names do
 * not collide.
 *
 * @param {object} entity
 * @param {Array} siblings
 * @param {{offset2D?:number, offset3D?:number}} [opts]
 * @returns {object} the new clone
 */
export function cloneEntity(entity, siblings, opts = {}) {
  const { offset2D = 20, offset3D = 0.5 } = opts;
  // Entities are plain JSON data (no functions / THREE refs), so a structural
  // JSON clone is both safe and guarantees no shared nested references.
  const clone = JSON.parse(JSON.stringify(entity));
  clone.id = newEntityId();
  if (entity.name) clone.name = nextEntityName(siblings, entity.type);
  return offsetClone(clone, offset2D, offset3D);
}

/**
 * Drop any constraint that references a deleted entity id through targetA /
 * targetB (or the physics-style bodyAId / bodyBId aliases), preventing dangling
 * references after a delete. Returns a new array; never mutates the input.
 * @param {Array<object>} constraints
 * @param {Set<string>} deletedIdSet
 * @returns {Array<object>}
 */
export function pruneConstraints(constraints, deletedIdSet) {
  if (!Array.isArray(constraints)) return [];
  return constraints.filter((c) => {
    const refs = [c.targetA, c.targetB, c.bodyAId, c.bodyBId, c.bodyA, c.bodyB];
    return !refs.some((r) => r != null && deletedIdSet.has(r));
  });
}
