// REALIS PhysicsWorld — Body, Joint, and Force Field Management
import type { PhysicsBody, PhysicsJoint, PhysicsForceField, BodyType, PhysicsGeometry, PhysicsMaterial } from './PhysicsWorld';
import { v3, v3Zero, Vec3Zero, QuatIdentity, computeSphereInertia, computeBoxInertia, transformInertiaTensor, m3Identity } from './MathUtils';

let _bodyIdCounter = 0;
let _jointIdCounter = 0;
let _forceIdCounter = 0;

export class BodyManager {
  bodies: Map<string, PhysicsBody> = new Map();
  joints: Map<string, PhysicsJoint> = new Map();
  forceFields: Map<string, PhysicsForceField> = new Map();

  addBody(params: {
    name: string;
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number; w: number };
    mass: number;
    type: BodyType;
    geometry: PhysicsGeometry;
    materialId?: string;
    restitution?: number;
    friction?: number;
    inertiaTensor?: number[][];
    userData?: unknown;
  }): PhysicsBody {
    const id = `body_${_bodyIdCounter++}`;
    const geometry = params.geometry;
    let inertia = params.inertiaTensor ? params.inertiaTensor as number[][] : m3Identity();

    if (!params.inertiaTensor) {
      if (geometry.type === 'sphere' && geometry.radius) {
        inertia = computeSphereInertia(params.mass, geometry.radius);
      } else if (geometry.type === 'box' && geometry.halfExtents) {
        inertia = computeBoxInertia(params.mass, geometry.halfExtents.x, geometry.halfExtents.y, geometry.halfExtents.z);
      }
    }

    const body: PhysicsBody = {
      id,
      name: params.name,
      position: params.position ? { ...params.position } : { ...Vec3Zero },
      rotation: params.rotation ? { ...params.rotation } : { ...QuatIdentity },
      linearVelocity: { ...Vec3Zero },
      angularVelocity: { ...Vec3Zero },
      mass: params.mass,
      invMass: params.type === 'static' ? 0 : 1 / params.mass,
      inertiaTensor: inertia,
      invInertiaTensor: params.type === 'static' ? m3Identity() : (function computeInvInertia() {
        const det = inertia[0][0] * (inertia[1][1] * inertia[2][2] - inertia[1][2] * inertia[2][1])
                  - inertia[0][1] * (inertia[1][0] * inertia[2][2] - inertia[1][2] * inertia[2][0])
                  + inertia[0][2] * (inertia[1][0] * inertia[2][1] - inertia[1][1] * inertia[2][0]);
        if (Math.abs(det) < 1e-12) return m3Identity();
        const invDet = 1 / det;
        return [
          [(inertia[1][1] * inertia[2][2] - inertia[1][2] * inertia[2][1]) * invDet,
           (inertia[0][2] * inertia[2][1] - inertia[0][1] * inertia[2][2]) * invDet,
           (inertia[0][1] * inertia[1][2] - inertia[0][2] * inertia[1][1]) * invDet],
          [(inertia[1][2] * inertia[2][0] - inertia[1][0] * inertia[2][2]) * invDet,
           (inertia[0][0] * inertia[2][2] - inertia[0][2] * inertia[2][0]) * invDet,
           (inertia[0][2] * inertia[1][0] - inertia[0][0] * inertia[1][2]) * invDet],
          [(inertia[1][0] * inertia[2][1] - inertia[1][1] * inertia[2][0]) * invDet,
           (inertia[0][1] * inertia[2][0] - inertia[0][0] * inertia[2][1]) * invDet,
           (inertia[0][0] * inertia[1][1] - inertia[0][1] * inertia[1][0]) * invDet],
        ];
      })(),
      type: params.type,
      materialId: params.materialId || 'default',
      restitution: params.restitution ?? 0.5,
      friction: params.friction ?? 0.5,
      geometry,
      force: { ...Vec3Zero },
      torque: { ...Vec3Zero },
      sleeping: false,
      sleepTimer: 0,
      userData: params.userData,
    };

    this.bodies.set(id, body);
    return body;
  }

  removeBody(id: string): boolean {
    // Remove all joints connected to this body
    const jointsToRemove: string[] = [];
    for (const [jid, j] of this.joints) {
      if (j.bodyA === id || j.bodyB === id) jointsToRemove.push(jid);
    }
    jointsToRemove.forEach(jid => this.joints.delete(jid));
    return this.bodies.delete(id);
  }

  getBody(id: string): PhysicsBody | undefined {
    return this.bodies.get(id);
  }

  getAllBodies(): PhysicsBody[] {
    return Array.from(this.bodies.values());
  }

  addJoint(params: {
    type: PhysicsJoint['type'];
    bodyA: string;
    bodyB?: string | null;
    anchorA?: { x: number; y: number; z: number };
    axisA?: { x: number; y: number; z: number };
    anchorB?: { x: number; y: number; z: number };
    axisB?: { x: number; y: number; z: number };
    lowerLimit?: number;
    upperLimit?: number;
    motorEnabled?: boolean;
    motorTargetVelocity?: number;
    motorMaxForce?: number;
    stiffness?: number;
    damping?: number;
    restLength?: number;
  }): PhysicsJoint {
    const id = `joint_${_jointIdCounter++}`;
    const joint: PhysicsJoint = {
      id,
      type: params.type,
      bodyA: params.bodyA,
      bodyB: params.bodyB ?? null,
      anchorA: params.anchorA ? { ...params.anchorA } : { ...Vec3Zero },
      axisA: params.axisA ? { ...params.axisA } : { x: 0, y: 1, z: 0 },
      anchorB: params.anchorB ? { ...params.anchorB } : { ...Vec3Zero },
      axisB: params.axisB ? { ...params.axisB } : { x: 0, y: 1, z: 0 },
      lowerLimit: params.lowerLimit,
      upperLimit: params.upperLimit,
      motorEnabled: params.motorEnabled ?? false,
      motorTargetVelocity: params.motorTargetVelocity ?? 0,
      motorMaxForce: params.motorMaxForce ?? 100,
      stiffness: params.stiffness,
      damping: params.damping,
      restLength: params.restLength,
    };
    this.joints.set(id, joint);
    return joint;
  }

  removeJoint(id: string): boolean {
    return this.joints.delete(id);
  }

  getJoint(id: string): PhysicsJoint | undefined {
    return this.joints.get(id);
  }

  getAllJoints(): PhysicsJoint[] {
    return Array.from(this.joints.values());
  }

  addForceField(params: {
    type: PhysicsForceField['type'];
    gravity?: { x: number; y: number; z: number };
    force?: { x: number; y: number; z: number };
    pointPosition?: { x: number; y: number; z: number };
    pointMagnitude?: number;
    linearDrag?: number;
    quadraticDrag?: number;
    anchor?: { x: number; y: number; z: number };
    springConstant?: number;
    springDamping?: number;
    springRestLength?: number;
    customFn?: (body: PhysicsBody, dt: number) => { x: number; y: number; z: number };
  }): PhysicsForceField {
    const id = `force_${_forceIdCounter++}`;
    const ff: PhysicsForceField = {
      id,
      type: params.type,
      gravity: params.gravity,
      force: params.force,
      pointPosition: params.pointPosition,
      pointMagnitude: params.pointMagnitude,
      linearDrag: params.linearDrag,
      quadraticDrag: params.quadraticDrag,
      anchor: params.anchor,
      springConstant: params.springConstant,
      springDamping: params.springDamping,
      springRestLength: params.springRestLength,
      customFn: params.customFn,
    };
    this.forceFields.set(id, ff);
    return ff;
  }

  removeForceField(id: string): boolean {
    return this.forceFields.delete(id);
  }

  applyForceField(ff: PhysicsForceField, body: PhysicsBody, dt: number): void {
    if (body.type === 'static') return;

    let f = Vec3Zero;

    switch (ff.type) {
      case 'gravity':
        f = ff.gravity || { x: 0, y: -9.81, z: 0 };
        f = { x: f.x * body.mass, y: f.y * body.mass, z: f.z * body.mass };
        break;

      case 'constant':
        f = ff.force || Vec3Zero;
        break;

      case 'point': {
        const pos = ff.pointPosition || Vec3Zero;
        const mag = ff.pointMagnitude || 10;
        const dir = { x: pos.x - body.position.x, y: pos.y - body.position.y, z: pos.z - body.position.z };
        const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
        if (len > 0.001) {
          const invLen = 1 / len;
          const r2 = Math.max(len * len, 0.1);
          const strength = mag * body.mass / r2;
          f = { x: dir.x * invLen * strength, y: dir.y * invLen * strength, z: dir.z * invLen * strength };
        }
        break;
      }

      case 'drag': {
        const linDrag = ff.linearDrag ?? 0.5;
        const quadDrag = ff.quadraticDrag ?? 0;
        f = {
          x: -(linDrag + quadDrag * Math.abs(body.linearVelocity.x)) * body.linearVelocity.x,
          y: -(linDrag + quadDrag * Math.abs(body.linearVelocity.y)) * body.linearVelocity.y,
          z: -(linDrag + quadDrag * Math.abs(body.linearVelocity.z)) * body.linearVelocity.z,
        };
        break;
      }

      case 'spring': {
        const anchor = ff.anchor || Vec3Zero;
        const k = ff.springConstant ?? 50;
        const d = ff.springDamping ?? 5;
        const rest = ff.springRestLength ?? 1;
        const disp = { x: body.position.x - anchor.x, y: body.position.y - anchor.y, z: body.position.z - anchor.z };
        const dist = Math.sqrt(disp.x * disp.x + disp.y * disp.y + disp.z * disp.z);
        if (dist > 0.001) {
          const ext = dist - rest;
          const nx = disp.x / dist, ny = disp.y / dist, nz = disp.z / dist;
          const relVel = body.linearVelocity.x * nx + body.linearVelocity.y * ny + body.linearVelocity.z * nz;
          const forceMag = -k * ext - d * relVel;
          f = { x: nx * forceMag, y: ny * forceMag, z: nz * forceMag };
        }
        break;
      }

      case 'custom':
        if (ff.customFn) f = ff.customFn(body, dt);
        break;
    }

    body.force.x += f.x;
    body.force.y += f.y;
    body.force.z += f.z;
  }

  applyAllForceFields(body: PhysicsBody, dt: number): void {
    for (const ff of this.forceFields.values()) {
      this.applyForceField(ff, body, dt);
    }
  }

  clear(): void {
    this.bodies.clear();
    this.joints.clear();
    this.forceFields.clear();
    _bodyIdCounter = 0;
    _jointIdCounter = 0;
    _forceIdCounter = 0;
  }

  resetIdCounters(): void {
    _bodyIdCounter = 0;
    _jointIdCounter = 0;
    _forceIdCounter = 0;
  }
}
