// REALIS PhysicsWorld — Constraint Solver (PGS + Sequential Impulse)
import type { PhysicsBody, PhysicsConstraint, PhysicsJoint } from './PhysicsWorld';
import { v3Add, v3Sub, v3Scale, v3Dot, v3Cross, v3Negate, v3Normalize, v3Length, m3MultiplyVec, qNormalize, qMultiply, qFromAxisAngle } from './MathUtils';

export function solveContactConstraints(
  constraints: PhysicsConstraint[],
  bodies: Map<string, PhysicsBody>,
  iterations: number,
  dt: number
): void {
  const contactConstraints = constraints.filter(c => c.type === 'contact');
  const frictionConstraints = constraints.filter(c => c.type === 'friction');

  for (let iter = 0; iter < iterations; iter++) {
    // Solve normal constraints
    for (const c of contactConstraints) {
      const bodyA = bodies.get(c.bodyA);
      const bodyB = bodies.get(c.bodyB);
      if (!bodyA || !bodyB) continue;
      if (bodyA.type === 'static' && bodyB.type === 'static') continue;

      const vA = bodyA.linearVelocity;
      const wA = bodyA.angularVelocity;
      const vB = bodyB.linearVelocity;
      const wB = bodyB.angularVelocity;

      // Jacobian velocity
      const jv = v3Dot(c.jacobian.linearA, vA) + v3Dot(c.jacobian.angularA, wA)
               + v3Dot(c.jacobian.linearB, vB) + v3Dot(c.jacobian.angularB, wB);

      // Accumulated impulse clamping
      const oldLambda = c.lambda;
      c.lambda = Math.min(c.maxLambda, Math.max(c.minLambda, c.lambda - (jv + c.bias) * c.effectiveMass));
      const deltaLambda = c.lambda - oldLambda;

      // Apply impulse
      if (bodyA.type !== 'static') {
        bodyA.linearVelocity.x += c.jacobian.linearA.x * deltaLambda * bodyA.invMass;
        bodyA.linearVelocity.y += c.jacobian.linearA.y * deltaLambda * bodyA.invMass;
        bodyA.linearVelocity.z += c.jacobian.linearA.z * deltaLambda * bodyA.invMass;
        bodyA.angularVelocity.x += c.jacobian.angularA.x * deltaLambda; // already in invI space
        bodyA.angularVelocity.y += c.jacobian.angularA.y * deltaLambda;
        bodyA.angularVelocity.z += c.jacobian.angularA.z * deltaLambda;
      }
      if (bodyB.type !== 'static') {
        bodyB.linearVelocity.x += c.jacobian.linearB.x * deltaLambda * bodyB.invMass;
        bodyB.linearVelocity.y += c.jacobian.linearB.y * deltaLambda * bodyB.invMass;
        bodyB.linearVelocity.z += c.jacobian.linearB.z * deltaLambda * bodyB.invMass;
        bodyB.angularVelocity.x += c.jacobian.angularB.x * deltaLambda;
        bodyB.angularVelocity.y += c.jacobian.angularB.y * deltaLambda;
        bodyB.angularVelocity.z += c.jacobian.angularB.z * deltaLambda;
      }
    }

    // Solve friction constraints (clamped by normal impulse)
    for (const fc of frictionConstraints) {
      const bodyA = bodies.get(fc.bodyA);
      const bodyB = bodies.get(fc.bodyB);
      if (!bodyA || !bodyB) continue;
      if (bodyA.type === 'static' && bodyB.type === 'static') continue;

      // Find corresponding normal constraint to get accumulated normal impulse
      const normalConstraint = contactConstraints.find(
        nc => (nc.bodyA === fc.bodyA && nc.bodyB === fc.bodyB) ||
              (nc.bodyA === fc.bodyB && nc.bodyB === fc.bodyA)
      );
      if (!normalConstraint) continue;

      const maxFriction = Math.abs(normalConstraint.lambda) * (fc.friction || 0.5);

      const jv = v3Dot(fc.jacobian.linearA, bodyA.linearVelocity) + v3Dot(fc.jacobian.angularA, bodyA.angularVelocity)
               + v3Dot(fc.jacobian.linearB, bodyB.linearVelocity) + v3Dot(fc.jacobian.angularB, bodyB.angularVelocity);

      const oldLambda = fc.lambda;
      fc.lambda = Math.max(-maxFriction, Math.min(maxFriction, fc.lambda - jv * fc.effectiveMass));
      const deltaLambda = fc.lambda - oldLambda;

      if (bodyA.type !== 'static') {
        bodyA.linearVelocity.x += fc.jacobian.linearA.x * deltaLambda * bodyA.invMass;
        bodyA.linearVelocity.y += fc.jacobian.linearA.y * deltaLambda * bodyA.invMass;
        bodyA.linearVelocity.z += fc.jacobian.linearA.z * deltaLambda * bodyA.invMass;
        bodyA.angularVelocity.x += fc.jacobian.angularA.x * deltaLambda;
        bodyA.angularVelocity.y += fc.jacobian.angularA.y * deltaLambda;
        bodyA.angularVelocity.z += fc.jacobian.angularA.z * deltaLambda;
      }
      if (bodyB.type !== 'static') {
        bodyB.linearVelocity.x += fc.jacobian.linearB.x * deltaLambda * bodyB.invMass;
        bodyB.linearVelocity.y += fc.jacobian.linearB.y * deltaLambda * bodyB.invMass;
        bodyB.linearVelocity.z += fc.jacobian.linearB.z * deltaLambda * bodyB.invMass;
        bodyB.angularVelocity.x += fc.jacobian.angularB.x * deltaLambda;
        bodyB.angularVelocity.y += fc.jacobian.angularB.y * deltaLambda;
        bodyB.angularVelocity.z += fc.jacobian.angularB.z * deltaLambda;
      }
    }
  }
}

export function solveJointConstraints(
  joints: PhysicsJoint[],
  bodies: Map<string, PhysicsBody>,
  dt: number
): void {
  for (const joint of joints) {
    const bodyA = bodies.get(joint.bodyA);
    const bodyB = joint.bodyB ? bodies.get(joint.bodyB) : null;
    if (!bodyA) continue;
    if (bodyB && bodyA.type === 'static' && bodyB.type === 'static') continue;

    switch (joint.type) {
      case 'fixed': solveFixedJoint(joint, bodyA, bodyB, dt); break;
      case 'revolute': solveRevoluteJoint(joint, bodyA, bodyB, dt); break;
      case 'prismatic': solvePrismaticJoint(joint, bodyA, bodyB, dt); break;
      case 'distance': solveDistanceJoint(joint, bodyA, bodyB, dt); break;
      case 'spring': solveSpringJoint(joint, bodyA, bodyB, dt); break;
    }
  }
}

function solveFixedJoint(joint: PhysicsJoint, bodyA: PhysicsBody, bodyB: PhysicsBody | null, dt: number): void {
  if (!bodyB) return;
  const rA = joint.anchorA, rB = joint.anchorB;
  const worldA = v3Add(bodyA.position, rA);
  const worldB = v3Add(bodyB.position, rB);
  const posError = v3Sub(worldA, worldB);
  const stiffness = 500, damping = 20;
  const correction = v3Scale(posError, stiffness * dt);
  const force = v3Add(correction, v3Scale(v3Sub(bodyA.linearVelocity, bodyB.linearVelocity), -damping));
  if (bodyA.type !== 'static') { bodyA.linearVelocity.x += force.x * bodyA.invMass * dt; bodyA.linearVelocity.y += force.y * bodyA.invMass * dt; bodyA.linearVelocity.z += force.z * bodyA.invMass * dt; }
  if (bodyB.type !== 'static') { bodyB.linearVelocity.x -= force.x * bodyB.invMass * dt; bodyB.linearVelocity.y -= force.y * bodyB.invMass * dt; bodyB.linearVelocity.z -= force.z * bodyB.invMass * dt; }
  // Orientation correction
  const qDiff = { x: joint.axisA.x - joint.axisB.x, y: joint.axisA.y - joint.axisB.y, z: joint.axisA.z - joint.axisB.z, w: 1 - (joint.axisA.w || 0) - (joint.axisB.w || 0) };
  const angCorr = { x: qDiff.x * stiffness * dt, y: qDiff.y * stiffness * dt, z: qDiff.z * stiffness * dt };
  if (bodyA.type !== 'static') { bodyA.angularVelocity.x += angCorr.x; bodyA.angularVelocity.y += angCorr.y; bodyA.angularVelocity.z += angCorr.z; }
  if (bodyB.type !== 'static') { bodyB.angularVelocity.x -= angCorr.x; bodyB.angularVelocity.y -= angCorr.y; bodyB.angularVelocity.z -= angCorr.z; }
}

function solveRevoluteJoint(joint: PhysicsJoint, bodyA: PhysicsBody, bodyB: PhysicsBody | null, dt: number): void {
  if (!bodyB) {
    // Anchor to world — constraint bodyA around axis
    const axis = v3Normalize(joint.axisA);
    const angVel = bodyA.angularVelocity;
    const angComponent = v3Dot(angVel, axis);
    const stiffness = 100, damping = 10;
    const correction = -(angComponent * stiffness + damping * angComponent) * dt;
    if (bodyA.type !== 'static') {
      bodyA.angularVelocity.x += axis.x * correction * bodyA.invMass;
      bodyA.angularVelocity.y += axis.y * correction * bodyA.invMass;
      bodyA.angularVelocity.z += axis.z * correction * bodyA.invMass;
    }
    if (joint.motorEnabled) {
      const motorDelta = joint.motorTargetVelocity - angComponent;
      const motorImpulse = Math.max(-joint.motorMaxForce * dt, Math.min(joint.motorMaxForce * dt, motorDelta * 10 * dt));
      bodyA.angularVelocity.x += axis.x * motorImpulse;
      bodyA.angularVelocity.y += axis.y * motorImpulse;
      bodyA.angularVelocity.z += axis.z * motorImpulse;
    }
    return;
  }
  // Relative rotation constraint
  const stiffness = 100, damping = 10;
  const relAngVel = v3Sub(bodyA.angularVelocity, bodyB.angularVelocity);
  const correction = v3Scale(relAngVel, -damping * dt);
  if (bodyA.type !== 'static') { bodyA.angularVelocity.x += correction.x; bodyA.angularVelocity.y += correction.y; bodyA.angularVelocity.z += correction.z; }
  if (bodyB.type !== 'static') { bodyB.angularVelocity.x -= correction.x; bodyB.angularVelocity.y -= correction.y; bodyB.angularVelocity.z -= correction.z; }
}

function solvePrismaticJoint(joint: PhysicsJoint, bodyA: PhysicsBody, bodyB: PhysicsBody | null, dt: number): void {
  if (!bodyB) return;
  const axis = v3Normalize(joint.axisA);
  const rA = joint.anchorA, rB = joint.anchorB;
  const worldA = v3Add(bodyA.position, rA);
  const worldB = v3Add(bodyB.position, rB);
  const d = v3Sub(worldA, worldB);
  const proj = v3Dot(d, axis);
  const stiffness = 100, damping = 10;
  const force = v3Scale(axis, -(proj * stiffness + damping * v3Dot(v3Sub(bodyA.linearVelocity, bodyB.linearVelocity), axis)) * dt);
  if (bodyA.type !== 'static') { bodyA.linearVelocity.x += force.x * bodyA.invMass; bodyA.linearVelocity.y += force.y * bodyA.invMass; bodyA.linearVelocity.z += force.z * bodyA.invMass; }
  if (bodyB.type !== 'static') { bodyB.linearVelocity.x -= force.x * bodyB.invMass; bodyB.linearVelocity.y -= force.y * bodyB.invMass; bodyB.linearVelocity.z -= force.z * bodyB.invMass; }
}

function solveDistanceJoint(joint: PhysicsJoint, bodyA: PhysicsBody, bodyB: PhysicsBody | null, dt: number): void {
  if (!bodyB) return;
  const d = v3Sub(bodyB.position, bodyA.position);
  const dist = v3Length(d);
  const rest = joint.restLength ?? 1;
  if (dist < 1e-6) return;
  const nx = d.x / dist, ny = d.y / dist, nz = d.z / dist;
  const ext = dist - rest;
  const stiffness = joint.stiffness ?? 50, damping = joint.damping ?? 5;
  const relVel = v3Dot(v3Sub(bodyB.linearVelocity, bodyA.linearVelocity), { x: nx, y: ny, z: nz });
  const forceMag = -(ext * stiffness + relVel * damping);
  const f = { x: nx * forceMag, y: ny * forceMag, z: nz * forceMag };
  if (bodyA.type !== 'static') { bodyA.linearVelocity.x += f.x * bodyA.invMass * dt; bodyA.linearVelocity.y += f.y * bodyA.invMass * dt; bodyA.linearVelocity.z += f.z * bodyA.invMass * dt; }
  if (bodyB.type !== 'static') { bodyB.linearVelocity.x -= f.x * bodyB.invMass * dt; bodyB.linearVelocity.y -= f.y * bodyB.invMass * dt; bodyB.linearVelocity.z -= f.z * bodyB.invMass * dt; }
}

function solveSpringJoint(joint: PhysicsJoint, bodyA: PhysicsBody, bodyB: PhysicsBody | null, dt: number): void {
  if (!bodyB) return;
  const anchor = joint.anchorA;
  const target = v3Add(bodyB.position, joint.anchorB);
  const d = v3Sub(bodyA.position, target);
  const dist = v3Length(d);
  if (dist < 1e-6) return;
  const rest = joint.restLength ?? 0;
  const nx = d.x / dist, ny = d.y / dist, nz = d.z / dist;
  const ext = dist - rest;
  const stiffness = joint.stiffness ?? 50, damping = joint.damping ?? 5;
  const relVel = v3Dot(v3Sub(bodyA.linearVelocity, bodyB.linearVelocity), { x: nx, y: ny, z: nz });
  const forceMag = -(ext * stiffness + relVel * damping);
  const f = { x: nx * forceMag, y: ny * forceMag, z: nz * forceMag };
  if (bodyA.type !== 'static') { bodyA.linearVelocity.x += f.x * bodyA.invMass * dt; bodyA.linearVelocity.y += f.y * bodyA.invMass * dt; bodyA.linearVelocity.z += f.z * bodyA.invMass * dt; }
  if (bodyB.type !== 'static') { bodyB.linearVelocity.x -= f.x * bodyB.invMass * dt; bodyB.linearVelocity.y -= f.y * bodyB.invMass * dt; bodyB.linearVelocity.z -= f.z * bodyB.invMass * dt; }
}

// Velocity clamping to prevent explosion
export function clampVelocities(bodies: PhysicsBody[], maxLin: number, maxAng: number): void {
  for (const body of bodies) {
    if (body.type === 'static') continue;
    const lin = v3Length(body.linearVelocity);
    if (lin > maxLin) {
      const s = maxLin / lin;
      body.linearVelocity.x *= s;
      body.linearVelocity.y *= s;
      body.linearVelocity.z *= s;
    }
    const ang = v3Length(body.angularVelocity);
    if (ang > maxAng) {
      const s = maxAng / ang;
      body.angularVelocity.x *= s;
      body.angularVelocity.y *= s;
      body.angularVelocity.z *= s;
    }
  }
}
