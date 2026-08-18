export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface SimulationConfig {
  dt: number;
  subSteps: number;
  fixedTimestep: boolean;
  maxDt: number;
  integrator: 'semi_implicit_euler' | 'rk4' | 'forward_euler';
  gravity: Vec3;
  enableCollision: boolean;
  enableConstraints: boolean;
  constraintIterations: number;
  baumgarteBeta: number;
  penetrationSlop: number;
  maxCorrection: number;
}

export interface BodyDef {
  id: string;
  position: Vec3;
  velocity: Vec3;
  angularVelocity: Vec3;
  orientation: Quat;
  mass: number;
  restitution: number;
  friction: number;
  isStatic: boolean;
  shapeType: 'sphere' | 'box' | 'plane';
  halfExtents: Vec3;
  radius: number;
  materialId: string;
}

export interface ConstraintDef {
  id: string;
  type: 'distance' | 'fixed' | 'hinge' | 'slider' | 'spring';
  bodyA: string;
  bodyB: string;
  anchorA: Vec3;
  anchorB: Vec3;
  axis: Vec3;
  distance: number;
  motorEnabled: boolean;
  targetVelocity: number;
  maxForce: number;
  minLimit: number;
  maxLimit: number;
}

export interface ContactInfo {
  bodyA: string;
  bodyB: string;
  point: Vec3;
  normal: Vec3;
  penetration: number;
  restitution: number;
  friction: number;
}

export interface BodyState {
  id: string;
  position: Vec3;
  orientation: Quat;
  linearVelocity: Vec3;
  angularVelocity: Vec3;
  force: Vec3;
  torque: Vec3;
  sleeping: boolean;
  onGround: boolean;
}

export interface FrameOutput {
  time: number;
  bodies: BodyState[];
  contacts: ContactInfo[];
  energy: number;
  kineticEnergy: number;
  potentialEnergy: number;
}

export interface SimulationState {
  time: number;
  stepCount: number;
  paused: boolean;
  systemState: Float32Array;
  warnings: string[];
}

export interface SimSnapshot {
  state: SimulationState;
  metadata: string;
  binaryBlob: Uint8Array;
}

export interface SimTelemetry {
  time: number;
  bodyCount: number;
  sleepingCount: number;
  constraintCount: number;
  activeManifolds: number;
  bodies: BodyTelemetry[];
  energy: { kinetic: number; potential: number; total: number };
  manifolds: ContactTelemetry[];
}

export interface BodyTelemetry {
  id: string;
  type: string;
  position: Vec3;
  velocity: Vec3;
  angularVelocity: Vec3;
  mass: number;
  materialId: string;
  restitution: number;
  friction: number;
  isStatic: boolean;
  sleeping: boolean;
  onGround: boolean;
  kineticEnergy: number;
  netForce: Vec3;
}

export interface ContactTelemetry {
  bodyAId: string;
  bodyBId: string;
  normal: Vec3;
  penetration: number;
  contacts: Vec3[];
}

export interface SimulationRequest {
  objects: SimObject[];
  constraints: SimConstraint[];
  timeStep: number;
  duration: number;
  gravity: Vec3;
  subSteps: number;
}

export interface SimObject {
  id: string;
  geometry: {
    type: 'sphere' | 'box' | 'cylinder';
    position: Vec3;
    rotation: Vec3;
    dimensions: Vec3;
  };
  physics: {
    mass: number;
    restitution: number;
    friction: number;
    isStatic: boolean;
    initialVelocity: Vec3;
    initialAngularVelocity: Vec3;
  };
}

export interface SimConstraint {
  id: string;
  type: string;
  targetA: string;
  targetB?: string;
  distance?: number;
  pivotA?: Vec3;
  pivotB?: Vec3;
  axis?: Vec3;
  motorEnabled?: boolean;
  targetVelocity?: number;
  maxForce?: number;
}

export interface SimulationFrame {
  time: number;
  states: ObjectState[];
  contacts: SimContact[];
}

export interface ObjectState {
  id: string;
  position: Vec3;
  rotation: Vec3;
  linearVelocity: Vec3;
  angularVelocity: Vec3;
}

export interface SimContact {
  idA: string;
  idB: string;
  point: { x: number; y: number; z: number };
}

export interface SimulationResponse {
  frames: SimulationFrame[];
  energyDrift: number;
}

export const DEFAULT_SIM_CONFIG: SimulationConfig = {
  dt: 0.016,
  subSteps: 4,
  fixedTimestep: true,
  maxDt: 0.1,
  integrator: 'semi_implicit_euler',
  gravity: { x: 0, y: -9.81, z: 0 },
  enableCollision: true,
  enableConstraints: true,
  constraintIterations: 20,
  baumgarteBeta: 0.2,
  penetrationSlop: 0.005,
  maxCorrection: 0.1,
};

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function quat(x: number, y: number, z: number, w: number): Quat {
  return { x, y, z, w };
}

export function identityQuat(): Quat {
  return { x: 0, y: 0, z: 0, w: 1 };
}

export function zeroVec3(): Vec3 {
  return { x: 0, y: 0, z: 0 };
}

export function addVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function mulVec3(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

export function dotVec3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function magVec3(a: Vec3): number {
  return Math.sqrt(dotVec3(a, a));
}

export function normVec3(a: Vec3): Vec3 {
  const m = magVec3(a);
  return m > 0 ? mulVec3(a, 1 / m) : { x: 0, y: 0, z: 0 };
}

export function crossVec3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}