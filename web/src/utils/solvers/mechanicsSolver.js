// ═══════════════════════════════════════════════════════════════════════════════
// REALIS MechanicsSolver — Stage 1 (Foundation)
// Multi-joint PBD constraint solver, sleeping bodies, AI read path,
// unified contact manifolds, live mid-sim parameter editing
// ═══════════════════════════════════════════════════════════════════════════════

import {
    applyForces,
    integrate,
    detectCollisions,
    resolveCollisions,
    calculateEnergy,
    buildForceVectors,
    updateSleepingState,
    wakeBody,
    ForceRegistry,
    GravityForceGenerator,
    LinearDampingGenerator,
    GroundFrictionGenerator,
    MouseSpringGenerator,
    PointGravityGenerator
} from '../physicsEngine.js';
import { applyWaterForces } from '../waterPhysics.js';
import useStore from '../../store/useStore.js';
import { normalizeDraftToSimObject } from '../draftEntityAdapter.js';

export default class MechanicsSolver {
    constructor(settings = {}) {
        this.settings = {
            gravity: settings.gravity ?? { x: 0, y: 9.81 },
            airResistance: settings.airResistance ?? 0.01,
            frictionCoeff: settings.frictionCoeff ?? 0.3,
            timeStep: settings.timeStep ?? 0.016,
            subSteps: settings.subSteps ?? 1,
            mode: settings.mode ?? 'preview',
            groundY: settings.groundY ?? 600,
            timeScale: settings.timeScale ?? 1.0
        };
        this.bodies = [];
        this.constraints = [];
        this.time = 0;
        this._lastManifolds = []; // stored for AI/debug queries

        // Modular force registry
        this.forceRegistry = new ForceRegistry();
        this._gravityGen = new GravityForceGenerator(this.settings.gravity);
        this._dampingGen = new LinearDampingGenerator(this.settings.airResistance);
        this._frictionGen = new GroundFrictionGenerator(this.settings.frictionCoeff);
        this.mouseSpring = new MouseSpringGenerator();
        this.forceRegistry.add(this._gravityGen);
        this.forceRegistry.add(this._dampingGen);
        this.forceRegistry.add(this._frictionGen);
        this.forceRegistry.add(this.mouseSpring);
    }

    setBodies(rawBodies) {
        this.bodies = rawBodies.map(b => {
            // 2D drafting entity normalization
            if (b.type && ['rect', 'circle', 'polygon', 'arc', 'path', 'pencil'].includes(b.type) && (!b.position || !b.dimensions)) {
                const simObj = normalizeDraftToSimObject(b);
                if (simObj) {
                    return {
                        ...b,
                        position: { ...simObj.position },
                        _initialPosition: { ...simObj.position },
                        velocity: b.velocity ? { ...b.velocity } : { x: 0, y: 0, z: 0 },
                        acceleration: b.acceleration ? { ...b.acceleration } : { x: 0, y: 0, z: 0 },
                        mass: simObj.physics.mass,
                        restitution: simObj.physics.restitution,
                        friction: simObj.physics.friction,
                        isStatic: simObj.physics.isStatic,
                        radius: simObj.radius,
                        halfExtents: simObj.halfExtents,
                        dimensions: simObj.dimensions,
                        sleeping: false,
                        _sleepTimer: 0,
                        motionType: simObj.physics.isStatic ? 'static' : 'dynamic'
                    };
                }
            }

            let pos = { x: 0, y: 0, z: 0 };
            if (b.position) {
                if (Array.isArray(b.position)) {
                    pos = { x: b.position[0] || 0, y: b.position[1] || 0, z: b.position[2] || 0 };
                } else {
                    pos = { x: b.position.x || 0, y: b.position.y || 0, z: b.position.z || 0 };
                }
            } else {
                pos = { x: b.cx ?? b.x ?? 0, y: b.cy ?? b.y ?? 0, z: 0 };
            }

            const dimX = b.params?.width ?? b.dimensions?.x ?? b.width ?? (b.r ? b.r * 2 : (b.radius ? b.radius * 2 : 10));
            const dimY = b.params?.height ?? b.dimensions?.y ?? b.height ?? (b.r ? b.r * 2 : (b.radius ? b.radius * 2 : 10));
            const dimZ = b.params?.depth ?? b.dimensions?.z ?? b.depth ?? (b.r ? b.r * 2 : (b.radius ? b.radius * 2 : 10));
            const halfExtents = b.halfExtents || { x: (dimX || 10) / 2, y: (dimY || 10) / 2, z: (dimZ || 10) / 2 };
            const approxRadius = b.radius ?? b.r ?? Math.sqrt(halfExtents.x ** 2 + halfExtents.y ** 2 + halfExtents.z ** 2);

            // Resolve material properties if material_id is present
            const storeMaterials = useStore.getState().materials;
            let matProps = {};
            if (b.material_id && storeMaterials?.[b.material_id]) {
                const mat = storeMaterials[b.material_id];
                matProps = { restitution: mat.restitution, friction: mat.dynamic_friction ?? mat.friction ?? 0.3 };
            }

            return {
                ...b,
                position: pos,
                _initialPosition: { ...pos },
                _initialVelocity: b.initialVelocity ? { ...b.initialVelocity } : null,
                velocity: b.initialVelocity ? { ...b.initialVelocity } : (b.velocity ?? { x: 0, y: 0, z: 0 }),
                acceleration: b.acceleration ?? { x: 0, y: 0, z: 0 },
                angularVelocity: b.angularVelocity ?? { x: 0, y: 0, z: 0 },
                mass: b.mass ?? 1,
                restitution: matProps.restitution ?? b.restitution ?? 0.5,
                friction: matProps.friction ?? b.friction ?? 0.3,
                isStatic: b.isStatic ?? false,
                radius: approxRadius,
                halfExtents,
                sleeping: false,
                _sleepTimer: 0,
                motionType: b.isStatic ? 'static' : (b.motionType ?? 'dynamic')
            };
        });
    }

    setConstraints(constraints) {
        this.constraints = constraints || [];
    }

    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        // Sync force generators with updated settings
        this._gravityGen.gravity = this.settings.gravity;
        this._dampingGen.coefficient = this.settings.airResistance;
        this._frictionGen.coefficient = this.settings.frictionCoeff;
    }

    // ── Live mid-sim body update (no solver reset) ───────────────────────────
    updateLiveBody(id, partialProps) {
        const body = this.bodies.find(b => b.id === id);
        if (!body) return;
        Object.assign(body, partialProps);
        if (body.sleeping) wakeBody(body);
    }

    syncBodies(rawBodies) {
        rawBodies.forEach(rb => {
            const existing = this.bodies.find(b => b.id === rb.id);
            if (existing) {
                // Update mutable physics properties without resetting position/velocity
                if (rb.mass !== undefined) existing.mass = rb.mass;
                if (rb.restitution !== undefined) existing.restitution = rb.restitution;
                if (rb.friction !== undefined) existing.friction = rb.friction;
                if (rb.isStatic !== undefined) existing.isStatic = rb.isStatic;
            }
        });
    }

    // ── Main Physics Step ────────────────────────────────────────────────────
    step() {
        const subSteps = this.settings.mode === 'accurate' ?
            Math.max(4, this.settings.subSteps ?? 1) :
            (this.settings.subSteps ?? 1);
        const dt = this.settings.timeStep / subSteps;

        for (let s = 0; s < subSteps; s++) {
            // Apply forces via legacy path (backward compat)
            applyForces(this.bodies, this.settings);

            // Apply mouse spring if active
            if (this.mouseSpring.active) {
                this.mouseSpring.applyForce(this.bodies);
            }

            // Water forces
            if (this.settings.water?.enabled && useStore.getState().water.enabled) {
                applyWaterForces(this.bodies, this.settings.water, this.settings.gravity);
            }

            // Point gravity (for orbital mechanics)
            if (this.settings.pointGravity) {
                const pg = this.settings.pointGravity;
                const gen = new PointGravityGenerator(pg.center, pg.strength);
                gen.applyForce(this.bodies);
            }

            // Constraint resolution (multi-joint PBD)
            this._resolveConstraints(5);

            // Collision detection & resolution (unified manifolds)
            if (this.settings.mode === 'accurate') {
                const manifolds = detectCollisions(this.bodies);
                this._lastManifolds = manifolds;
                resolveCollisions(manifolds);
            }

            // Integration (Symplectic Euler with clamping)
            integrate(this.bodies, dt);

            // Ground plane
            this._applyGroundPlane(this.settings.groundY ?? 600);

            // Sleeping state update
            updateSleepingState(this.bodies, dt);
        }

        this.time += this.settings.timeStep;
        return this.getSnapshot();
    }

    // ── Multi-Joint Constraint Solver (PBD) ──────────────────────────────────
    _resolveConstraints(iterations = 5) {
        for (let i = 0; i < iterations; i++) {
            this.constraints.forEach(c => {
                const b1 = this.bodies.find(b => b.id === c.targetA);
                const b2 = c.targetB ? this.bodies.find(b => b.id === c.targetB) : null;
                if (!b1) return;

                switch (c.type) {
                    case 'distance':
                    case 'stick':
                    case 'con_rod':
                        this._solveDistanceConstraint(b1, b2, c);
                        break;
                    case 'revolute':
                    case 'hinge':
                    case 'pin':
                        this._solveRevoluteConstraint(b1, b2, c);
                        break;
                    case 'prismatic':
                    case 'slider':
                        this._solvePrismaticConstraint(b1, b2, c);
                        break;
                    case 'spring':
                    case 'spring_damper':
                        this._solveSpringConstraint(b1, b2, c);
                        break;
                    default:
                        // Fallback: treat unknown as distance
                        if (c.distance !== undefined) {
                            this._solveDistanceConstraint(b1, b2, c);
                        }
                        break;
                }
            });
        }
    }

    // Distance / Rod: ||pA - pB|| = L0
    _solveDistanceConstraint(b1, b2, c) {
        const p1 = b1.position;
        const p2 = b2?.position ?? c.anchorB ?? { x: p1.x, y: p1.y + (c.distance ?? 100) };
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDist = c.distance ?? 100;
        const diff = (dist - targetDist) / dist;
        const m1 = b1.isStatic ? 0 : 1 / (b1.mass || 1);
        const m2 = !b2 || b2.isStatic ? 0 : 1 / (b2.mass || 1);
        const invSum = m1 + m2;
        if (invSum === 0) return;
        if (!b1.isStatic) {
            b1.position.x -= dx * (m1 / invSum) * diff;
            b1.position.y -= dy * (m1 / invSum) * diff;
            if (b1.sleeping) wakeBody(b1);
        }
        if (b2 && !b2.isStatic) {
            b2.position.x += dx * (m2 / invSum) * diff;
            b2.position.y += dy * (m2 / invSum) * diff;
            if (b2.sleeping) wakeBody(b2);
        }
    }

    // Revolute / Hinge: Lock anchor positions
    _solveRevoluteConstraint(b1, b2, c) {
        if (!b2) return;
        const anchorA = c.anchorA ?? c.pivotA ?? { x: 0, y: 0 };
        const anchorB = c.anchorB ?? c.pivotB ?? { x: 0, y: 0 };
        const worldA = { x: b1.position.x + anchorA.x, y: b1.position.y + anchorA.y };
        const worldB = { x: b2.position.x + anchorB.x, y: b2.position.y + anchorB.y };
        const dx = worldA.x - worldB.x;
        const dy = worldA.y - worldB.y;
        const m1 = b1.isStatic ? 0 : 1 / (b1.mass || 1);
        const m2 = b2.isStatic ? 0 : 1 / (b2.mass || 1);
        const invSum = m1 + m2;
        if (invSum === 0) return;
        if (!b1.isStatic) {
            b1.position.x -= dx * (m1 / invSum);
            b1.position.y -= dy * (m1 / invSum);
        }
        if (!b2.isStatic) {
            b2.position.x += dx * (m2 / invSum);
            b2.position.y += dy * (m2 / invSum);
        }
    }

    // Prismatic / Slider: Constrain motion along axis u_hat
    _solvePrismaticConstraint(b1, b2, c) {
        if (!b2) return;
        const axis = c.axis ?? { x: 1, y: 0 };
        const axLen = Math.sqrt(axis.x ** 2 + axis.y ** 2) || 1;
        const ux = axis.x / axLen;
        const uy = axis.y / axLen;
        // Perpendicular
        const nx = -uy;
        const ny = ux;
        const anchorA = c.anchorA ?? { x: 0, y: 0 };
        const anchorB = c.anchorB ?? { x: 0, y: 0 };
        const dx = (b2.position.x + anchorB.x) - (b1.position.x + anchorA.x);
        const dy = (b2.position.y + anchorB.y) - (b1.position.y + anchorA.y);
        const perpDist = dx * nx + dy * ny;
        const m1 = b1.isStatic ? 0 : 1 / (b1.mass || 1);
        const m2 = b2.isStatic ? 0 : 1 / (b2.mass || 1);
        const invSum = m1 + m2;
        if (invSum === 0) return;
        if (!b1.isStatic) {
            b1.position.x += perpDist * (m1 / invSum) * nx;
            b1.position.y += perpDist * (m1 / invSum) * ny;
        }
        if (!b2.isStatic) {
            b2.position.x -= perpDist * (m2 / invSum) * nx;
            b2.position.y -= perpDist * (m2 / invSum) * ny;
        }
    }

    // Spring-Damper: F = -k(|r| - L0)r_hat - c * v_rel
    _solveSpringConstraint(b1, b2, c) {
        if (!b2) return;
        const stiffness = c.stiffness ?? 100;
        const damping = c.damping ?? 5;
        const restLength = c.distance ?? c.restLength ?? 50;
        const dx = b2.position.x - b1.position.x;
        const dy = b2.position.y - b1.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const nx = dx / dist;
        const ny = dy / dist;
        const stretch = dist - restLength;
        // Relative velocity along spring axis
        const rvx = (b2.velocity?.x ?? 0) - (b1.velocity?.x ?? 0);
        const rvy = (b2.velocity?.y ?? 0) - (b1.velocity?.y ?? 0);
        const relVelAlongAxis = rvx * nx + rvy * ny;
        const forceMag = stiffness * stretch + damping * relVelAlongAxis;
        const fx = forceMag * nx;
        const fy = forceMag * ny;
        if (!b1.isStatic) {
            const m1 = b1.mass || 1;
            b1.acceleration.x += fx / m1;
            b1.acceleration.y += fy / m1;
        }
        if (!b2.isStatic) {
            const m2 = b2.mass || 1;
            b2.acceleration.x -= fx / m2;
            b2.acceleration.y -= fy / m2;
        }
    }

    _applyGroundPlane(groundY) {
        this.bodies.forEach(b => {
            if (b.isStatic) return;
            const r = b.radius || 10;
            if (b.position.y + r > groundY) {
                b.position.y = groundY - r;
                b.velocity.y *= -(b.restitution ?? 0.5);
                b.velocity.x *= (1 - (b.friction ?? 0.3));
                b.onGround = true;
            } else {
                b.onGround = false;
            }
        });
    }

    getSnapshot() {
        const energy = calculateEnergy(this.bodies, 600, Math.abs(this.settings.gravity?.y ?? 9.81));
        const vectors = buildForceVectors(this.bodies, this.settings);
        return {
            time: this.time,
            bodies: this.bodies.map(b => ({
                id: b.id,
                position: { ...b.position },
                rotation: Array.isArray(b.rotation) ? [...b.rotation] : { ...(b.rotation || {}) },
                angularVelocity: { ...(b.angularVelocity || {}) },
                velocity: { ...b.velocity },
                acceleration: { ...b.acceleration },
                onGround: b.onGround ?? false,
                sleeping: b.sleeping ?? false,
                mass: b.mass,
                material_id: b.material_id
            })),
            energy,
            vectors,
            manifolds: this._lastManifolds,
            constraints: this.constraints
        };
    }

    // ── AI Read Path (window.REALIS_AI_QUERY) ────────────────────────────────
    getLiveTelemetry() {
        return {
            time: this.time,
            bodyCount: this.bodies.length,
            sleepingCount: this.bodies.filter(b => b.sleeping).length,
            constraintCount: this.constraints.length,
            activeManifolds: this._lastManifolds.length,
            bodies: this.bodies.map(b => ({
                id: b.id,
                type: b.type,
                position: { ...b.position },
                velocity: { ...(b.velocity || {}) },
                angularVelocity: { ...(b.angularVelocity || {}) },
                mass: b.mass,
                material_id: b.material_id,
                restitution: b.restitution,
                friction: b.friction,
                isStatic: b.isStatic,
                sleeping: b.sleeping,
                onGround: b.onGround,
                kineticEnergy: b.isStatic ? 0 : 0.5 * (b.mass || 1) * ((b.velocity?.x ?? 0) ** 2 + (b.velocity?.y ?? 0) ** 2),
                netForce: { x: (b.acceleration?.x ?? 0) * (b.mass || 1), y: (b.acceleration?.y ?? 0) * (b.mass || 1) }
            })),
            energy: calculateEnergy(this.bodies, 600, Math.abs(this.settings.gravity?.y ?? 9.81)),
            manifolds: this._lastManifolds.map(m => ({
                bodyAId: m.bodyAId,
                bodyBId: m.bodyBId,
                normal: m.normal,
                penetration: m.penetration,
                contacts: m.contacts
            }))
        };
    }

    reset() {
        this.bodies.forEach(b => {
            if (b._initialPosition) {
                b.position = { ...b._initialPosition };
            } else {
                b.position = { x: b.cx ?? b.x ?? 0, y: b.cy ?? b.y ?? 0, z: 0 };
            }
            b.velocity = b._initialVelocity ? { ...b._initialVelocity } : { x: 0, y: 0, z: 0 };
            b.acceleration = { x: 0, y: 0, z: 0 };
            b.onGround = false;
            b.sleeping = false;
            b._sleepTimer = 0;
        });
        this.time = 0;
        this._lastManifolds = [];
    }
}