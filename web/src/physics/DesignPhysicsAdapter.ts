import type { PhysicsWorld } from './PhysicsWorldCore';
import type { PhysicsBody, PhysicsJoint, PhysicsForceField, PhysicsGeometry } from './PhysicsWorld';

export interface DesignObject {
  id: string;
  name: string;
  shape?: string;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number; w: number };
  scale?: { x: number; y: number; z: number };
  mass?: number;
  isStatic?: boolean;
  materialId?: string;
  restitution?: number;
  friction?: number;
  geometry?: any;
}

export interface DesignConstraint {
  id: string;
  type: string;
  bodyA: string;
  bodyB?: string | null;
  anchorA?: { x: number; y: number; z: number };
  axisA?: { x: number; y: number; z: number };
  anchorB?: { x: number; y: number; z: number };
  axisB?: { x: number; y: number; z: number };
  stiffness?: number;
  damping?: number;
  restLength?: number;
  lowerLimit?: number;
  upperLimit?: number;
  motorEnabled?: boolean;
  motorTargetVelocity?: number;
  motorMaxForce?: number;
}

export interface DesignScene {
  objects: DesignObject[];
  constraints?: DesignConstraint[];
  forceFields?: any[];
  gravity?: { x: number; y: number; z: number };
}

export function buildPhysicsWorldFromDesign(world: PhysicsWorld, scene: DesignScene): void {
  world.reset();
  if (scene.gravity) {
    world.setSettings({ gravity: scene.gravity });
  }

  for (const obj of scene.objects) {
    const mass = obj.mass ?? 1;
    const isStatic = obj.isStatic ?? false;
    const geo = convertDesignGeometry(obj);
    world.addBody({
      name: obj.name || obj.id,
      position: obj.position ?? { x: 0, y: 0, z: 0 },
      rotation: obj.rotation,
      mass: isStatic ? 1 : mass,
      type: isStatic ? 'static' : 'dynamic',
      geometry: geo,
      materialId: obj.materialId,
      restitution: obj.restitution,
      friction: obj.friction,
      userData: { designId: obj.id },
    });
  }

  if (scene.constraints) {
    for (const constraint of scene.constraints) {
      const bodyAEntry = world.getAllBodies().find(b => b.userData && (b.userData as any).designId === constraint.bodyA);
      if (!bodyAEntry) continue;
      const bodyBEntry = constraint.bodyB
        ? world.getAllBodies().find(b => b.userData && (b.userData as any).designId === constraint.bodyB)
        : null;
      world.addJoint({
        type: constraint.type as any,
        bodyA: bodyAEntry.id,
        bodyB: bodyBEntry?.id ?? null,
        anchorA: constraint.anchorA,
        axisA: constraint.axisA,
        anchorB: constraint.anchorB,
        axisB: constraint.axisB,
        stiffness: constraint.stiffness,
        damping: constraint.damping,
        restLength: constraint.restLength,
        lowerLimit: constraint.lowerLimit,
        upperLimit: constraint.upperLimit,
        motorEnabled: constraint.motorEnabled,
        motorTargetVelocity: constraint.motorTargetVelocity,
        motorMaxForce: constraint.motorMaxForce,
      });
    }
  }

  if (scene.forceFields) {
    for (const ff of scene.forceFields) {
      world.addForceField(ff);
    }
  }
}

function convertDesignGeometry(obj: DesignObject): PhysicsGeometry {
  const shape = obj.shape || 'box';
  const s = obj.scale ?? { x: 1, y: 1, z: 1 };
  switch (shape) {
    case 'sphere':
      return { type: 'sphere', radius: s.x * 0.5 };
    case 'box':
      return { type: 'box', halfExtents: { x: s.x * 0.5, y: s.y * 0.5, z: s.z * 0.5 } };
    case 'capsule':
      return { type: 'capsule', capsuleRadius: s.x * 0.3, halfHeight: s.y * 0.5 };
    case 'cylinder':
      return { type: 'cylinder', cylinderRadius: s.x * 0.5, cylinderHalfHeight: s.y * 0.5 };
    case 'plane':
      return { type: 'plane', normal: { x: 0, y: 1, z: 0 }, planeDistance: 0 };
    default:
      return { type: 'box', halfExtents: { x: s.x * 0.5, y: s.y * 0.5, z: s.z * 0.5 } };
  }
}

export function syncDesignFromPhysics(world: PhysicsWorld, scene: DesignScene): DesignScene {
  const updatedObjects = scene.objects.map(obj => {
    const physBody = world.getAllBodies().find(b => b.userData && (b.userData as any).designId === obj.id);
    if (!physBody) return obj;
    return {
      ...obj,
      position: { ...physBody.position },
      rotation: { ...physBody.rotation },
    };
  });
  return { ...scene, objects: updatedObjects };
}
