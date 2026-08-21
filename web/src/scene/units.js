// REALIS canonical unit conventions.
//
// Per the master spec (§1.8), REALIS uses SI units internally. This module is
// the SINGLE declaration of that convention plus the conversions needed at the
// boundaries where legacy representations disagree with it. Before this module
// existed the repository carried five contradictory gravity conventions, two
// rotation units, and four `groundY` values with no single source of truth.
//
// Pure module: no THREE.js, React, or store imports.
//
// ── CANONICAL CONVENTION ────────────────────────────────────────────────
//   Length            metres
//   Mass              kilograms
//   Time              seconds
//   Angle             radians
//   Gravity           metres/second², UP-POSITIVE (so Earth gravity is
//                     y = -9.81 — a body falls toward -y)
//   Handedness        right-handed (matches Three.js and the canonical scene)
//   Ground plane      2D drafts lie on the world X/Z plane; +Y is up
//
// ── KNOWN LEGACY DEVIATIONS (documented, not silently "fixed") ──────────
// These are real and load-bearing. Converting them in place would change
// simulation behaviour, which is owned by the physics layer, so conversion
// happens explicitly at serialization boundaries instead.
//
//   store.simulationSettings.gravity.y = +9.81  (DOWN-positive)
//     — the live editor store uses screen-style down-positive gravity, the
//       opposite sign to the canonical scene. `useSimulation` negates it on the
//       way to the solver API. Use gravityToCanonical/gravityFromLegacyStore.
//
//   objects[].rotation  = degrees, scalar, about the vertical axis, and
//                         negated on read (screen-space clockwise)
//   shapes3D[].rotation = radians, [x, y, z] Euler triple
//     — use degreesToRadians/radiansToDegrees; the negation is part of the
//       2D screen-space convention and is handled by scene/transform.js.
//
//   2D draft coordinates are in PIXELS, not metres. There is no repository-wide
//     pixels-per-metre constant; the canonical scene therefore records the scale
//     explicitly (see DEFAULT_PIXELS_PER_METRE) rather than guessing.

/** Standard Earth gravitational acceleration, m/s² (magnitude). */
export const EARTH_GRAVITY = 9.81;

/**
 * Canonical Earth gravity vector: up-positive, so falling is toward -y.
 * @returns {{x:number,y:number,z:number}} a fresh vector (never a shared ref)
 */
export function canonicalEarthGravity() {
  return { x: 0, y: -EARTH_GRAVITY, z: 0 };
}

/**
 * Pixels per metre used when projecting 2D pixel-space drafts into the
 * canonical metre-based scene. 2D drafts are authored at roughly 100px per
 * "unit", so 100 px/m keeps exported scenes at human scale instead of
 * kilometre-sized. Recorded explicitly in the scene so the choice is visible
 * and reversible rather than implicit.
 */
export const DEFAULT_PIXELS_PER_METRE = 100;

/** Degrees → radians. */
export function degreesToRadians(deg) {
  return (deg * Math.PI) / 180;
}

/** Radians → degrees. */
export function radiansToDegrees(rad) {
  return (rad * 180) / Math.PI;
}

/** Pixels → metres at the given scale. */
export function pixelsToMetres(px, pixelsPerMetre = DEFAULT_PIXELS_PER_METRE) {
  return px / pixelsPerMetre;
}

/** Metres → pixels at the given scale. */
export function metresToPixels(m, pixelsPerMetre = DEFAULT_PIXELS_PER_METRE) {
  return m * pixelsPerMetre;
}

/**
 * Convert a gravity vector from the live store's DOWN-positive convention to
 * the canonical UP-positive convention. Only the vertical component differs.
 * @param {{x?:number,y?:number,z?:number}} g
 * @returns {{x:number,y:number,z:number}}
 */
export function gravityFromLegacyStore(g) {
  if (!g) return canonicalEarthGravity();
  return { x: g.x || 0, y: -(g.y ?? EARTH_GRAVITY), z: g.z || 0 };
}

/**
 * Inverse of gravityFromLegacyStore: canonical UP-positive → the live store's
 * DOWN-positive convention.
 * @param {{x?:number,y?:number,z?:number}} g
 * @returns {{x:number,y:number,z:number}}
 */
export function gravityToLegacyStore(g) {
  if (!g) return { x: 0, y: EARTH_GRAVITY, z: 0 };
  return { x: g.x || 0, y: -(g.y ?? -EARTH_GRAVITY), z: g.z || 0 };
}

/** Machine-readable description of the canonical convention, embedded in exports. */
export const CANONICAL_UNITS = Object.freeze({
  length: 'm',
  mass: 'kg',
  time: 's',
  angle: 'rad',
  velocity: 'm/s',
  acceleration: 'm/s^2',
  force: 'N',
  torque: 'N*m',
  energy: 'J',
  momentum: 'kg*m/s',
  gravitySign: 'up-positive',
  handedness: 'right-handed'
});
