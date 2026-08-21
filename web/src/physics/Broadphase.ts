// REALIS PhysicsWorld — Broadphase (Spatial Hash)
import type { PhysicsBody, PhysicsConstraint } from './PhysicsWorld';
import { v3Dot, v3Cross, v3Add, v3Sub, v3Scale, v3Length, v3Negate, v3Normalize, m3FromQuat, m3MultiplyVec, AABB, aabbIntersects } from './MathUtils';
import type { BroadphasePair } from './MathUtils';
import { PHYSICS_DEFAULTS } from './PhysicsWorld';

export class SpatialHash {
  private cellSize: number;
  private cells: Map<string, Set<string>> = new Map();
  constructor(cellSize = 5) { this.cellSize = cellSize; }
  clear(): void { this.cells.clear(); }
  insert(body: PhysicsBody): void {
    const aabb = aabbFromBody(body);
    for (let cx = Math.floor(aabb.min.x / this.cellSize); cx <= Math.floor(aabb.max.x / this.cellSize); cx++) {
      for (let cy = Math.floor(aabb.min.y / this.cellSize); cy <= Math.floor(aabb.max.y / this.cellSize); cy++) {
        for (let cz = Math.floor(aabb.min.z / this.cellSize); cz <= Math.floor(aabb.max.z / this.cellSize); cz++) {
          const key = `${cx},${cy},${cz}`;
          if (!this.cells.has(key)) this.cells.set(key, new Set());
          this.cells.get(key)!.add(body.id);
        }
      }
    }
  }
  query(aabb: AABB): Set<string> {
    const result = new Set<string>();
    for (let cx = Math.floor(aabb.min.x / this.cellSize); cx <= Math.floor(aabb.max.x / this.cellSize); cx++) {
      for (let cy = Math.floor(aabb.min.y / this.cellSize); cy <= Math.floor(aabb.max.y / this.cellSize); cy++) {
        for (let cz = Math.floor(aabb.min.z / this.cellSize); cz <= Math.floor(aabb.max.z / this.cellSize); cz++) {
          const cell = this.cells.get(`${cx},${cy},${cz}`);
          if (cell) for (const id of cell) result.add(id);
        }
      }
    }
    return result;
  }
}

export function aabbFromBody(body: PhysicsBody): AABB {
  const pos = body.position;
  const geo = body.geometry;
  let r: { x: number; y: number; z: number };
  if (geo.type === 'sphere') {
    const rad = geo.radius || 0.5;
    r = { x: rad, y: rad, z: rad };
  } else if (geo.type === 'box') {
    const he = geo.halfExtents || { x: 0.5, y: 0.5, z: 0.5 };
    const R = m3FromQuat(body.rotation);
    r = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 3; i++) {
      const h = i === 0 ? he.x : i === 1 ? he.y : he.z;
      r.x += Math.abs(R[i][0]) * h;
      r.y += Math.abs(R[i][1]) * h;
      r.z += Math.abs(R[i][2]) * h;
    }
  } else {
    r = { x: 1, y: 1, z: 1 };
  }
  return { min: { x: pos.x - r.x, y: pos.y - r.y, z: pos.z - r.z }, max: { x: pos.x + r.x, y: pos.y + r.y, z: pos.z + r.z } };
}

export function broadphase(bodies: PhysicsBody[], spatialHash: SpatialHash): BroadphasePair[] {
  spatialHash.clear();
  for (const body of bodies) spatialHash.insert(body);
  const candidatePairs = new Set<string>();
  for (const body of bodies) {
    if (body.type === 'static') continue;
    const aabb = aabbFromBody(body);
    for (const otherId of spatialHash.query(aabb)) {
      if (otherId === body.id) continue;
      const other = bodies.find(b => b.id === otherId);
      if (!other || (body.type === 'static' && other.type === 'static')) continue;
      const pairKey = body.id < otherId ? `${body.id}:${otherId}` : `${otherId}:${body.id}`;
      candidatePairs.add(pairKey);
    }
  }
  const pairs: BroadphasePair[] = [];
  for (const pairKey of candidatePairs) {
    const [idA, idB] = pairKey.split(':');
    const bodyA = bodies.find(b => b.id === idA);
    const bodyB = bodies.find(b => b.id === idB);
    if (bodyA && bodyB && aabbIntersects(aabbFromBody(bodyA), aabbFromBody(bodyB))) {
      pairs.push({ bodyA: idA, bodyB: idB });
    }
  }
  return pairs;
}
