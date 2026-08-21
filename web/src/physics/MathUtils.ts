// REALIS Physics Math Utilities — SI Units
// All functions are pure, no side effects

export type Vec3 = { x: number; y: number; z: number };
export type Quat = { x: number; y: number; z: number; w: number };
export type Mat3 = number[][];

export const Vec3Zero: Vec3 = { x: 0, y: 0, z: 0 };
export const Vec3One: Vec3 = { x: 1, y: 1, z: 1 };
export const QuatIdentity: Quat = { x: 0, y: 0, z: 0, w: 1 };
export const Mat3Identity: Mat3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

// Vec3 operations
export function v3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function v3Add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function v3Sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function v3Scale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

export function v3Dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function v3Cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function v3Length(a: Vec3): number {
  return Math.sqrt(v3Dot(a, a));
}

export function v3LengthSq(a: Vec3): number {
  return v3Dot(a, a);
}

export function v3Normalize(a: Vec3): Vec3 {
  const len = v3Length(a);
  if (len < 1e-10) return Vec3Zero;
  return v3Scale(a, 1 / len);
}

export function v3Negate(a: Vec3): Vec3 {
  return { x: -a.x, y: -a.y, z: -a.z };
}

export function v3Lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export function v3Min(a: Vec3, b: Vec3): Vec3 {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), z: Math.min(a.z, b.z) };
}

export function v3Max(a: Vec3, b: Vec3): Vec3 {
  return { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y), z: Math.max(a.z, b.z) };
}

export function v3Clamp(v: Vec3, min: Vec3, max: Vec3): Vec3 {
  return {
    x: Math.max(min.x, Math.min(max.x, v.x)),
    y: Math.max(min.y, Math.min(max.y, v.y)),
    z: Math.max(min.z, Math.min(max.z, v.z)),
  };
}

export function v3IsFinite(v: Vec3): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
}

// Quat operations
export function qIdentity(): Quat {
  return { x: 0, y: 0, z: 0, w: 1 };
}

export function qNormalize(q: Quat): Quat {
  const len = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
  if (len < 1e-10) return QuatIdentity;
  return { x: q.x / len, y: q.y / len, z: q.z / len, w: q.w / len };
}

export function qMultiply(a: Quat, b: Quat): Quat {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

export function qConjugate(q: Quat): Quat {
  return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
}

export function qRotateVector(q: Quat, v: Vec3): Vec3 {
  // q * v * q^-1 where v is pure quaternion
  const qv = { x: v.x, y: v.y, z: v.z, w: 0 };
  const qvq = qMultiply(qMultiply(q, qv), qConjugate(q));
  return { x: qvq.x, y: qvq.y, z: qvq.z };
}

export function qFromAxisAngle(axis: Vec3, angle: number): Quat {
  const half = angle * 0.5;
  const s = Math.sin(half);
  const axisNorm = v3Normalize(axis);
  return { x: axisNorm.x * s, y: axisNorm.y * s, z: axisNorm.z * s, w: Math.cos(half) };
}

export function qToAxisAngle(q: Quat): { axis: Vec3; angle: number } {
  const qn = qNormalize(q);
  const angle = 2 * Math.acos(Math.max(-1, Math.min(1, qn.w)));
  const s = Math.sqrt(1 - qn.w * qn.w);
  if (s < 1e-6) return { axis: { x: 1, y: 0, z: 0 }, angle: 0 };
  return { axis: { x: qn.x / s, y: qn.y / s, z: qn.z / s }, angle };
}

export function qSlerp(a: Quat, b: Quat, t: number): Quat {
  let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  let bCopy = { ...b };
  if (dot < 0) {
    dot = -dot;
    bCopy = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
  }
  if (dot > 0.9995) {
    return qNormalize({
      x: a.x + t * (bCopy.x - a.x),
      y: a.y + t * (bCopy.y - a.y),
      z: a.z + t * (bCopy.z - a.z),
      w: a.w + t * (bCopy.w - a.w),
    });
  }
  const theta = Math.acos(Math.max(-1, Math.min(1, dot)));
  const sinTheta = Math.sin(theta);
  const scaleA = Math.sin((1 - t) * theta) / sinTheta;
  const scaleB = Math.sin(t * theta) / sinTheta;
  return qNormalize({
    x: a.x * scaleA + bCopy.x * scaleB,
    y: a.y * scaleA + bCopy.y * scaleB,
    z: a.z * scaleA + bCopy.z * scaleB,
    w: a.w * scaleA + bCopy.w * scaleB,
  });
}

// Mat3 operations (3x3 row-major)
export function m3Identity(): Mat3 {
  return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
}

export function m3Multiply(a: Mat3, b: Mat3): Mat3 {
  const r: Mat3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) {
        sum += a[i][k] * b[k][j];
      }
      r[i][j] = sum;
    }
  }
  return r;
}

export function m3MultiplyVec(m: Mat3, v: Vec3): Vec3 {
  return {
    x: m[0][0] * v.x + m[0][1] * v.y + m[0][2] * v.z,
    y: m[1][0] * v.x + m[1][1] * v.y + m[1][2] * v.z,
    z: m[2][0] * v.x + m[2][1] * v.y + m[2][2] * v.z,
  };
}

export function m3Transpose(m: Mat3): Mat3 {
  return [
    [m[0][0], m[1][0], m[2][0]],
    [m[0][1], m[1][1], m[2][1]],
    [m[0][2], m[1][2], m[2][2]],
  ];
}

export function m3Inverse(m: Mat3): Mat3 {
  // 3x3 matrix inverse using cofactor method
  const a = m[0][0], b = m[0][1], c = m[0][2];
  const d = m[1][0], e = m[1][1], f = m[1][2];
  const g = m[2][0], h = m[2][1], i = m[2][2];
  
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) return Mat3Identity;
  
  const invDet = 1 / det;
  
  return [
    [(e * i - f * h) * invDet, (c * h - b * i) * invDet, (b * f - c * e) * invDet],
    [(f * g - d * i) * invDet, (a * i - c * g) * invDet, (c * d - a * f) * invDet],
    [(d * h - e * g) * invDet, (b * g - a * h) * invDet, (a * e - b * d) * invDet],
  ];
}

export function m3FromQuat(q: Quat): Mat3 {
  const x = q.x, y = q.y, z = q.z, w = q.w;
  const xx = x * x, yy = y * y, zz = z * z;
  const xy = x * y, xz = x * z, yz = y * z;
  const wx = w * x, wy = w * y, wz = w * z;
  
  return [
    [1 - 2 * (yy + zz), 2 * (xy - wz), 2 * (xz + wy)],
    [2 * (xy + wz), 1 - 2 * (xx + zz), 2 * (yz - wx)],
    [2 * (xz - wy), 2 * (yz + wx), 1 - 2 * (xx + yy)],
  ];
}

export function m3Scale(m: Mat3, s: number): Mat3 {
  return m.map(row => row.map(v => v * s));
}

export function m3Add(a: Mat3, b: Mat3): Mat3 {
  return a.map((row, i) => row.map((v, j) => v + b[i][j]));
}

export function m3Sub(a: Mat3, b: Mat3): Mat3 {
  return a.map((row, i) => row.map((v, j) => v - b[i][j]));
}

// Inertia tensor helpers
export function computeSphereInertia(mass: number, radius: number): Mat3 {
  const i = (2 / 5) * mass * radius * radius;
  return [[i, 0, 0], [0, i, 0], [0, 0, i]];
}

export function computeBoxInertia(mass: number, hx: number, hy: number, hz: number): Mat3 {
  const ix = (1 / 3) * mass * (hy * hy + hz * hz);
  const iy = (1 / 3) * mass * (hx * hx + hz * hz);
  const iz = (1 / 3) * mass * (hx * hx + hy * hy);
  return [[ix, 0, 0], [0, iy, 0], [0, 0, iz]];
}

export function computeCapsuleInertia(mass: number, radius: number, halfHeight: number): Mat3 {
  // Approximation: cylinder + hemispheres
  const h = halfHeight * 2;
  const iz = (1 / 2) * mass * radius * radius;
  const ix = (1 / 12) * mass * (3 * radius * radius + h * h) + mass * (h / 2 + radius * 0.6) ** 2 * 0.5;
  return [[ix, 0, 0], [0, ix, 0], [0, 0, iz]];
}

export function computeCylinderInertia(mass: number, radius: number, halfHeight: number): Mat3 {
  const iz = (1 / 2) * mass * radius * radius;
  const ix = (1 / 12) * mass * (3 * radius * radius + 4 * halfHeight * halfHeight);
  return [[ix, 0, 0], [0, ix, 0], [0, 0, iz]];
}

export function transformInertiaTensor(localInertia: Mat3, rotation: Quat): Mat3 {
  const R = m3FromQuat(rotation);
  const RT = m3Transpose(R);
  return m3Multiply(m3Multiply(R, localInertia), RT);
}

// AABB
export interface AABB {
  min: Vec3;
  max: Vec3;
}

export function aabbFromBody(body: any): AABB {
  const pos = body.position;
  const geo = body.geometry;
  let min: Vec3, max: Vec3;
  
  if (geo.type === 'sphere') {
    const r = geo.radius || 0.5;
    min = { x: pos.x - r, y: pos.y - r, z: pos.z - r };
    max = { x: pos.x + r, y: pos.y + r, z: pos.z + r };
  } else if (geo.type === 'box') {
    const he = geo.halfExtents || { x: 0.5, y: 0.5, z: 0.5 };
    const R = m3FromQuat(body.rotation);
    const axes = [
      { x: R[0][0], y: R[1][0], z: R[2][0] },
      { x: R[0][1], y: R[1][1], z: R[2][1] },
      { x: R[0][2], y: R[1][2], z: R[2][2] },
    ];
    let r = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 3; i++) {
      r.x += Math.abs(axes[i].x) * (i === 0 ? he.x : i === 1 ? he.y : he.z);
      r.y += Math.abs(axes[i].y) * (i === 0 ? he.x : i === 1 ? he.y : he.z);
      r.z += Math.abs(axes[i].z) * (i === 0 ? he.x : i === 1 ? he.y : he.z);
    }
    min = { x: pos.x - r.x, y: pos.y - r.y, z: pos.z - r.z };
    max = { x: pos.x + r.x, y: pos.y + r.y, z: pos.z + r.z };
  } else {
    // Conservative
    const r = 1;
    min = { x: pos.x - r, y: pos.y - r, z: pos.z - r };
    max = { x: pos.x + r, y: pos.y + r, z: pos.z + r };
  }
  
  return { min, max };
}

export function aabbIntersects(a: AABB, b: AABB): boolean {
  return a.min.x <= b.max.x && a.max.x >= b.min.x &&
         a.min.y <= b.max.y && a.max.y >= b.min.y &&
         a.min.z <= b.max.z && a.max.z >= b.min.z;
}

export function aabbUnion(a: AABB, b: AABB): AABB {
  return {
    min: v3Min(a.min, b.min),
    max: v3Max(a.max, b.max),
  };
}

// Broadphase pair
export interface BroadphasePair {
  bodyA: string;
  bodyB: string;
}