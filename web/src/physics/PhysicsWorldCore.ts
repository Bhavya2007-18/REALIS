import type { PhysicsBody, PhysicsJoint, PhysicsForceField, PhysicsConstraint, PhysicsSettings, PhysicsWorldState, PhysicsEvents } from './PhysicsWorld';
import { PHYSICS_DEFAULTS } from './PhysicsWorld';
import { BodyManager } from './BodyManager';
import { SpatialHash, broadphase } from './Broadphase';
import { narrowphase, generateContactConstraints, type ContactPoint } from './Narrowphase';
import { solveContactConstraints, solveJointConstraints, clampVelocities } from './ConstraintSolver';
import { integrateVelocity, integratePosition, clearForces, updateSleeping, computeWorldState, computeEnergy, computeTotalEnergy } from './Integration';
import { Vec3Zero } from './MathUtils';

export class PhysicsWorld {
  private settings: PhysicsSettings;
  private bodyManager: BodyManager;
  private spatialHash: SpatialHash;
  private contactConstraints: PhysicsConstraint[] = [];
  private pendingContacts: ContactPoint[] = [];
  private time = 0;
  private stepCount = 0;
  private running = false;
  private events: Partial<PhysicsEvents> = {};
  private previousEnergy = 0;
  private nanRecoveryCount = 0;

  constructor(settings?: Partial<PhysicsSettings>) {
    this.settings = { ...PHYSICS_DEFAULTS, ...settings, enableCCD: settings?.enableCCD ?? false, ccdSweptSphereRadius: settings?.ccdSweptSphereRadius ?? 0.5 };
    this.bodyManager = new BodyManager();
    this.spatialHash = new SpatialHash(5);
  }

  addBody(params: Parameters<BodyManager['addBody']>[0]): PhysicsBody {
    const body = this.bodyManager.addBody(params);
    this.events.bodyCreated?.(body);
    return body;
  }

  removeBody(id: string): boolean {
    const removed = this.bodyManager.removeBody(id);
    if (removed) this.events.bodyRemoved?.(id);
    return removed;
  }

  getBody(id: string): PhysicsBody | undefined { return this.bodyManager.getBody(id); }
  getAllBodies(): PhysicsBody[] { return this.bodyManager.getAllBodies(); }

  addJoint(params: Parameters<BodyManager['addJoint']>[0]): PhysicsJoint {
    const joint = this.bodyManager.addJoint(params);
    this.events.jointCreated?.(joint);
    return joint;
  }

  removeJoint(id: string): boolean {
    const removed = this.bodyManager.removeJoint(id);
    if (removed) this.events.jointRemoved?.(id);
    return removed;
  }

  getAllJoints(): PhysicsJoint[] { return this.bodyManager.getAllJoints(); }

  addForceField(params: Parameters<BodyManager['addForceField']>[0]): PhysicsForceField {
    return this.bodyManager.addForceField(params);
  }

  removeForceField(id: string): boolean { return this.bodyManager.removeForceField(id); }

  on<K extends keyof PhysicsEvents>(event: K, handler: PhysicsEvents[K]): void {
    (this.events as any)[event] = handler;
  }

  getSettings(): PhysicsSettings { return { ...this.settings }; }
  setSettings(s: Partial<PhysicsSettings>): void { Object.assign(this.settings, s); }
  getTime(): number { return this.time; }
  getStepCount(): number { return this.stepCount; }
  isRunning(): boolean { return this.running; }

  start(): void { this.running = true; this.events.simulationStarted?.(); }
  pause(): void { this.running = false; this.events.simulationPaused?.(); }
  stop(): void { this.running = false; this.events.simulationStopped?.(); }

  reset(): void {
    this.bodyManager.clear();
    this.contactConstraints = [];
    this.pendingContacts = [];
    this.time = 0;
    this.stepCount = 0;
    this.running = false;
    this.previousEnergy = 0;
    this.nanRecoveryCount = 0;
    this.events.simulationReset?.();
  }

  step(dt: number): void {
    if (!this.running) return;
    const fixedDt = this.settings.fixedTimestep;
    const maxSubsteps = this.settings.maxSubsteps;
    let remaining = Math.min(dt, this.settings.maxFrameDt);
    let substeps = 0;
    while (remaining > fixedDt * 0.5 && substeps < maxSubsteps) {
      const subDt = Math.min(fixedDt, remaining);
      this.substep(subDt);
      remaining -= subDt;
      substeps++;
    }
  }

  private substep(dt: number): void {
    const bodies = this.bodyManager.getAllBodies();
    const joints = this.bodyManager.getAllJoints();

    for (const body of bodies) {
      if (body.sleeping) {
        const hasForce = body.force.x !== 0 || body.force.y !== 0 || body.force.z !== 0;
        const hasActiveJoint = joints.some(j => (j.bodyA === body.id || j.bodyB === body.id) && j.motorEnabled);
        if (hasForce || hasActiveJoint) { body.sleeping = false; body.sleepTimer = 0; }
      }
    }

    for (const body of bodies) {
      if (!body.sleeping && body.type !== 'static') {
        this.bodyManager.applyAllForceFields(body, dt);
      }
    }

    for (const body of bodies) { if (!body.sleeping) integrateVelocity(body, dt); }

    this.contactConstraints = [];
    this.pendingContacts = [];
    const pairs = broadphase(bodies, this.spatialHash);
    for (const pair of pairs) {
      const bodyA = this.bodyManager.getBody(pair.bodyA);
      const bodyB = this.bodyManager.getBody(pair.bodyB);
      if (!bodyA || !bodyB) continue;
      // Wake sleeping bodies if they collide with a moving body
      if (bodyA.sleeping && !bodyB.sleeping) { bodyA.sleeping = false; bodyA.sleepTimer = 0; }
      if (bodyB.sleeping && !bodyA.sleeping) { bodyB.sleeping = false; bodyB.sleepTimer = 0; }
      if (bodyA.sleeping && bodyB.sleeping) continue;
      const contact = narrowphase(bodyA, bodyB);
      if (contact) this.pendingContacts.push(contact);
    }

    this.contactConstraints = generateContactConstraints(this.pendingContacts, this.bodyManager.bodies, this.settings);
    solveContactConstraints(this.contactConstraints, this.bodyManager.bodies, this.settings.solverIterations, dt);
    solveJointConstraints(joints, this.bodyManager.bodies, dt);
    clampVelocities(bodies, this.settings.velocityClamp, this.settings.angularVelocityClamp);

    for (const body of bodies) { if (!body.sleeping) integratePosition(body, dt); }
    for (const body of bodies) clearForces(body);
    for (const body of bodies) updateSleeping(body, this.settings, dt);

    for (const body of bodies) {
      if (!isFinite(body.position.x) || !isFinite(body.position.y) || !isFinite(body.position.z) ||
          !isFinite(body.linearVelocity.x) || !isFinite(body.linearVelocity.y) || !isFinite(body.linearVelocity.z)) {
        this.events.nanDetected?.(body.id, 'position');
        this.events.physicsError?.(`NaN in body ${body.id}`, body.id);
        // NaN recovery: reset body to origin with zero velocity
        body.position = { ...Vec3Zero };
        body.linearVelocity = { ...Vec3Zero };
        body.angularVelocity = { ...Vec3Zero };
        body.sleeping = true;
        body.sleepTimer = 0;
        this.nanRecoveryCount++;
      }
    }

    // Energy drift detection (warn if >5% drift in non-dissipative systems)
    const currentEnergy = computeTotalEnergy(bodies, this.settings.gravity);
    if (this.previousEnergy > 0 && currentEnergy.total > 0) {
      const drift = Math.abs(currentEnergy.total - this.previousEnergy) / this.previousEnergy;
      if (drift > 0.05) {
        this.events.physicsError?.(`Energy drift: ${(drift * 100).toFixed(1)}% at t=${this.time.toFixed(3)}s`);
      }
    }
    this.previousEnergy = currentEnergy.total;

    this.time += dt;
    this.stepCount++;
  }

  getState(): PhysicsWorldState {
    return computeWorldState(this.bodyManager.getAllBodies(), this.time, this.stepCount, this.settings.gravity);
  }

  getBodyState(id: string) {
    const body = this.bodyManager.getBody(id);
    if (!body) return null;
    return {
      id: body.id, position: { ...body.position }, rotation: { ...body.rotation },
      linearVelocity: { ...body.linearVelocity }, angularVelocity: { ...body.angularVelocity },
      force: { ...body.force }, torque: { ...body.torque }, sleeping: body.sleeping,
    };
  }

  getAllBodyStates() {
    return this.bodyManager.getAllBodies().map(b => ({
      id: b.id, position: { ...b.position }, rotation: { ...b.rotation },
      linearVelocity: { ...b.linearVelocity }, angularVelocity: { ...b.angularVelocity },
      sleeping: b.sleeping,
    }));
  }

  getContacts(): ContactPoint[] { return [...this.pendingContacts]; }

  getDiagnostics() {
    const bodies = this.bodyManager.getAllBodies();
    const sleepingBodies = bodies.filter(b => b.sleeping).length;
    const activeBodies = bodies.filter(b => b.type !== 'static' && !b.sleeping).length;
    return {
      bodyCount: bodies.length,
      jointCount: this.bodyManager.getAllJoints().length,
      sleepingBodies,
      activeBodies,
      contactCount: this.pendingContacts.length,
      constraintCount: this.contactConstraints.length,
      nanRecoveries: this.nanRecoveryCount,
      time: this.time,
      stepCount: this.stepCount,
    };
  }
}
