// REALIS PhysicsWorld — Semi-Implicit Euler Integration + Sleeping + Energy
import type { PhysicsBody, PhysicsSettings, PhysicsWorldState } from './PhysicsWorld';
import { v3Add, v3Scale, v3Length, v3LengthSq, v3Cross, m3MultiplyVec, qNormalize, qMultiply, qFromAxisAngle } from './MathUtils';
import { Vec3Zero } from './MathUtils';

export function integrateVelocity(body: PhysicsBody, dt: number): void {
  if (body.type === 'static') return;
  // Semi-implicit Euler: velocity first, then position
  body.linearVelocity.x += body.force.x * body.invMass * dt;
  body.linearVelocity.y += body.force.y * body.invMass * dt;
  body.linearVelocity.z += body.force.z * body.invMass * dt;
  // Angular: torque * invInertia
  const angAccel = m3MultiplyVec(body.invInertiaTensor, body.torque);
  body.angularVelocity.x += angAccel.x * dt;
  body.angularVelocity.y += angAccel.y * dt;
  body.angularVelocity.z += angAccel.z * dt;
}

export function integratePosition(body: PhysicsBody, dt: number): void {
  if (body.type === 'static') return;
  // Position update
  body.position.x += body.linearVelocity.x * dt;
  body.position.y += body.linearVelocity.y * dt;
  body.position.z += body.linearVelocity.z * dt;
  // Quaternion update: q_dot = 0.5 * w * q
  const halfDt = 0.5 * dt;
  const qDot = {
    x: body.angularVelocity.x * halfDt,
    y: body.angularVelocity.y * halfDt,
    z: body.angularVelocity.z * halfDt,
    w: 0,
  };
  body.rotation = qNormalize(qMultiply(qDot, body.rotation));
}

export function clearForces(body: PhysicsBody): void {
  body.force = { ...Vec3Zero };
  body.torque = { ...Vec3Zero };
}

export function updateSleeping(body: PhysicsBody, settings: PhysicsSettings, dt: number): void {
  if (body.type === 'static') { body.sleeping = false; return; }
  const linSpeed = v3Length(body.linearVelocity);
  const angSpeed = v3Length(body.angularVelocity);
  if (linSpeed < settings.sleepLinearThreshold && angSpeed < settings.sleepAngularThreshold) {
    body.sleepTimer += dt;
    if (body.sleepTimer > settings.sleepTime) {
      body.sleeping = true;
      body.linearVelocity = { ...Vec3Zero };
      body.angularVelocity = { ...Vec3Zero };
    }
  } else {
    body.sleepTimer = 0;
    body.sleeping = false;
  }
}

export function computeEnergy(body: PhysicsBody, gravity: { x: number; y: number; z: number }): { kinetic: number; potential: number } {
  if (body.type === 'static') return { kinetic: 0, potential: 0 };
  const v2 = v3LengthSq(body.linearVelocity);
  const w2 = v3LengthSq(body.angularVelocity);
  // 1/2 * m * v^2 + 1/2 * w^T * I * w
  const Iw = m3MultiplyVec(body.inertiaTensor, body.angularVelocity);
  const ke = 0.5 * body.mass * v2 + 0.5 * (body.angularVelocity.x * Iw.x + body.angularVelocity.y * Iw.y + body.angularVelocity.z * Iw.z);
  // PE = m * g * h (h = -y for gravity pointing -y)
  const pe = body.mass * (-gravity.y) * body.position.y;
  return { kinetic: ke, potential: pe };
}

export function computeTotalEnergy(bodies: PhysicsBody[], gravity: { x: number; y: number; z: number }): { kinetic: number; potential: number; total: number } {
  let totalKE = 0, totalPE = 0;
  for (const body of bodies) {
    if (body.type === 'static') continue;
    const e = computeEnergy(body, gravity);
    totalKE += e.kinetic;
    totalPE += e.potential;
  }
  return { kinetic: totalKE, potential: totalPE, total: totalKE + totalPE };
}

export function computeWorldState(
  bodies: PhysicsBody[],
  time: number,
  stepCount: number,
  gravity: { x: number; y: number; z: number }
): PhysicsWorldState {
  let totalKinetic = 0, totalPotential = 0;
  let linearMomentum = { ...Vec3Zero };
  let angularMomentum = { ...Vec3Zero };
  let sleepingCount = 0;

  for (const body of bodies) {
    if (body.type !== 'static') {
      const e = computeEnergy(body, gravity);
      totalKinetic += e.kinetic;
      totalPotential += e.potential;
      linearMomentum.x += body.mass * body.linearVelocity.x;
      linearMomentum.y += body.mass * body.linearVelocity.y;
      linearMomentum.z += body.mass * body.linearVelocity.z;
      const L = v3Cross(
        { x: body.position.x * body.mass, y: body.position.y * body.mass, z: body.position.z * body.mass },
        body.linearVelocity
      );
      angularMomentum.x += L.x;
      angularMomentum.y += L.y;
      angularMomentum.z += L.z;
    }
    if (body.sleeping) sleepingCount++;
  }

  return {
    time,
    stepCount,
    bodyCount: bodies.length,
    jointCount: 0,
    contactCount: 0,
    islandCount: 0,
    energy: { kinetic: totalKinetic, potential: totalPotential, total: totalKinetic + totalPotential },
    linearMomentum,
    angularMomentum,
    warnings: [],
  };
}
