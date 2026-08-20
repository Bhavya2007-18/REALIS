// ═══════════════════════════════════════════════════════════════════════════════
// REALIS Physics Engine Core — Stage 1 (Foundation)
// Canonical Units: m, kg, s, N, rad, J
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Safety Constants ────────────────────────────────────────────────────────
const V_MAX = 500;        // m/s  — linear velocity clamp
const W_MAX = 100;        // rad/s — angular velocity clamp
const SLEEP_V2 = 1e-4;    // m²/s² — linear sleep threshold
const SLEEP_W2 = 1e-4;    // rad²/s² — angular sleep threshold
const SLEEP_TIME = 0.5;   // s — duration below threshold before sleeping
const PEN_SLOP = 0.005;   // m — penetration slop (no correction below this)
const MAX_CORRECTION = 0.1; // m — max positional correction per step
const BAUMGARTE_BETA = 0.2;

// ─── Modular ForceGenerator Architecture ─────────────────────────────────────
export class ForceGenerator {
    applyForce(bodies, worldState) { /* abstract */ }
}

export class GravityForceGenerator extends ForceGenerator {
    constructor(gravity = { x: 0, y: 9.81, z: 0 }) {
        super();
        this.gravity = gravity;
    }
    applyForce(bodies) {
        bodies.forEach(b => {
            if (b.isStatic || b.motionType === 'kinematic' || b.sleeping) return;
            b.acceleration.x += this.gravity.x;
            b.acceleration.y += this.gravity.y;
            b.acceleration.z += this.gravity.z ?? 0;
        });
    }
}

export class LinearDampingGenerator extends ForceGenerator {
    constructor(coefficient = 0.01) {
        super();
        this.coefficient = coefficient;
    }
    applyForce(bodies) {
        bodies.forEach(b => {
            if (b.isStatic || b.sleeping) return;
            const speed = Math.sqrt(
                (b.velocity.x ?? 0) ** 2 +
                (b.velocity.y ?? 0) ** 2 +
                (b.velocity.z ?? 0) ** 2
            );
            if (speed > 0.001) {
                const dragMag = this.coefficient * speed * speed / (b.mass || 1);
                b.acceleration.x -= dragMag * (b.velocity.x / speed);
                b.acceleration.y -= dragMag * (b.velocity.y / speed);
            }
        });
    }
}

export class GroundFrictionGenerator extends ForceGenerator {
    constructor(coefficient = 0.3) {
        super();
        this.coefficient = coefficient;
    }
    applyForce(bodies) {
        bodies.forEach(b => {
            if (b.isStatic || b.sleeping) return;
            if (b.onGround) {
                b.velocity.x *= (1 - this.coefficient * 0.016);
            }
        });
    }
}

export class MouseSpringGenerator extends ForceGenerator {
    constructor() {
        super();
        this.active = false;
        this.bodyId = null;
        this.targetPos = { x: 0, y: 0 };
        this.stiffness = 50;
        this.damping = 5;
    }
    setTarget(bodyId, targetPos) {
        this.active = true;
        this.bodyId = bodyId;
        this.targetPos = { ...targetPos };
    }
    release() {
        this.active = false;
        this.bodyId = null;
    }
    applyForce(bodies) {
        if (!this.active || !this.bodyId) return;
        const b = bodies.find(body => body.id === this.bodyId);
        if (!b || b.isStatic) return;
        if (b.sleeping) b.sleeping = false; // wake on drag
        const dx = b.position.x - this.targetPos.x;
        const dy = b.position.y - this.targetPos.y;
        const fx = -this.stiffness * dx - this.damping * (b.velocity.x ?? 0);
        const fy = -this.stiffness * dy - this.damping * (b.velocity.y ?? 0);
        const m = b.mass || 1;
        b.acceleration.x += fx / m;
        b.acceleration.y += fy / m;
    }
}

export class PointGravityGenerator extends ForceGenerator {
    constructor(center = { x: 0, y: 0, z: 0 }, strength = 5000000) {
        super();
        this.center = center;
        this.strength = strength;
    }
    applyForce(bodies) {
        bodies.forEach(b => {
            if (b.isStatic || b.sleeping) return;
            const dx = this.center.x - b.position.x;
            const dy = this.center.y - b.position.y;
            const dz = (this.center.z ?? 0) - (b.position.z ?? 0);
            const r2 = dx * dx + dy * dy + dz * dz;
            if (r2 < 1) return;
            const r = Math.sqrt(r2);
            const F = this.strength * (b.mass || 1) / r2;
            b.acceleration.x += F * dx / r / (b.mass || 1);
            b.acceleration.y += F * dy / r / (b.mass || 1);
            b.acceleration.z = (b.acceleration.z || 0) + F * dz / r / (b.mass || 1);
        });
    }
}

// ─── Force Registry ──────────────────────────────────────────────────────────
export class ForceRegistry {
    constructor() { this.generators = []; }
    add(gen) { this.generators.push(gen); }
    remove(gen) { this.generators = this.generators.filter(g => g !== gen); }
    clear() { this.generators = []; }
    applyAll(bodies, worldState) {
        // Reset accelerations before applying forces
        bodies.forEach(b => {
            if (b.isStatic || b.sleeping) return;
            b.acceleration = { x: 0, y: 0, z: 0 };
        });
        this.generators.forEach(g => g.applyForce(bodies, worldState));
    }
}

// ─── Legacy applyForces (backward compat) ────────────────────────────────────
export function applyForces(bodies, settings = {}) {
    const { gravity = { x: 0, y: 9.81 }, airResistance = 0.01, frictionCoeff = 0.3 } = settings;
    bodies.forEach(b => {
        if (b.isStatic || b.sleeping) return;
        b.acceleration = { x: gravity.x, y: gravity.y, z: gravity.z ?? 0 };
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
        const speed = Math.sqrt((b.velocity?.x ?? 0) ** 2 + (b.velocity?.y ?? 0) ** 2 + (b.velocity?.z ?? 0) ** 2);
        if (speed > 0.001) {
            const dragMag = airResistance * speed * speed / (b.mass || 1);
            b.acceleration.x -= dragMag * (b.velocity.x / speed);
            b.acceleration.y -= dragMag * (b.velocity.y / speed);
        }
        if (b.onGround) { b.velocity.x *= (1 - frictionCoeff * 0.016); }
    });
}

// ─── Symplectic Euler Integrator with Safety Clamping ────────────────────────
export function integrate(bodies, dt) {
    bodies.forEach(b => {
        if (b.isStatic || b.sleeping) return;
        // Symplectic Euler: update velocity first, then position
        b.velocity.x += (b.acceleration?.x ?? 0) * dt;
        b.velocity.y += (b.acceleration?.y ?? 0) * dt;
        b.velocity.z = (b.velocity.z ?? 0) + ((b.acceleration?.z ?? 0) * dt);

        // Velocity clamping
        const vSq = b.velocity.x ** 2 + b.velocity.y ** 2 + (b.velocity.z ?? 0) ** 2;
        if (vSq > V_MAX * V_MAX) {
            const scale = V_MAX / Math.sqrt(vSq);
            b.velocity.x *= scale;
            b.velocity.y *= scale;
            b.velocity.z *= scale;
        }

        // NaN/Infinity sanitization
        if (!Number.isFinite(b.velocity.x)) b.velocity.x = 0;
        if (!Number.isFinite(b.velocity.y)) b.velocity.y = 0;
        if (!Number.isFinite(b.velocity.z)) b.velocity.z = 0;

        b.position.x += b.velocity.x * dt;
        b.position.y += b.velocity.y * dt;
        b.position.z = (b.position.z ?? 0) + (b.velocity.z ?? 0) * dt;

        if (!Number.isFinite(b.position.x)) b.position.x = 0;
        if (!Number.isFinite(b.position.y)) b.position.y = 0;
        if (!Number.isFinite(b.position.z)) b.position.z = 0;

        // Angular integration
        if (b.angularAcceleration || b.angularVelocity) {
            const ang = b.angularAcceleration || { x: 0, y: 0, z: 0 };
            b.angularVelocity = b.angularVelocity || { x: 0, y: 0, z: 0 };
            b.angularVelocity.z += (ang.z || 0) * dt;
            // Angular velocity clamping
            if (Math.abs(b.angularVelocity.z) > W_MAX) {
                b.angularVelocity.z = Math.sign(b.angularVelocity.z) * W_MAX;
            }
            b.angularVelocity.z *= 0.985;
            const rot = Array.isArray(b.rotation) ? b.rotation : [b.rotation?.x || 0, b.rotation?.y || 0, b.rotation?.z || 0];
            const newRotZ = (rot[2] || 0) + b.angularVelocity.z * dt;
            b.rotation = [rot[0], rot[1], newRotZ];
        }
    });
}

// ─── Sleeping Body Detection ─────────────────────────────────────────────────
export function updateSleepingState(bodies, dt) {
    bodies.forEach(b => {
        if (b.isStatic) return;
        const vSq = (b.velocity?.x ?? 0) ** 2 + (b.velocity?.y ?? 0) ** 2 + (b.velocity?.z ?? 0) ** 2;
        const wSq = (b.angularVelocity?.z ?? 0) ** 2;
        if (vSq < SLEEP_V2 && wSq < SLEEP_W2) {
            b._sleepTimer = (b._sleepTimer || 0) + dt;
            if (b._sleepTimer >= SLEEP_TIME) {
                b.sleeping = true;
            }
        } else {
            b._sleepTimer = 0;
            b.sleeping = false;
        }
    });
}

export function wakeBody(body) {
    body.sleeping = false;
    body._sleepTimer = 0;
}

// ─── Unified ContactManifold Generation ──────────────────────────────────────

function getBodyShape(b) {
    if (b.type === 'sphere' || b.type === 'circle' || b.r || (b.params?.radius && !b.params?.width)) {
        return 'circle';
    }
    return 'box';
}

function getBodyRadius(b) {
    return b.params?.radius || b.r || b.radius || (b.halfExtents ? Math.max(b.halfExtents.x, b.halfExtents.y) : 10);
}

function getBodyHalfExtents(b) {
    return b.halfExtents || {
        x: (b.params?.width ?? b.width ?? 10) / 2,
        y: (b.params?.height ?? b.height ?? 10) / 2,
        z: (b.params?.depth ?? b.depth ?? 10) / 2
    };
}

// Circle vs Circle narrow phase
function circleVsCircle(a, b) {
    const dx = b.position.x - a.position.x;
    const dy = b.position.y - a.position.y;
    const rA = getBodyRadius(a);
    const rB = getBodyRadius(b);
    const distSq = dx * dx + dy * dy;
    const sumR = rA + rB;
    if (distSq >= sumR * sumR) return null;
    const dist = Math.sqrt(distSq) || 0.001;
    return {
        bodyAId: a.id, bodyBId: b.id, bodyA: a, bodyB: b,
        contacts: [{ x: a.position.x + dx * (rA / sumR), y: a.position.y + dy * (rA / sumR) }],
        normal: { x: dx / dist, y: dy / dist },
        penetration: sumR - dist,
        restitution: Math.min(a.restitution ?? 0.5, b.restitution ?? 0.5),
        friction: Math.max(a.friction ?? 0.3, b.friction ?? 0.3)
    };
}

// Circle vs Box narrow phase
function circleVsBox(circle, box) {
    const r = getBodyRadius(circle);
    const he = getBodyHalfExtents(box);
    const dx = circle.position.x - box.position.x;
    const dy = circle.position.y - box.position.y;
    const closestX = Math.max(-he.x, Math.min(he.x, dx));
    const closestY = Math.max(-he.y, Math.min(he.y, dy));
    const diffX = dx - closestX;
    const diffY = dy - closestY;
    const distSq = diffX * diffX + diffY * diffY;
    if (distSq >= r * r) return null;
    const dist = Math.sqrt(distSq) || 0.001;
    const nx = diffX / dist;
    const ny = diffY / dist;
    return {
        bodyAId: circle.id, bodyBId: box.id, bodyA: circle, bodyB: box,
        contacts: [{ x: box.position.x + closestX, y: box.position.y + closestY }],
        normal: { x: nx, y: ny },
        penetration: r - dist,
        restitution: Math.min(circle.restitution ?? 0.5, box.restitution ?? 0.5),
        friction: Math.max(circle.friction ?? 0.3, box.friction ?? 0.3)
    };
}

// Box vs Box SAT narrow phase
function boxVsBox(a, b) {
    const heA = getBodyHalfExtents(a);
    const heB = getBodyHalfExtents(b);
    const dx = b.position.x - a.position.x;
    const dy = b.position.y - a.position.y;
    const ox = (heA.x + heB.x) - Math.abs(dx);
    if (ox <= 0) return null;
    const oy = (heA.y + heB.y) - Math.abs(dy);
    if (oy <= 0) return null;
    let nx, ny, pen;
    if (ox < oy) {
        pen = ox; nx = Math.sign(dx) || 1; ny = 0;
    } else {
        pen = oy; nx = 0; ny = Math.sign(dy) || 1;
    }
    const cpX = (Math.max(a.position.x - heA.x, b.position.x - heB.x) + Math.min(a.position.x + heA.x, b.position.x + heB.x)) / 2;
    const cpY = (Math.max(a.position.y - heA.y, b.position.y - heB.y) + Math.min(a.position.y + heA.y, b.position.y + heB.y)) / 2;
    return {
        bodyAId: a.id, bodyBId: b.id, bodyA: a, bodyB: b,
        contacts: [{ x: cpX, y: cpY }],
        normal: { x: nx, y: ny },
        penetration: pen,
        restitution: Math.min(a.restitution ?? 0.5, b.restitution ?? 0.5),
        friction: Math.max(a.friction ?? 0.3, b.friction ?? 0.3)
    };
}

// ─── Unified Collision Detection (returns ContactManifold[]) ─────────────────
export function detectCollisions(bodies) {
    const manifolds = [];
    for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
            const a = bodies[i];
            const b = bodies[j];
            if (a.isStatic && b.isStatic) continue;
            if (a.sleeping && b.sleeping) continue;
            const shapeA = getBodyShape(a);
            const shapeB = getBodyShape(b);
            let manifold = null;
            if (shapeA === 'circle' && shapeB === 'circle') {
                manifold = circleVsCircle(a, b);
            } else if (shapeA === 'circle' && shapeB === 'box') {
                manifold = circleVsBox(a, b);
            } else if (shapeA === 'box' && shapeB === 'circle') {
                manifold = circleVsBox(b, a);
                if (manifold) { manifold.normal.x *= -1; manifold.normal.y *= -1; }
            } else {
                manifold = boxVsBox(a, b);
            }
            if (manifold) manifolds.push(manifold);
        }
    }
    return manifolds;
}

// ─── Impulse-Based Collision Resolution with Friction & Baumgarte ────────────
export function resolveCollisions(manifolds) {
    manifolds.forEach(m => {
        const a = m.bodyA;
        const b = m.bodyB;
        const { normal, penetration, restitution, friction } = m;

        // Wake sleeping bodies on contact
        if (a.sleeping) wakeBody(a);
        if (b.sleeping) wakeBody(b);

        const invMassA = a.isStatic ? 0 : 1 / (a.mass || 1);
        const invMassB = b.isStatic ? 0 : 1 / (b.mass || 1);
        const invMassSum = invMassA + invMassB;
        if (invMassSum === 0) return;

        // Relative velocity along normal
        const relVelX = (b.velocity?.x ?? 0) - (a.velocity?.x ?? 0);
        const relVelY = (b.velocity?.y ?? 0) - (a.velocity?.y ?? 0);
        const relVelN = relVelX * normal.x + relVelY * normal.y;
        if (relVelN > 0) return; // separating

        // Normal impulse
        const j = -(1 + restitution) * relVelN / invMassSum;
        if (!a.isStatic) {
            a.velocity.x -= j * invMassA * normal.x;
            a.velocity.y -= j * invMassA * normal.y;
        }
        if (!b.isStatic) {
            b.velocity.x += j * invMassB * normal.x;
            b.velocity.y += j * invMassB * normal.y;
        }

        // Tangential friction impulse
        const tanX = relVelX - relVelN * normal.x;
        const tanY = relVelY - relVelN * normal.y;
        const tanLen = Math.sqrt(tanX * tanX + tanY * tanY);
        if (tanLen > 0.001) {
            const tNx = tanX / tanLen;
            const tNy = tanY / tanLen;
            const relVelT = relVelX * tNx + relVelY * tNy;
            let jt = -relVelT / invMassSum;
            // Coulomb friction clamp
            if (Math.abs(jt) > Math.abs(j) * friction) {
                jt = Math.sign(jt) * Math.abs(j) * friction;
            }
            if (!a.isStatic) {
                a.velocity.x -= jt * invMassA * tNx;
                a.velocity.y -= jt * invMassA * tNy;
            }
            if (!b.isStatic) {
                b.velocity.x += jt * invMassB * tNx;
                b.velocity.y += jt * invMassB * tNy;
            }
        }

        // Baumgarte positional correction with slop and max correction
        const correctionMag = Math.min(
            Math.max(penetration - PEN_SLOP, 0) * BAUMGARTE_BETA / invMassSum,
            MAX_CORRECTION
        );
        if (!a.isStatic) {
            a.position.x -= correctionMag * invMassA * normal.x;
            a.position.y -= correctionMag * invMassA * normal.y;
        }
        if (!b.isStatic) {
            b.position.x += correctionMag * invMassB * normal.x;
            b.position.y += correctionMag * invMassB * normal.y;
        }
    });
}

// ─── Energy Calculation ──────────────────────────────────────────────────────
export function calculateEnergy(bodies, groundY = 600, gravityMag = 9.81) {
    let kinetic = 0;
    let potential = 0;
    bodies.forEach(b => {
        if (b.isStatic) return;
        const mass = b.mass || 1;
        const vx = b.velocity?.x ?? 0;
        const vy = b.velocity?.y ?? 0;
        const vz = b.velocity?.z ?? 0;
        kinetic += 0.5 * mass * (vx * vx + vy * vy + vz * vz);
        const posY = b.position?.y ?? b.cy ?? 0;
        const height = Math.max(0, groundY - posY);
        potential += mass * gravityMag * height;
    });
    return { kinetic, potential, total: kinetic + potential };
}

// ─── Force Vector Builder ────────────────────────────────────────────────────
export function buildForceVectors(bodies, settings = {}) {
    const gravity = settings.gravity ?? { x: 0, y: 9.81 };
    return bodies
        .filter(b => !b.isStatic)
        .map(b => {
            const mass = b.mass || 1;
            return {
                id: b.id,
                origin: { x: b.position?.x ?? b.cx ?? 0, y: b.position?.y ?? b.cy ?? 0 },
                gravityForce: { x: gravity.x * mass, y: gravity.y * mass },
                velocity: { ...(b.velocity || { x: 0, y: 0 }) },
                magnitude: Math.sqrt((gravity.x * mass) ** 2 + (gravity.y * mass) ** 2),
                sleeping: b.sleeping || false
            };
        });
}

// ─── Thermal Functions (preserved) ───────────────────────────────────────────
export function diffuseHeat(bodies, dt = 0.016) {
    const temps = new Map(bodies.map(b => [b.id, b.temperature ?? 20]));
    bodies.forEach(a => {
        if (a.isHeatSource || a.isHeatSink) return;
        bodies.forEach(b => {
            if (a.id === b.id) return;
            const posAx = a.position?.x ?? a.cx ?? 0;
            const posAy = a.position?.y ?? a.cy ?? 0;
            const posBx = b.position?.x ?? b.cx ?? 0;
            const posBy = b.position?.y ?? b.cy ?? 0;
            const dist = Math.sqrt((posAx - posBx) ** 2 + (posAy - posBy) ** 2);
            if (dist > 120) return;
            const conductivity = Math.min(a.thermalConductivity ?? 50, b.thermalConductivity ?? 50);
            const tempA = temps.get(a.id) ?? 20;
            const tempB = temps.get(b.id) ?? 20;
            const heatFlow = conductivity * (tempB - tempA) * dt / Math.max(dist, 1);
            const massA = a.mass || 1;
            const dT = heatFlow / (massA * 500);
            temps.set(a.id, tempA + dT);
        });
    });
    return temps;
}

export function tempToColor(temp, minT = 20, maxT = 500) {
    const t = Math.min(1, Math.max(0, (temp - minT) / (maxT - minT)));
    let r, g, bv;
    if (t < 0.25) { const f = t / 0.25; r = 0; g = Math.round(255 * f); bv = 255; }
    else if (t < 0.5) { const f = (t - 0.25) / 0.25; r = 0; g = 255; bv = Math.round(255 * (1 - f)); }
    else if (t < 0.75) { const f = (t - 0.5) / 0.25; r = Math.round(255 * f); g = 255; bv = 0; }
    else { const f = (t - 0.75) / 0.25; r = 255; g = Math.round(255 * (1 - f)); bv = 0; }
    return `rgba(${r},${g},${bv},0.75)`;
}

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