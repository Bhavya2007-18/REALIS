// Canonical material library.
//
// THE PROBLEM THIS SOLVES
// REALIS carried TWO material libraries that did not agree and could not be
// reconciled by any consumer:
//
//   useStore.materials          — snake_case physics only (density, restitution,
//                                 static_friction, dynamic_friction) for
//                                 steel/rubber/wood/ice/concrete/plastic/custom.
//                                 Reachable through `applyMaterial`, which no UI
//                                 ever called.
//   PropertiesPanel.MATERIALS   — appearance + a *different* set of friction and
//                                 restitution numbers, for a *different* key set
//                                 (aluminum/cast_iron/structural_steel/titanium…),
//                                 with NO density at all.
//
// Picking "Steel" in the properties panel therefore wrote restitution 0.3, while
// the store's canonical steel said 0.20 — the same named material had two
// physical identities depending on which code path touched the body, and neither
// path could compute mass because only one library knew density. That is exactly
// the "one concept = one canonical representation" rule (master spec §1.3) being
// violated, and it surfaced as bodies whose bounce changed depending on how they
// were authored.
//
// This module is the ONE material library. It carries both the physical
// properties (SI units, §1.8) and the appearance properties, so a material is a
// single thing and assigning it is a single operation.
//
// Pure module: no THREE.js, React, or store imports.

import { GeometryKind } from './geometry.js';

/**
 * The canonical material library.
 *
 * Physical properties are SI (§1.8): density in kg/m³, restitution and both
 * friction coefficients dimensionless. Appearance properties feed the renderer's
 * PBR material. Densities are real reference values, not decoration — mass is
 * derived from them (see `massFromDensity`), so a wrong number here produces a
 * wrong simulation rather than a wrong colour.
 *
 * Where the two former libraries disagreed on restitution/friction, the store's
 * values were kept: they were the ones the canonical scene already exported.
 */
export const MATERIAL_LIBRARY = Object.freeze({
  custom: {
    name: 'Custom',
    density: 1000, restitution: 0.50, static_friction: 0.30, dynamic_friction: 0.30,
    color: '#3b82f6', roughness: 0.5, metalness: 0.1
  },
  steel: {
    name: 'Steel',
    density: 7850, restitution: 0.20, static_friction: 0.40, dynamic_friction: 0.30,
    color: '#9ca3af', roughness: 0.4, metalness: 0.9
  },
  structural_steel: {
    name: 'Structural Steel',
    density: 7850, restitution: 0.15, static_friction: 0.45, dynamic_friction: 0.35,
    color: '#eab308', roughness: 0.7, metalness: 0.8
  },
  stainless_steel: {
    name: 'Stainless Steel',
    density: 8000, restitution: 0.25, static_friction: 0.35, dynamic_friction: 0.25,
    color: '#d4d4d8', roughness: 0.25, metalness: 0.95
  },
  cast_iron: {
    name: 'Cast Iron',
    density: 7200, restitution: 0.10, static_friction: 0.30, dynamic_friction: 0.25,
    color: '#4b5563', roughness: 0.6, metalness: 0.6
  },
  aluminum: {
    name: 'Aluminium',
    density: 2700, restitution: 0.25, static_friction: 0.25, dynamic_friction: 0.18,
    color: '#d1d5db', roughness: 0.3, metalness: 0.8
  },
  titanium: {
    name: 'Titanium',
    density: 4500, restitution: 0.30, static_friction: 0.35, dynamic_friction: 0.30,
    color: '#e5e7eb', roughness: 0.2, metalness: 0.8
  },
  copper: {
    name: 'Copper',
    density: 8960, restitution: 0.20, static_friction: 0.45, dynamic_friction: 0.35,
    color: '#c2703f', roughness: 0.35, metalness: 0.9
  },
  concrete: {
    name: 'Concrete',
    density: 2400, restitution: 0.15, static_friction: 0.70, dynamic_friction: 0.60,
    color: '#a8a29e', roughness: 0.95, metalness: 0.0
  },
  glass: {
    name: 'Glass',
    density: 2500, restitution: 0.40, static_friction: 0.40, dynamic_friction: 0.35,
    color: '#bae6fd', roughness: 0.05, metalness: 0.0
  },
  wood: {
    name: 'Wood',
    density: 700, restitution: 0.40, static_friction: 0.50, dynamic_friction: 0.40,
    color: '#b45309', roughness: 0.85, metalness: 0.0
  },
  plastic: {
    name: 'Plastic (ABS)',
    density: 1040, restitution: 0.60, static_friction: 0.30, dynamic_friction: 0.25,
    color: '#3b82f6', roughness: 0.8, metalness: 0.1
  },
  rubber: {
    name: 'Rubber',
    density: 1100, restitution: 0.85, static_friction: 0.90, dynamic_friction: 0.80,
    color: '#1f2937', roughness: 0.95, metalness: 0.0
  },
  ice: {
    name: 'Ice',
    density: 917, restitution: 0.10, static_friction: 0.05, dynamic_friction: 0.02,
    color: '#e0f2fe', roughness: 0.15, metalness: 0.0
  }
});

/** Stable ordering for menus. Object key order is not a contract to rely on. */
export const MATERIAL_KEYS = Object.freeze(Object.keys(MATERIAL_LIBRARY));

/**
 * Look a material up by key.
 * @param {string} key
 * @returns {object|null} null when the key names nothing — callers must handle
 *   the miss rather than silently substituting a default (§1.4).
 */
export function getMaterial(key) {
  return (key && MATERIAL_LIBRARY[key]) || null;
}

function num(v, fallback) {
  return Number.isFinite(v) ? v : fallback;
}

/**
 * Volume of a canonical geometry, in cubic metres.
 *
 * Returns **null** when the volume genuinely cannot be derived — an imported
 * mesh, an extruded profile whose cross-section area is not computed here, a
 * zero-thickness plane, or an annotation. Returning a made-up number instead
 * would let mass silently become fiction (§1.5); a null lets the caller say
 * "mass could not be derived from density" and leave the user's own value alone.
 *
 * @param {{kind:string, dimensions:{x:number,y:number,z:number}, radius:number, parameters?:object}} geometry
 * @returns {number|null}
 */
export function volumeOf(geometry) {
  if (!geometry) return null;
  const d = geometry.dimensions || {};
  const x = num(d.x, 0);
  const y = num(d.y, 0);
  const z = num(d.z, 0);
  const r = num(geometry.radius, 0);
  const p = geometry.parameters || {};

  switch (geometry.kind) {
    case GeometryKind.BOX: {
      const v = x * y * z;
      return v > 0 ? v : null;
    }
    case GeometryKind.SPHERE:
      return r > 0 ? (4 / 3) * Math.PI * r ** 3 : null;

    case GeometryKind.CYLINDER: {
      // A truncated cone (radiusTop ≠ radiusBottom) is a frustum, not a
      // cylinder. `geometryFromShape3D` collapses it to its wider radius so
      // contact tests stay conservative, but using that radius for mass would
      // overstate a tapered body — so the exact frustum volume is used when
      // both radii are known.
      const h = y > 0 ? y : num(p.height, 0);
      if (!(h > 0)) return null;
      const rt = num(p.radiusTop, r);
      const rb = num(p.radiusBottom, r);
      if (rt > 0 || rb > 0) {
        return (Math.PI * h / 3) * (rt * rt + rt * rb + rb * rb);
      }
      return r > 0 ? Math.PI * r * r * h : null;
    }
    case GeometryKind.CONE: {
      const h = y > 0 ? y : num(p.height, 0);
      return r > 0 && h > 0 ? (1 / 3) * Math.PI * r * r * h : null;
    }
    case GeometryKind.TORUS: {
      // V = 2π²·R·t², with R the major (centreline) radius and t the tube
      // radius. `geometry.radius` is the OUTER radius (R + t), so the major
      // radius has to be recovered from the authoring parameters.
      const major = num(p.radius, 0);
      const tube = num(p.tube, 0);
      return major > 0 && tube > 0 ? 2 * Math.PI ** 2 * major * tube * tube : null;
    }
    case GeometryKind.CAPSULE: {
      // Cylindrical shaft plus two hemispherical caps.
      const len = num(p.length, Math.max(0, y - 2 * r));
      return r > 0 ? Math.PI * r * r * len + (4 / 3) * Math.PI * r ** 3 : null;
    }
    case GeometryKind.PLANE:
      // A plane has no thickness, so it has no volume and no derivable mass.
      // Planes are authored as static bodies, where mass is not used anyway.
      return null;

    case GeometryKind.MESH:
    case GeometryKind.POLYLINE:
    case GeometryKind.ANNOTATION:
    default:
      return null;
  }
}

/**
 * Mass in kilograms from a material's density and a body's geometry: m = ρV.
 *
 * @param {object} geometry canonical geometry (see `volumeOf`)
 * @param {number} density kg/m³
 * @returns {number|null} null when the volume is not derivable, so the caller
 *   can keep the user's explicit mass rather than overwrite it with a guess.
 */
export function massFromDensity(geometry, density) {
  const v = volumeOf(geometry);
  if (v == null || !Number.isFinite(density) || density <= 0) return null;
  const m = v * density;
  return Number.isFinite(m) && m > 0 ? m : null;
}

/**
 * The physical half of a material, in the shape a body stores it.
 *
 * Bodies carry a single `friction`, while a material distinguishes static from
 * dynamic. The dynamic coefficient is the one that governs sliding contact, so
 * that is what a body's `friction` becomes; both are kept on the material for
 * solvers that model stiction.
 *
 * @param {string} key
 * @returns {{material_id:string, restitution:number, friction:number,
 *            static_friction:number, dynamic_friction:number}|null}
 */
export function bodyPhysicsForMaterial(key) {
  const m = getMaterial(key);
  if (!m) return null;
  return {
    material_id: key,
    restitution: m.restitution,
    friction: m.dynamic_friction,
    static_friction: m.static_friction,
    dynamic_friction: m.dynamic_friction
  };
}

/**
 * The appearance half of a material, keyed for whichever schema the body uses.
 * 2D drafts are drawn as SVG strokes and fills; native 3D bodies use a PBR
 * material. One material, two renderers — dispatched here so no call site has to
 * remember which field name applies.
 *
 * @param {string} key
 * @param {boolean} is3D
 * @returns {object|null}
 */
export function bodyAppearanceForMaterial(key, is3D) {
  const m = getMaterial(key);
  if (!m) return null;
  if (is3D) {
    return { color: m.color, roughness: m.roughness, metalness: m.metalness };
  }
  return { stroke: m.color, fill: `${m.color}33` };
}
