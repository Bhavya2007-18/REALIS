import { Vec3 } from './simulation';

export interface Transform {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

export interface MaterialDef {
  id: string;
  name: string;
  density: number;
  restitution: number;
  staticFriction: number;
  dynamicFriction: number;
}

export interface LayerDef {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
}

export interface SceneObjectDef {
  id: string;
  name: string;
  type: string;
  transform: Transform;
  materialId?: string;
  layerId?: string;
  visible: boolean;
  physical: {
    mass: number;
    restitution: number;
    friction: number;
    isStatic: boolean;
  };
}

export interface ConstraintDef {
  id: string;
  type: 'distance' | 'fixed' | 'hinge' | 'slider' | 'spring';
  objectA: string;
  objectB?: string;
  parameters: Record<string, unknown>;
}

export interface ForceDef {
  id: string;
  type: string;
  targetObjectId: string;
  parameters: Record<string, unknown>;
}

export interface InitialConditionDef {
  position?: Vec3;
  velocity?: Vec3;
  rotation?: Vec3;
  angularVelocity?: Vec3;
}

export interface EnvironmentDef {
  gravity: Vec3;
  coordinateConvention: 'right-handed' | 'left-handed';
}

export interface SimulationSettingsDef {
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

export interface SceneMetadata {
  id: string;
  name: string;
  schemaVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalScene {
  metadata: SceneMetadata;
  objects: SceneObjectDef[];
  materials: MaterialDef[];
  constraints: ConstraintDef[];
  forces: ForceDef[];
  layers: LayerDef[];
  initialConditions: InitialConditionDef;
  environment: EnvironmentDef;
  simulationSettings: SimulationSettingsDef;
}

export function createDefaultScene(): CanonicalScene {
  const now = new Date().toISOString();
  const id = Math.random().toString(36).substring(2, 9);
  return {
    metadata: {
      id,
      name: 'Untitled Scene',
      schemaVersion: '1',
      createdAt: now,
      updatedAt: now
    },
    objects: [],
    materials: [
      { id: 'steel', name: 'Steel', density: 7850, restitution: 0.2, staticFriction: 0.4, dynamicFriction: 0.3 },
      { id: 'rubber', name: 'Rubber', density: 1100, restitution: 0.85, staticFriction: 0.9, dynamicFriction: 0.8 },
      { id: 'wood', name: 'Wood', density: 700, restitution: 0.4, staticFriction: 0.5, dynamicFriction: 0.4 },
      { id: 'ice', name: 'Ice', density: 917, restitution: 0.1, staticFriction: 0.05, dynamicFriction: 0.02 },
      { id: 'concrete', name: 'Concrete', density: 2400, restitution: 0.15, staticFriction: 0.7, dynamicFriction: 0.6 },
      { id: 'plastic', name: 'Plastic', density: 1000, restitution: 0.6, staticFriction: 0.3, dynamicFriction: 0.25 },
      { id: 'custom', name: 'Custom', density: 1000, restitution: 0.5, staticFriction: 0.3, dynamicFriction: 0.3 }
    ],
    constraints: [],
    forces: [],
    layers: [
      { id: 'default', name: 'Layer 0', color: '#3b82f6', visible: true, locked: false },
      { id: 'layer1', name: 'Layer 1', color: '#10b981', visible: true, locked: false },
      { id: 'layer2', name: 'Dimensions', color: '#f59e0b', visible: true, locked: false }
    ],
    initialConditions: {},
    environment: {
      gravity: { x: 0, y: -9.81, z: 0 },
      coordinateConvention: 'right-handed'
    },
    simulationSettings: {
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
      maxCorrection: 0.1
    }
  };
}