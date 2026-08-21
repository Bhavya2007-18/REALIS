// REALIS PhysicsWorld — Narrowphase (Sphere-Sphere, Sphere-Box, Box-Box SAT)
import type { PhysicsBody, PhysicsConstraint } from './PhysicsWorld';
import { v3Add, v3Sub, v3Scale, v3Dot, v3Cross, v3Length, v3Negate, v3Normalize, m3FromQuat, m3MultiplyVec } from './MathUtils';
import { PHYSICS_DEFAULTS } from './PhysicsWorld';

export interface ContactPoint {
  bodyAId: string; bodyBId: string;
  point: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  penetration: number;
}

export function narrowphase(bodyA: PhysicsBody, bodyB: PhysicsBody): ContactPoint | null {
  const { type: tA } = bodyA.geometry;
  const { type: tB } = bodyB.geometry;
  if (tA === 'sphere' && tB === 'sphere') return sphereSphere(bodyA, bodyB);
  if (tA === 'sphere' && tB === 'box') return sphereBox(bodyA, bodyB);
  if (tA === 'box' && tB === 'sphere') { const c = sphereBox(bodyB, bodyA); if (c) { c.normal = v3Negate(c.normal); c.bodyAId = bodyA.id; c.bodyBId = bodyB.id; } return c; }
  if (tA === 'box' && tB === 'box') return boxBox(bodyA, bodyB);
  if (tA === 'sphere' && tB === 'capsule') return sphereCapsule(bodyA, bodyB);
  if (tA === 'capsule' && tB === 'sphere') { const c = sphereCapsule(bodyB, bodyA); if (c) { c.normal = v3Negate(c.normal); c.bodyAId = bodyA.id; c.bodyBId = bodyB.id; } return c; }
  return null;
}

function sphereSphere(a: PhysicsBody, b: PhysicsBody): ContactPoint | null {
  const rA = a.geometry.radius || 0.5, rB = b.geometry.radius || 0.5;
  const d = v3Sub(b.position, a.position);
  const distSq = v3Dot(d, d), totalR = rA + rB;
  if (distSq > totalR * totalR) return null;
  const dist = Math.sqrt(distSq);
  const normal = dist < 1e-6 ? { x: 0, y: 1, z: 0 } : v3Scale(d, 1 / dist);
  return { bodyAId: a.id, bodyBId: b.id, point: v3Add(a.position, v3Scale(normal, rA - 0.001)), normal, penetration: totalR - dist };
}

function sphereBox(sphere: PhysicsBody, box: PhysicsBody): ContactPoint | null {
  const R = m3FromQuat(box.rotation);
  const he = box.geometry.halfExtents || { x: 0.5, y: 0.5, z: 0.5 };
  const localCenter = v3Sub(sphere.position, box.position);
  const invR = [[R[0][0], R[1][0], R[2][0]], [R[0][1], R[1][1], R[2][1]], [R[0][2], R[1][2], R[2][2]]];
  const ls = m3MultiplyVec(invR, localCenter);
  const closest = { x: Math.max(-he.x, Math.min(he.x, ls.x)), y: Math.max(-he.y, Math.min(he.y, ls.y)), z: Math.max(-he.z, Math.min(he.z, ls.z)) };
  const diff = v3Sub(ls, closest);
  const distSq = v3Dot(diff, diff);
  const radius = sphere.geometry.radius || 0.5;
  if (distSq > radius * radius) return null;
  const dist = Math.sqrt(distSq);
  let localNormal: { x: number; y: number; z: number };
  if (dist < 1e-6) {
    const distances = [he.x - ls.x, he.x + ls.x, he.y - ls.y, he.y + ls.y, he.z - ls.z, he.z + ls.z];
    const normals = [{ x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }];
    let minDist = Infinity, minNorm = normals[0];
    for (let i = 0; i < 6; i++) { if (distances[i] < minDist) { minDist = distances[i]; minNorm = normals[i]; } }
    localNormal = minNorm;
  } else { localNormal = v3Scale(diff, 1 / dist); }
  const worldNormal = m3MultiplyVec(R, localNormal);
  return { bodyAId: sphere.id, bodyBId: box.id, point: v3Sub(sphere.position, v3Scale(worldNormal, radius - 0.001)), normal: worldNormal, penetration: radius - dist };
}

function boxBox(a: PhysicsBody, b: PhysicsBody): ContactPoint | null {
  const RA = m3FromQuat(a.rotation), RB = m3FromQuat(b.rotation);
  const heA = a.geometry.halfExtents || { x: 0.5, y: 0.5, z: 0.5 };
  const heB = b.geometry.halfExtents || { x: 0.5, y: 0.5, z: 0.5 };
  const axes: { x: number; y: number; z: number }[] = [
    { x: RA[0][0], y: RA[1][0], z: RA[2][0] }, { x: RA[0][1], y: RA[1][1], z: RA[2][1] }, { x: RA[0][2], y: RA[1][2], z: RA[2][2] },
    { x: RB[0][0], y: RB[1][0], z: RB[2][0] }, { x: RB[0][1], y: RB[1][1], z: RB[2][1] }, { x: RB[0][2], y: RB[1][2], z: RB[2][2] },
  ];
  for (let i = 0; i < 3; i++) for (let j = 3; j < 6; j++) axes.push(v3Cross(axes[i], axes[j]));
  const d = v3Sub(b.position, a.position);
  let minOverlap = Infinity, bestAxis = axes[0];
  for (const axis of axes) {
    const len = v3Length(axis);
    if (len < 1e-6) continue;
    const n = v3Scale(axis, 1 / len);
    const projA = heA.x * Math.abs(v3Dot({ x: RA[0][0], y: RA[1][0], z: RA[2][0] }, n)) + heA.y * Math.abs(v3Dot({ x: RA[0][1], y: RA[1][1], z: RA[2][1] }, n)) + heA.z * Math.abs(v3Dot({ x: RA[0][2], y: RA[1][2], z: RA[2][2] }, n));
    const projB = heB.x * Math.abs(v3Dot({ x: RB[0][0], y: RB[1][0], z: RB[2][0] }, n)) + heB.y * Math.abs(v3Dot({ x: RB[0][1], y: RB[1][1], z: RB[2][1] }, n)) + heB.z * Math.abs(v3Dot({ x: RB[0][2], y: RB[1][2], z: RB[2][2] }, n));
    const overlap = projA + projB - Math.abs(v3Dot(d, n));
    if (overlap < 0) return null;
    if (overlap < minOverlap) { minOverlap = overlap; bestAxis = n; }
  }
  if (v3Dot(bestAxis, d) < 0) bestAxis = v3Negate(bestAxis);
  return { bodyAId: a.id, bodyBId: b.id, point: v3Add(a.position, v3Scale(b.position, 0.5)), normal: bestAxis, penetration: minOverlap };
}

function sphereCapsule(sphere: PhysicsBody, capsule: PhysicsBody): ContactPoint | null {
  const capR = capsule.geometry.capsuleRadius || capsule.geometry.radius || 0.3;
  const halfH = capsule.geometry.halfHeight || 0.5;
  const R = m3FromQuat(capsule.rotation);
  const worldTop = v3Add(capsule.position, m3MultiplyVec(R, { x: 0, y: halfH, z: 0 }));
  const worldBot = v3Add(capsule.position, m3MultiplyVec(R, { x: 0, y: -halfH, z: 0 }));
  const AB = v3Sub(worldTop, worldBot), AS = v3Sub(sphere.position, worldBot);
  const t = Math.max(0, Math.min(1, v3Dot(AS, AB) / v3Dot(AB, AB)));
  const closest = v3Add(worldBot, v3Scale(AB, t));
  const d = v3Sub(sphere.position, closest);
  const distSq = v3Dot(d, d);
  const totalR = (sphere.geometry.radius || 0.5) + capR;
  if (distSq > totalR * totalR) return null;
  const dist = Math.sqrt(distSq);
  const normal = dist < 1e-6 ? v3Normalize(AB) : v3Scale(d, 1 / dist);
  return { bodyAId: sphere.id, bodyBId: capsule.id, point: v3Sub(sphere.position, v3Scale(normal, sphere.geometry.radius || 0.5)), normal, penetration: totalR - dist };
}

export function generateContactConstraints(
  contacts: ContactPoint[], bodies: Map<string, PhysicsBody>, settings: typeof PHYSICS_DEFAULTS
): PhysicsConstraint[] {
  const constraints: PhysicsConstraint[] = [];
  for (const contact of contacts) {
    const bodyA = bodies.get(contact.bodyAId), bodyB = bodies.get(contact.bodyBId);
    if (!bodyA || !bodyB) continue;
    const rA = v3Sub(contact.point, bodyA.position), rB = v3Sub(contact.point, bodyB.position);
    const Knn = bodyA.invMass + bodyB.invMass
      + v3Dot(v3Cross(m3MultiplyVec(bodyA.invInertiaTensor, v3Cross(rA, contact.normal)), rA), contact.normal)
      + v3Dot(v3Cross(m3MultiplyVec(bodyB.invInertiaTensor, v3Cross(rB, contact.normal)), rB), contact.normal);
    const bias = -settings.baumgarteBeta / (1 / 60) * Math.max(0, contact.penetration - settings.penetrationSlop);
    constraints.push({
      id: `cn_${contact.bodyAId}_${contact.bodyBId}`, type: 'contact', bodyA: contact.bodyAId, bodyB: contact.bodyBId,
      jacobian: { linearA: v3Negate(contact.normal), angularA: v3Negate(v3Cross(rA, contact.normal)), linearB: contact.normal, angularB: v3Cross(rB, contact.normal) },
      effectiveMass: 1 / Math.max(Knn, 1e-12), bias, lambda: 0, minLambda: -Infinity, maxLambda: Infinity,
      normal: contact.normal, penetration: contact.penetration,
      restitution: Math.min(bodyA.restitution, bodyB.restitution),
      friction: Math.sqrt(bodyA.friction * bodyB.friction),
    });
    const relVel = v3Sub(bodyB.linearVelocity, bodyA.linearVelocity);
    const tangentVel = v3Sub(relVel, v3Scale(contact.normal, v3Dot(relVel, contact.normal)));
    const tangentLen = v3Length(tangentVel);
    if (tangentLen > 1e-6) {
      const tangent = v3Scale(tangentVel, 1 / tangentLen);
      const tangent2 = v3Cross(contact.normal, tangent);
      for (const t of [tangent, tangent2]) {
        const rAt = v3Cross(rA, t), rBt = v3Cross(rB, t);
        const Ktt = bodyA.invMass + bodyB.invMass + v3Dot(m3MultiplyVec(bodyA.invInertiaTensor, rAt), rAt) + v3Dot(m3MultiplyVec(bodyB.invInertiaTensor, rBt), rBt);
        if (Math.abs(Ktt) > 1e-12) {
          constraints.push({
            id: `cf_${contact.bodyAId}_${contact.bodyBId}_${t === tangent ? 't1' : 't2'}`, type: 'friction',
            bodyA: contact.bodyAId, bodyB: contact.bodyBId,
            jacobian: { linearA: v3Negate(t), angularA: v3Negate(rAt), linearB: t, angularB: rBt },
            effectiveMass: 1 / Ktt, bias: 0, lambda: 0,
            minLambda: 0, maxLambda: 0, // accumulatedNormalImpulse will be set by solver
            friction: Math.sqrt(bodyA.friction * bodyB.friction),
          });
        }
      }
    }
  }
  return constraints;
}
