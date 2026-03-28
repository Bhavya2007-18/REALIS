/**
 * REALIS Physics Engine - Core Service Layer
 * Decoupled from UI. Used by solvers and simulation loop.
 * Supports: rigid body dynamics, thermal simulation, energy analysis.
 */

// ─── Force Application ────────────────────────────────────────────────────────

/**
 * Apply all forces (gravity, friction, air resistance) to bodies.
 * Mutates acceleration in-place.
 */
export function applyForces(bodies, settings = {}) {
    const {
        gravity = { x: 0, y: 9.81 },
        airResistance = 0.01,
        frictionCoeff = 0.3,
    } = settings;

    bodies.forEach(b => {
        if (b.isStatic) return;

        // Gravity (F = mg)
        b.acceleration = {
            x: gravity.x,
            y: gravity.y,
            z: gravity.z ?? 0
        };

        // External force (e.g., motor thrust) - acceleration += F/m
        if (b.externalForce) {
            const m = b.mass || 1;
            b.acceleration.x += (b.externalForce.x || 0) / m;
            b.acceleration.y += (b.externalForce.y || 0) / m;
            b.acceleration.z = (b.acceleration.z || 0) + (b.externalForce.z || 0) / m;
        }
        if (b.externalTorque) {
            const w = b.params?.width || b.dimensions?.x || 10;
            const d = b.params?.depth || b.dimensions?.z || 10;
            const m = b.mass || 1;
            const Iz = (m * (w * w + d * d)) / 12;
            b.angularAcceleration = b.angularAcceleration || { x: 0, y: 0, z: 0 };
            b.angularAcceleration.z += (b.externalTorque.z || 0) / Math.max(Iz, 1e-3);
        }

        // Air resistance (drag ∝ v²·Cd)
        const speed = Math.sqrt(
            (b.velocity?.x ?? 0) ** 2 +
            (b.velocity?.y ?? 0) ** 2 +
            (b.velocity?.z ?? 0) ** 2
        );
        if (speed > 0.001) {
            const dragMag = airResistance * speed * speed / (b.mass || 1);
            b.acceleration.x -= dragMag * (b.velocity.x / speed);
            b.acceleration.y -= dragMag * (b.velocity.y / speed);
        }

        // Ground friction when on ground (simplified)
        if (b.onGround) {
            b.velocity.x *= (1 - frictionCoeff * 0.016);
        }
    });
}

// ─── Euler Integration ────────────────────────────────────────────────────────

/**
 * Integrate positions and velocities using semi-implicit Euler.
 */
export function integrate(bodies, dt) {
    bodies.forEach(b => {
        if (b.isStatic) return;

        b.velocity.x += (b.acceleration?.x ?? 0) * dt;
        b.velocity.y += (b.acceleration?.y ?? 0) * dt;
        b.velocity.z = (b.velocity.z ?? 0) + ((b.acceleration?.z ?? 0) * dt);

        b.position.x += b.velocity.x * dt;
        b.position.y += b.velocity.y * dt;
        b.position.z = (b.position.z ?? 0) + (b.velocity.z ?? 0) * dt;

        if (b.angularAcceleration || b.angularVelocity) {
            const ang = b.angularAcceleration || { x: 0, y: 0, z: 0 };
            b.angularVelocity = b.angularVelocity || { x: 0, y: 0, z: 0 };
            b.angularVelocity.z += (ang.z || 0) * dt;
            b.angularVelocity.z *= 0.985;
            const rot = Array.isArray(b.rotation) ? b.rotation : [b.rotation?.x || 0, b.rotation?.y || 0, b.rotation?.z || 0];
            const newRotZ = (rot[2] || 0) + b.angularVelocity.z * dt;
            b.rotation = [rot[0], rot[1], newRotZ];
        }
    });
}

// ─── Collision Detection ──────────────────────────────────────────────────────

/**
 * Basic AABB + circle collision detection.
 * Returns list of collision pairs: [{ a, b, normal, penetration }]
 */
export function detectCollisions(bodies) {
    const collisions = [];
    for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
            const a = bodies[i];
            const b = bodies[j];
            if (a.isStatic && b.isStatic) continue;
            const ax = a.position?.x ?? a.cx ?? 0;
            const ay = a.position?.y ?? a.cy ?? 0;
            const az = a.position?.z ?? 0;
            const bx = b.position?.x ?? b.cx ?? 0;
            const by = b.position?.y ?? b.cy ?? 0;
            const bz = b.position?.z ?? 0;
            const ahe = a.halfExtents || { x: a.radius || 10, y: a.radius || 10, z: a.radius || 10 };
            const bhe = b.halfExtents || { x: b.radius || 10, y: b.radius || 10, z: b.radius || 10 };
            const dx = bx - ax;
            const dy = by - ay;
            const dz = bz - az;
            const ox = (ahe.x + bhe.x) - Math.abs(dx);
            const oy = (ahe.y + bhe.y) - Math.abs(dy);
            const oz = (ahe.z + bhe.z) - Math.abs(dz);
            if (ox > 0 && oy > 0 && oz > 0) {
                const minPen = Math.min(ox, oy, oz);
                let normal = { x: 0, y: 0, z: 0 };
                if (minPen === ox) normal = { x: Math.sign(dx), y: 0, z: 0 };
                else if (minPen === oy) normal = { x: 0, y: Math.sign(dy), z: 0 };
                else normal = { x: 0, y: 0, z: Math.sign(dz) };
                collisions.push({ a, b, normal, penetration: minPen });
            }
        }
    }
    return collisions;
}

/**
 * Resolve collision pairs using impulse-based response.
 */
export function resolveCollisions(collisions) {
    collisions.forEach(({ a, b, normal, penetration }) => {
        const correction = penetration * 0.5;
        if (!a.isStatic) {
            a.position.x -= normal.x * correction;
            a.position.y -= normal.y * correction;
            a.position.z = (a.position.z ?? 0) - (normal.z || 0) * correction;
        }
        if (!b.isStatic) {
            b.position.x += normal.x * correction;
            b.position.y += normal.y * correction;
            b.position.z = (b.position.z ?? 0) + (normal.z || 0) * correction;
        }

        const restitution = Math.min(a.restitution ?? 0.5, b.restitution ?? 0.5);

        const relVelX = (b.velocity?.x ?? 0) - (a.velocity?.x ?? 0);
        const relVelY = (b.velocity?.y ?? 0) - (a.velocity?.y ?? 0);
        const relVelZ = (b.velocity?.z ?? 0) - (a.velocity?.z ?? 0);
        const relVelAlongNormal = relVelX * normal.x + relVelY * normal.y + relVelZ * (normal.z || 0);

        if (relVelAlongNormal > 0) return;

        const invMassA = a.isStatic ? 0 : 1 / (a.mass || 1);
        const invMassB = b.isStatic ? 0 : 1 / (b.mass || 1);
        const invMassSum = invMassA + invMassB;
        if (invMassSum === 0) return;

        const impulseMag = -(1 + restitution) * relVelAlongNormal / invMassSum;

        if (!a.isStatic) {
            a.velocity = a.velocity || { x: 0, y: 0, z: 0 };
            a.velocity.x -= impulseMag * invMassA * normal.x;
            a.velocity.y -= impulseMag * invMassA * normal.y;
            a.velocity.z -= impulseMag * invMassA * (normal.z || 0);
        }
        if (!b.isStatic) {
            b.velocity = b.velocity || { x: 0, y: 0, z: 0 };
            b.velocity.x += impulseMag * invMassB * normal.x;
            b.velocity.y += impulseMag * invMassB * normal.y;
            b.velocity.z += impulseMag * invMassB * (normal.z || 0);
        }
    });
}

// ─── Energy Calculations ──────────────────────────────────────────────────────

/**
 * Calculate kinetic, potential, and total mechanical energy.
 * @param {Array} bodies
 * @param {number} groundY - Y position of the ground reference
 * @param {number} gravityMag
 * @returns {{ kinetic, potential, total }}
 */
export function calculateEnergy(bodies, groundY = 600, gravityMag = 9.81) {
    let kinetic = 0;
    let potential = 0;

    bodies.forEach(b => {
        if (b.isStatic) return;
        const mass = b.mass || 1;
        const vx = b.velocity?.x ?? 0;
        const vy = b.velocity?.y ?? 0;
        const vz = b.velocity?.z ?? 0;
        const vSq = vx * vx + vy * vy + vz * vz;

        kinetic += 0.5 * mass * vSq;

        const posY = b.position?.y ?? b.cy ?? 0;
        const height = Math.max(0, groundY - posY);
        potential += mass * gravityMag * height;
    });

    return { kinetic, potential, total: kinetic + potential };
}

// ─── Force Vectors ────────────────────────────────────────────────────────────

/**
 * Build force vector data for visualization.
 * Returns array of { origin, direction, magnitude } objects.
 */
export function buildForceVectors(bodies, settings = {}) {
    const gravity = settings.gravity ?? { x: 0, y: 9.81 };
    return bodies
        .filter(b => !b.isStatic)
        .map(b => {
            const mass = b.mass || 1;
            return {
                id: b.id,
                origin: {
                    x: b.position?.x ?? b.cx ?? 0,
                    y: b.position?.y ?? b.cy ?? 0
                },
                gravityForce: {
                    x: gravity.x * mass,
                    y: gravity.y * mass
                },
                velocity: { ...b.velocity },
                magnitude: Math.sqrt((gravity.x * mass) ** 2 + (gravity.y * mass) ** 2)
            };
        });
}

// ─── Thermal Physics ──────────────────────────────────────────────────────────

/**
 * Compute heat diffusion between bodies using Newton's law of cooling.
 * @param {Array} bodies - each body with { temperature, thermalConductivity, mass }
 * @param {number} dt
 * @returns {Map<string, number>} - map of id → new temperature
 */
export function diffuseHeat(bodies, dt = 0.016) {
    const temps = new Map(bodies.map(b => [b.id, b.temperature ?? 20]));

    bodies.forEach(a => {
        if (a.isHeatSource || a.isHeatSink) return; // fixed temperature anchors
        bodies.forEach(b => {
            if (a.id === b.id) return;

            const posAx = a.position?.x ?? a.cx ?? 0;
            const posAy = a.position?.y ?? a.cy ?? 0;
            const posBx = b.position?.x ?? b.cx ?? 0;
            const posBy = b.position?.y ?? b.cy ?? 0;

            const dist = Math.sqrt((posAx - posBx) ** 2 + (posAy - posBy) ** 2);
            if (dist > 120) return; // Only adjacent bodies

            const conductivity = Math.min(
                a.thermalConductivity ?? 50,
                b.thermalConductivity ?? 50
            );
            const tempA = temps.get(a.id) ?? 20;
            const tempB = temps.get(b.id) ?? 20;

            const heatFlow = conductivity * (tempB - tempA) * dt / Math.max(dist, 1);
            const massA = a.mass || 1;
            const specificHeat = 500; // J/(kg·K) typical for metals

            const dT = heatFlow / (massA * specificHeat);
            temps.set(a.id, tempA + dT);
        });
    });

    return temps;
}

/**
 * Map a temperature value [minT, maxT] to a CSS color string (blue→green→yellow→red heatmap).
 */
export function tempToColor(temp, minT = 20, maxT = 500) {
    const t = Math.min(1, Math.max(0, (temp - minT) / (maxT - minT)));

    // Heatmap: blue (0) → cyan (0.25) → green (0.5) → yellow (0.75) → red (1)
    let r, g, bv;
    if (t < 0.25) {
        const f = t / 0.25;
        r = 0; g = Math.round(255 * f); bv = 255;
    } else if (t < 0.5) {
        const f = (t - 0.25) / 0.25;
        r = 0; g = 255; bv = Math.round(255 * (1 - f));
    } else if (t < 0.75) {
        const f = (t - 0.5) / 0.25;
        r = Math.round(255 * f); g = 255; bv = 0;
    } else {
        const f = (t - 0.75) / 0.25;
        r = 255; g = Math.round(255 * (1 - f)); bv = 0;
    }

    return `rgba(${r},${g},${bv},0.75)`;
}

/**
 * Calculate thermal insights: heat risk level, hottest body.
 */
export function analyzeThermal(bodies, tempMap) {
    let maxTemp = -Infinity;
    let hottestId = null;
    let totalTemp = 0;
    let count = 0;

    bodies.forEach(b => {
        const t = tempMap.get(b.id) ?? (b.temperature ?? 20);
        if (t > maxTemp) { maxTemp = t; hottestId = b.id; }
        totalTemp += t;
        count++;
    });

    const avgTemp = count > 0 ? totalTemp / count : 20;
    const heatRisk = maxTemp > 400 ? 'CRITICAL' : maxTemp > 250 ? 'HIGH' : maxTemp > 100 ? 'MODERATE' : 'LOW';

    return { maxTemp, avgTemp, hottestId, heatRisk };
}
