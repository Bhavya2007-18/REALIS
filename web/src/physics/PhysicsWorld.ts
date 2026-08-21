// REALIS PhysicsWorld — Unified Physical Representation
// Canonical units: SI (m, kg, s, N, rad, J)

export const PHYSICS_DEFAULTS = {
  gravity: { x: 0, y: -9.81, z: 0 },
  fixedTimestep: 1 / 60,     // 16.67ms
  maxSubsteps: 10,
  maxFrameDt: 0.1,
  solverIterations: 20,
  contactIterations: 10,
  baumgarteBeta: 0.2,
  penetrationSlop: 0.005,
  maxCorrection: 0.1,
  sleepLinearThreshold: 0.01,
  sleepAngularThreshold: 0.01,
  sleepTime: 0.5,
  velocityClamp: 500,
  angularVelocityClamp: 100,
} as const;

export type Vec3 = { x: number; y: number; z: number };
export type Quat = { x: number; y: number; z: number; w: number };
export type Mat3 = number[][]; // 3x3 row-major

export interface PhysicsMaterial {
  id: string;
  name: string;
  density: number;           // kg/m³
  restitution: number;       // 0..1
  staticFriction: number;    // 0..1
  dynamicFriction: number;   // 0..1
}

export type BodyType = 'dynamic' | 'static' | 'kinematic';

export interface PhysicsGeometry {
  type: 'sphere' | 'box' | 'capsule' | 'cylinder' | 'plane' | 'convexHull';
  radius?: number;
  halfExtents?: Vec3;
  halfHeight?: number;
  capsuleRadius?: number;
  cylinderRadius?: number;
  cylinderHalfHeight?: number;
  normal?: Vec3;
  planeDistance?: number;
  vertices?: Vec3[];
  indices?: number[];
}

export interface PhysicsBody {
  id: string;
  name: string;
  position: Vec3;
  rotation: Quat;
  linearVelocity: Vec3;
  angularVelocity: Vec3;
  mass: number;
  invMass: number;
  inertiaTensor: Mat3;
  invInertiaTensor: Mat3;
  type: BodyType;
  materialId: string;
  restitution: number;
  friction: number;
  geometry: PhysicsGeometry;
  force: Vec3;
  torque: Vec3;
  sleeping: boolean;
  sleepTimer: number;
  userData?: unknown;
}

export interface PhysicsJoint {
  id: string;
  type: 'revolute' | 'prismatic' | 'fixed' | 'distance' | 'spring';
  bodyA: string;
  bodyB: string | null;
  anchorA: Vec3;
  axisA: Vec3;
  anchorB: Vec3;
  axisB: Vec3;
  lowerLimit?: number;
  upperLimit?: number;
  motorEnabled: boolean;
  motorTargetVelocity: number;
  motorMaxForce: number;
  stiffness?: number;
  damping?: number;
  restLength?: number;
}

export interface PhysicsConstraint {
  id: string;
  type: 'contact' | 'friction' | 'distance' | 'fixed';
  bodyA: string;
  bodyB: string;
  jacobian: {
    linearA: Vec3;
    angularA: Vec3;
    linearB: Vec3;
    angularB: Vec3;
  };
  effectiveMass: number;
  bias: number;
  lambda: number;
  minLambda: number;
  maxLambda: number;
  normal?: Vec3;
  penetration?: number;
  restitution?: number;
  friction?: number;
  tangent1?: Vec3;
  tangent2?: Vec3;
  accumulatedNormalImpulse?: number;
  accumulatedTangent1Impulse?: number;
  accumulatedTangent2Impulse?: number;
}

export interface PhysicsForceField {
  id: string;
  type: 'gravity' | 'constant' | 'point' | 'drag' | 'spring' | 'custom';
  gravity?: Vec3;
  force?: Vec3;
  pointPosition?: Vec3;
  pointMagnitude?: number;
  linearDrag?: number;
  quadraticDrag?: number;
  anchor?: Vec3;
  springConstant?: number;
  springDamping?: number;
  springRestLength?: number;
  customFn?: (body: PhysicsBody, dt: number) => Vec3;
}

export interface PhysicsEnvironment {
  gravity: Vec3;
  airDensity: number;
  airViscosity: number;
  groundPlane?: { normal: Vec3; distance: number };
}

export interface PhysicsSettings {
  fixedTimestep: number;
  maxSubsteps: number;
  maxFrameDt: number;
  solverIterations: number;
  contactIterations: number;
  baumgarteBeta: number;
  penetrationSlop: number;
  maxCorrection: number;
  sleepLinearThreshold: number;
  sleepAngularThreshold: number;
  sleepTime: number;
  velocityClamp: number;
  angularVelocityClamp: number;
  enableCCD: boolean;
  ccdSweptSphereRadius: number;
}

export interface PhysicsWorldState {
  time: number;
  stepCount: number;
  bodyCount: number;
  jointCount: number;
  contactCount: number;
  islandCount: number;
  energy: { kinetic: number; potential: number; total: number };
  linearMomentum: Vec3;
  angularMomentum: Vec3;
  warnings: string[];
}

export interface PhysicsBodyState {
  id: string;
  position: Vec3;
  rotation: Quat;
  linearVelocity: Vec3;
  angularVelocity: Vec3;
  force: Vec3;
  torque: Vec3;
  sleeping: boolean;
}

export interface PhysicsJointState {
  id: string;
  type: string;
  bodyA: string;
  bodyB: string | null;
  currentPosition: number;
  currentVelocity: number;
  motorForce: number;
  limitReached: boolean;
}

export interface PhysicsContactState {
  bodyA: string;
  bodyB: string;
  point: Vec3;
  normal: Vec3;
  penetration: number;
  normalImpulse: number;
  frictionImpulse1: number;
  frictionImpulse2: number;
}

export interface PhysicsDiagnostics {
  solverIterationsUsed: number;
  maxConstraintError: number;
  totalContacts: number;
  totalPenetration: number;
  energyError: number;
  momentumError: number;
  stepDurationMs: number;
  broadphasePairs: number;
  narrowphaseChecks: number;
  sleepingBodies: number;
  activeIslands: number;
}

export interface PhysicsEvents {
  bodyCreated: (body: PhysicsBody) => void;
  bodyRemoved: (bodyId: string) => void;
  jointCreated: (joint: PhysicsJoint) => void;
  jointRemoved: (jointId: string) => void;
  contactStarted: (contact: PhysicsContactState) => void;
  contactEnded: (bodyA: string, bodyB: string) => void;
  jointLimitReached: (jointId: string, limit: 'lower' | 'upper') => void;
  jointBroken: (jointId: string, reason: 'force' | 'distance') => void;
  simulationStarted: () => void;
  simulationPaused: () => void;
  simulationStopped: () => void;
  simulationReset: () => void;
  simulationCompleted: (endTime: number) => void;
  physicsError: (error: string, bodyId?: string) => void;
  nanDetected: (bodyId: string, property: string) => void;
}