// Tests for the canonical material library: volume derivation and m = ρV.
//
// Volume is what makes density mean anything, so it is the part worth pinning:
// a wrong formula here produces a body whose mass is plausible but wrong, which
// is far harder to notice than a crash.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MATERIAL_LIBRARY, MATERIAL_KEYS, getMaterial, volumeOf, massFromDensity,
  bodyPhysicsForMaterial, bodyAppearanceForMaterial
} from '../materials.js';
import { GeometryKind, geometryFromShape3D } from '../geometry.js';

const close = (a, b, tol = 1e-9) =>
  assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} !≈ ${b}`);

test('every material carries the full physical contract', () => {
  for (const key of MATERIAL_KEYS) {
    const m = MATERIAL_LIBRARY[key];
    assert.ok(m.name, `${key} has no name`);
    assert.ok(m.density > 0, `${key} density must be positive`);
    assert.ok(m.restitution >= 0 && m.restitution <= 1, `${key} restitution out of range`);
    assert.ok(m.static_friction >= 0, `${key} static_friction negative`);
    assert.ok(m.dynamic_friction >= 0, `${key} dynamic_friction negative`);
    // Appearance must be complete too: a material that assigns an undefined
    // colour makes the body render black with no explanation.
    assert.match(m.color, /^#[0-9a-f]{6}$/i, `${key} colour is not a hex triplet`);
    assert.ok(m.roughness >= 0 && m.roughness <= 1, `${key} roughness out of range`);
    assert.ok(m.metalness >= 0 && m.metalness <= 1, `${key} metalness out of range`);
  }
});

test('an unknown material key is a miss, not a silent default', () => {
  assert.equal(getMaterial('unobtainium'), null);
  assert.equal(getMaterial(undefined), null);
  assert.equal(bodyPhysicsForMaterial('unobtainium'), null);
  assert.equal(bodyAppearanceForMaterial('unobtainium', true), null);
});

test('box volume is the product of its extents', () => {
  close(volumeOf({ kind: GeometryKind.BOX, dimensions: { x: 2, y: 3, z: 4 }, radius: 0 }), 24);
});

test('sphere volume is 4/3 pi r^3', () => {
  close(volumeOf({ kind: GeometryKind.SPHERE, dimensions: {}, radius: 2 }), (4 / 3) * Math.PI * 8);
});

test('cylinder volume uses the frustum formula so a taper is not overstated', () => {
  // A straight cylinder must still reduce to pi r^2 h.
  const straight = volumeOf({
    kind: GeometryKind.CYLINDER, dimensions: { y: 10 }, radius: 3,
    parameters: { radiusTop: 3, radiusBottom: 3, height: 10 }
  });
  close(straight, Math.PI * 9 * 10);

  // A cone-like frustum (top radius 0) is a cone: 1/3 pi r^2 h. Using the
  // conservative bounding radius instead would have reported 3x the mass.
  const tapered = volumeOf({
    kind: GeometryKind.CYLINDER, dimensions: { y: 10 }, radius: 3,
    parameters: { radiusTop: 0, radiusBottom: 3, height: 10 }
  });
  close(tapered, (1 / 3) * Math.PI * 9 * 10);
  assert.ok(tapered < straight, 'a tapered body must not weigh as much as a straight one');
});

test('cone volume is a third of its bounding cylinder', () => {
  const v = volumeOf({ kind: GeometryKind.CONE, dimensions: { y: 6 }, radius: 2, parameters: { height: 6 } });
  close(v, (1 / 3) * Math.PI * 4 * 6);
});

test('torus volume uses the major radius, not the outer radius', () => {
  // geometry.radius is the OUTER radius (R + t); using it in 2*pi^2*R*t^2 would
  // overstate the volume, so the major radius is recovered from parameters.
  const v = volumeOf({
    kind: GeometryKind.TORUS, dimensions: {}, radius: 7,
    parameters: { radius: 5, tube: 2 }
  });
  close(v, 2 * Math.PI ** 2 * 5 * 4);
});

test('capsule volume is a shaft plus two hemispherical caps', () => {
  const v = volumeOf({
    kind: GeometryKind.CAPSULE, dimensions: { y: 14 }, radius: 2, parameters: { length: 10 }
  });
  close(v, Math.PI * 4 * 10 + (4 / 3) * Math.PI * 8);
});

test('geometries with no derivable volume return null rather than a guess', () => {
  // §1.5: fabricating a volume here would make mass fiction. Each of these has
  // to be reported as "not derivable" so the caller keeps the user's own mass.
  assert.equal(volumeOf({ kind: GeometryKind.PLANE, dimensions: { x: 20, y: 0, z: 20 }, radius: 0 }), null);
  assert.equal(volumeOf({ kind: GeometryKind.MESH, dimensions: { x: 0, y: 0, z: 5 }, radius: 0 }), null);
  assert.equal(volumeOf({ kind: GeometryKind.POLYLINE, dimensions: {}, radius: 0 }), null);
  assert.equal(volumeOf({ kind: GeometryKind.ANNOTATION, dimensions: {}, radius: 0 }), null);
  assert.equal(volumeOf(null), null);
  // A zero-extent box is degenerate, not massless-but-valid.
  assert.equal(volumeOf({ kind: GeometryKind.BOX, dimensions: { x: 2, y: 0, z: 4 }, radius: 0 }), null);
});

test('mass is density times volume', () => {
  const geo = { kind: GeometryKind.BOX, dimensions: { x: 0.1, y: 0.1, z: 0.1 }, radius: 0 };
  // A 0.1 m steel cube: 1e-3 m^3 * 7850 kg/m^3 = 7.85 kg.
  close(massFromDensity(geo, MATERIAL_LIBRARY.steel.density), 7.85);
  // Rubber is lighter than steel for the same shape — the ordering, not just
  // the arithmetic, is what makes a material choice observable.
  assert.ok(
    massFromDensity(geo, MATERIAL_LIBRARY.rubber.density) <
    massFromDensity(geo, MATERIAL_LIBRARY.steel.density)
  );
});

test('mass is null when volume or density is unusable', () => {
  const plane = { kind: GeometryKind.PLANE, dimensions: { x: 5, y: 0, z: 5 }, radius: 0 };
  assert.equal(massFromDensity(plane, 7850), null);
  const box = { kind: GeometryKind.BOX, dimensions: { x: 1, y: 1, z: 1 }, radius: 0 };
  assert.equal(massFromDensity(box, 0), null);
  assert.equal(massFromDensity(box, -5), null);
  assert.equal(massFromDensity(box, NaN), null);
});

test('volume derives from a real authoring shape, not just a hand-built geometry', () => {
  // Guards the seam: geometryFromShape3D's output must be directly consumable by
  // volumeOf. A default cube is 10x10x10 in its params.
  const v = volumeOf(geometryFromShape3D({ type: 'cube', position: [0, 0, 0], params: { width: 2, height: 3, depth: 4 } }));
  close(v, 24);

  // Scale must reach the volume: doubling every axis is 8x the mass.
  const scaled = volumeOf(geometryFromShape3D({
    type: 'cube', position: [0, 0, 0], scale: [2, 2, 2], params: { width: 2, height: 3, depth: 4 }
  }));
  close(scaled, 24 * 8);
});

test('a body takes the dynamic friction coefficient', () => {
  // Bodies carry one `friction`; sliding contact is governed by the dynamic
  // coefficient, and conflating it with the static one changes how things slide.
  const p = bodyPhysicsForMaterial('rubber');
  assert.equal(p.material_id, 'rubber');
  assert.equal(p.friction, MATERIAL_LIBRARY.rubber.dynamic_friction);
  assert.equal(p.static_friction, MATERIAL_LIBRARY.rubber.static_friction);
  assert.notEqual(p.static_friction, p.dynamic_friction, 'rubber should distinguish the two');
});

test('appearance is keyed for the schema the body actually uses', () => {
  const a3 = bodyAppearanceForMaterial('steel', true);
  assert.equal(a3.color, MATERIAL_LIBRARY.steel.color);
  assert.ok('roughness' in a3 && 'metalness' in a3);

  // A 2D draft is SVG: it has stroke and fill, not color/roughness/metalness.
  const a2 = bodyAppearanceForMaterial('steel', false);
  assert.equal(a2.stroke, MATERIAL_LIBRARY.steel.color);
  assert.ok(a2.fill.startsWith(MATERIAL_LIBRARY.steel.color));
  assert.ok(!('color' in a2), '2D drafts have no `color` field');
});
