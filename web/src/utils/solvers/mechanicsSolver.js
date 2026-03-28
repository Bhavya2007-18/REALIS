/**
 * REALIS Mechanics Solver
 * Rigid body dynamics: gravity, constraints, collisions, integration.
 * Uses physicsEngine service functions.
 */

import {
    applyForces,
    integrate,
    detectCollisions,
    resolveCollisions,
    calculateEnergy,
    buildForceVectors
} from '../physicsEngine.js';
import { applyWaterForces } from '../waterPhysics.js';

export default class MechanicsSolver {
    constructor(settings = {}) {
        this.settings = {
            gravity: settings.gravity ?? { x: 0, y: 9.81 },
            airResistance: settings.airResistance ?? 0.01,
            frictionCoeff: settings.frictionCoeff ?? 0.3,
            timeStep: settings.timeStep ?? 0.016,
            subSteps: settings.subSteps ?? 1,
            mode: settings.mode ?? 'preview', // 'preview' | 'accurate'
            groundY: settings.groundY ?? 600
        };
        this.bodies = [];
        this.constraints = [];
        this.time = 0;
    }

    setBodies(rawBodies) {
        // Normalize all bodies to have position, velocity, acceleration
        this.bodies = rawBodies.map(b => {
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

            const dimX = b.params?.width ?? b.dimensions?.x ?? (b.radius ? b.radius * 2 : 10);
            const dimY = b.params?.height ?? b.dimensions?.y ?? (b.radius ? b.radius * 2 : 10);
            const dimZ = b.params?.depth ?? b.dimensions?.z ?? (b.radius ? b.radius * 2 : 10);
            const halfExtents = { x: (dimX || 10) / 2, y: (dimY || 10) / 2, z: (dimZ || 10) / 2 };
            const approxRadius = Math.sqrt(halfExtents.x ** 2 + halfExtents.y ** 2 + halfExtents.z ** 2);

            return {
                ...b,
                position: pos,
                _initialPosition: { ...pos },
                velocity: b.velocity ?? { x: 0, y: 0, z: 0 },
                acceleration: b.acceleration ?? { x: 0, y: 0, z: 0 },
                mass: b.mass ?? 1,
                radius: b.radius ?? b.r ?? approxRadius,
                halfExtents
            };
        });
    }

    setConstraints(constraints) {
        this.constraints = constraints;
    }

    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };
    }

    /**
     * Run one simulation step. Returns snapshot of bodies + analytics.
     */
    step() {
        const subSteps = this.settings.mode === 'accurate' ? 
            Math.max(4, this.settings.subSteps ?? 1) : 
            (this.settings.subSteps ?? 1);
        const dt = this.settings.timeStep / subSteps;

        for (let s = 0; s < subSteps; s++) {
            // 1. Apply forces
            applyForces(this.bodies, this.settings);
            if (this.settings.water?.enabled) {
                applyWaterForces(this.bodies, this.settings.water, this.settings.gravity);
            }

            // 2. Resolve constraints (distance/rod relaxation)
            this._resolveConstraints(5);

            // 3. Detect & resolve collisions
            if (this.settings.mode === 'accurate') {
                const pairs = detectCollisions(this.bodies);
                resolveCollisions(pairs);
            }

            // 4. Integrate
            integrate(this.bodies, dt);

            // 5. Ground plane
            this._applyGroundPlane(this.settings.groundY ?? 600);
        }

        this.time += this.settings.timeStep;
        return this.getSnapshot();
    }

    _resolveConstraints(iterations = 5) {
        for (let i = 0; i < iterations; i++) {
            this.constraints.forEach(c => {
                if (c.type !== 'distance' && c.type !== 'stick' && c.type !== 'con_rod') return;

                const b1 = this.bodies.find(b => b.id === c.targetA);
                const b2 = c.targetB ? this.bodies.find(b => b.id === c.targetB) : null;
                if (!b1) return;

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
                }
                if (b2 && !b2.isStatic) {
                    b2.position.x += dx * (m2 / invSum) * diff;
                    b2.position.y += dy * (m2 / invSum) * diff;
                }
            });
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
                onGround: b.onGround ?? false
            })),
            energy,
            vectors
        };
    }

    reset() {
        this.bodies.forEach(b => {
            if (b._initialPosition) {
                b.position = { ...b._initialPosition };
            } else {
                b.position = { x: b.cx ?? b.x ?? 0, y: b.cy ?? b.y ?? 0, z: 0 };
            }
            b.velocity = { x: 0, y: 0, z: 0 };
            b.acceleration = { x: 0, y: 0, z: 0 };
            b.onGround = false;
        });
        this.time = 0;
    }
}
