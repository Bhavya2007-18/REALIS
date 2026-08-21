// ═══════════════════════════════════════════════════════════════════════════════
// REALIS Collision Physics Solver
// 1D Two-Body Collision: Elastic, Inelastic, Perfectly Inelastic
// Single source of truth — all telemetry derived from this state.
// ═══════════════════════════════════════════════════════════════════════════════

// Collision types
export const COLLISION_TYPE = {
    ELASTIC: 'elastic',           // e = 1
    INELASTIC: 'inelastic',       // 0 < e < 1
    PERFECTLY_INELASTIC: 'perfectly_inelastic', // e = 0
};

// Simulation phases
export const COLLISION_PHASE = {
    READY: 'ready',
    APPROACH: 'approach',
    CONTACT: 'contact',
    SEPARATING: 'separating',
    COMPLETED: 'completed',
};

// Default configuration (SI units)
export const DEFAULT_COLLISION_CONFIG = {
    // Object A
    massA: 1.0,          // kg
    velocityA: 2.0,      // m/s  (+x = right)
    positionA: -3.0,     // m    (start left of origin)
    radiusA: 0.5,        // m

    // Object B
    massB: 1.0,          // kg
    velocityB: -1.0,     // m/s  (-x = left)
    positionB: 3.0,      // m    (start right of origin)
    radiusB: 0.5,        // m

    // Global
    collisionType: COLLISION_TYPE.ELASTIC,
    restitution: 1.0,    // e = 1 for elastic
    timeScale: 1.0,
    dt: 1 / 240,         // physics timestep (s)
};

// ─── Validation ────────────────────────────────────────────────────────────────
export function validateCollisionConfig(cfg) {
    const errors = [];
    if (!Number.isFinite(cfg.massA) || cfg.massA <= 0) errors.push('Mass A must be > 0');
    if (!Number.isFinite(cfg.massB) || cfg.massB <= 0) errors.push('Mass B must be > 0');
    if (!Number.isFinite(cfg.radiusA) || cfg.radiusA <= 0) errors.push('Radius A must be > 0');
    if (!Number.isFinite(cfg.radiusB) || cfg.radiusB <= 0) errors.push('Radius B must be > 0');
    if (!Number.isFinite(cfg.restitution) || cfg.restitution < 0 || cfg.restitution > 1)
        errors.push('Restitution e must be in [0, 1]');
    // Check objects don't start overlapping
    const minSep = cfg.radiusA + cfg.radiusB;
    if (Math.abs(cfg.positionA - cfg.positionB) < minSep)
        errors.push('Objects A and B are initially overlapping — increase separation');
    return errors;
}

// ─── Solver ───────────────────────────────────────────────────────────────────
export default class CollisionPhysicsSolver {
    constructor(config = {}) {
        this.config = { ...DEFAULT_COLLISION_CONFIG, ...config };
        // Clamp restitution to type
        this._applyCollisionTypeRestitution();

        // Physics state
        this._posA = this.config.positionA;
        this._posB = this.config.positionB;
        this._velA = this.config.velocityA;
        this._velB = this.config.velocityB;

        // Time
        this._time = 0;
        this._accumulator = 0;

        // Collision tracking
        this._phase = COLLISION_PHASE.READY;
        this._collisionOccurred = false;
        this._collisionTime = null;
        this._collisionPosition = null;
        this._preVelA = null;
        this._preVelB = null;
        this._postVelA = null;
        this._postVelB = null;
        this._impulse = null;

        // Momentum & energy snapshots
        this._pInitial = this._momentum(this.config.massA, this.config.velocityA)
                        + this._momentum(this.config.massB, this.config.velocityB);
        this._pBefore = null;
        this._pAfter = null;
        this._keBefore = null;
        this._keAfter = null;

        // Contact lock (prevents re-triggering while objects overlap)
        this._inContact = false;
        this._stickyVelocity = null; // for perfectly inelastic

        // History ring buffer for graphs
        this._history = [];
        this._historyMaxLen = 400;

        // Record initial state
        this._recordHistory();
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    updateConfig(updates) {
        const newCfg = { ...this.config, ...updates };
        // Sync restitution to collision type if type changed
        if (updates.collisionType !== undefined) {
            if (updates.collisionType === COLLISION_TYPE.ELASTIC) newCfg.restitution = 1.0;
            if (updates.collisionType === COLLISION_TYPE.PERFECTLY_INELASTIC) newCfg.restitution = 0.0;
        }
        // If restitution changed directly, infer type
        if (updates.restitution !== undefined && updates.collisionType === undefined) {
            if (newCfg.restitution === 1.0) newCfg.collisionType = COLLISION_TYPE.ELASTIC;
            else if (newCfg.restitution === 0.0) newCfg.collisionType = COLLISION_TYPE.PERFECTLY_INELASTIC;
            else newCfg.collisionType = COLLISION_TYPE.INELASTIC;
        }
        this.config = newCfg;
    }

    reset() {
        this.config = { ...this.config };
        this._applyCollisionTypeRestitution();

        this._posA = this.config.positionA;
        this._posB = this.config.positionB;
        this._velA = this.config.velocityA;
        this._velB = this.config.velocityB;

        this._time = 0;
        this._accumulator = 0;
        this._phase = COLLISION_PHASE.READY;
        this._collisionOccurred = false;
        this._collisionTime = null;
        this._collisionPosition = null;
        this._preVelA = null;
        this._preVelB = null;
        this._postVelA = null;
        this._postVelB = null;
        this._impulse = null;
        this._pInitial = this._momentum(this.config.massA, this.config.velocityA)
                        + this._momentum(this.config.massB, this.config.velocityB);
        this._pBefore = null;
        this._pAfter = null;
        this._keBefore = null;
        this._keAfter = null;
        this._inContact = false;
        this._stickyVelocity = null;
        this._history = [];
        this._recordHistory();
    }

    /**
     * Advance the simulation by realDt seconds (wall-clock).
     * Uses a fixed-step accumulator for deterministic physics.
     * Returns the current snapshot.
     */
    tick(realDt) {
        const dt = this.config.dt;
        const scaledDt = Math.min(realDt * this.config.timeScale, 0.1); // clamp
        this._accumulator += scaledDt;

        while (this._accumulator >= dt) {
            this._step(dt);
            this._accumulator -= dt;
        }

        return this.getSnapshot();
    }

    /**
     * Single fixed-step forward (for step-mode).
     */
    step(realDt) {
        const dt = this.config.dt;
        this._step(dt);
        return this.getSnapshot();
    }

    getSnapshot() {
        const { massA, massB, radiusA, radiusB, restitution, collisionType } = this.config;
        const xA = this._posA, xB = this._posB;
        const vA = this._velA, vB = this._velB;

        // Kinematics
        const distance = xB - xA; // signed; positive means B is to the right
        const absDistance = Math.abs(distance);
        const separation = absDistance - (radiusA + radiusB);

        // Live momentum & KE
        const pA = this._momentum(massA, vA);
        const pB = this._momentum(massB, vB);
        const pTotal = pA + pB;
        const keA = this._kineticEnergy(massA, vA);
        const keB = this._kineticEnergy(massB, vB);
        const keTotal = keA + keB;

        // Conservation analysis (only meaningful after collision)
        const pBefore = this._pBefore !== null ? this._pBefore : pTotal;
        const pAfter  = this._pAfter  !== null ? this._pAfter  : pTotal;
        const keBefore = this._keBefore !== null ? this._keBefore : keTotal;
        const keAfter  = this._keAfter  !== null ? this._keAfter  : keTotal;

        const momentumError = Math.abs(pAfter - pBefore);
        const momentumRelativeError = Math.abs(pBefore) > 1e-10
            ? momentumError / Math.abs(pBefore)
            : momentumError;
        const energyLoss = keBefore - keAfter;
        const energyLossPct = keBefore > 1e-10 ? (energyLoss / keBefore) * 100 : 0;
        const energyRetained = keAfter;

        // Actual restitution (only valid after collision)
        let actualRestitution = null;
        if (this._preVelA !== null && this._postVelA !== null) {
            const denom = this._preVelA - this._preVelB;
            if (Math.abs(denom) > 1e-10) {
                actualRestitution = -(this._postVelA - this._postVelB) / denom;
                actualRestitution = Math.max(0, Math.min(1, actualRestitution));
            }
        }

        return {
            time: this._time,
            dt: this.config.dt,

            collisionType,
            restitution,

            phase: this._phase,

            objectA: {
                position: xA,
                velocity: vA,
                acceleration: 0, // no external forces in free-space
                mass: massA,
                radius: radiusA,
                momentum: pA,
                kineticEnergy: keA,
            },
            objectB: {
                position: xB,
                velocity: vB,
                acceleration: 0,
                mass: massB,
                radius: radiusB,
                momentum: pB,
                kineticEnergy: keB,
            },

            system: {
                distance: absDistance,
                separation,
                relativeVelocity: vA - vB,
                totalMomentum: pTotal,
                totalKineticEnergy: keTotal,

                // Pre/post collision conservation
                momentumBefore: pBefore,
                momentumAfter: pAfter,
                momentumError,
                momentumRelativeError,

                keBefore,
                keAfter,
                energyLoss: Math.max(0, energyLoss),
                energyLossPct: Math.max(0, energyLossPct),
                energyRetained,

                collisionOccurred: this._collisionOccurred,
                collisionTime: this._collisionTime,
                collisionPosition: this._collisionPosition,
                preVelA: this._preVelA,
                preVelB: this._preVelB,
                postVelA: this._postVelA,
                postVelB: this._postVelB,
                impulse: this._impulse,
                actualRestitution,

                // Overall initial state for Inspector
                initialMomentum: this._pInitial,
            },

            history: this._history.slice(-300),
            isValid: true,
        };
    }

    // ── Private Physics ────────────────────────────────────────────────────────

    _applyCollisionTypeRestitution() {
        const ct = this.config.collisionType;
        if (ct === COLLISION_TYPE.ELASTIC) {
            this.config = { ...this.config, restitution: 1.0 };
        } else if (ct === COLLISION_TYPE.PERFECTLY_INELASTIC) {
            this.config = { ...this.config, restitution: 0.0 };
        }
        // For INELASTIC: keep whatever restitution is set (between 0 and 1)
    }

    _step(dt) {
        this._time += dt;
        const { massA, massB, radiusA, radiusB } = this.config;
        const e = Math.max(0, Math.min(1, this.config.restitution));

        // If perfectly inelastic and stuck, move together
        if (this.config.collisionType === COLLISION_TYPE.PERFECTLY_INELASTIC
            && this._stickyVelocity !== null) {
            this._posA += this._stickyVelocity * dt;
            this._posB += this._stickyVelocity * dt;
            this._velA = this._stickyVelocity;
            this._velB = this._stickyVelocity;
            this._updatePhase();
            this._recordHistory();
            return;
        }

        // Integrate positions (simple Euler — collision is instantaneous impulse)
        this._posA += this._velA * dt;
        this._posB += this._velB * dt;

        // Collision detection
        const dist = this._posB - this._posA; // B is right of A in default setup
        const minDist = radiusA + radiusB;
        const approaching = (this._velA - this._velB) > 0; // A chasing B or B chasing A

        if (dist <= minDist && !this._inContact) {
            // ── COLLISION EVENT ──────────────────────────────────────────────
            this._inContact = true;
            this._collisionOccurred = true;
            this._collisionTime = this._time;
            this._collisionPosition = (this._posA + radiusA + this._posB - radiusB) / 2;

            // Capture pre-collision state
            this._preVelA = this._velA;
            this._preVelB = this._velB;
            this._pBefore = this._momentum(massA, this._velA) + this._momentum(massB, this._velB);
            this._keBefore = this._kineticEnergy(massA, this._velA) + this._kineticEnergy(massB, this._velB);

            // Calculate post-collision velocities
            let vA_new, vB_new;
            const M = massA + massB;

            if (this.config.collisionType === COLLISION_TYPE.ELASTIC) {
                // Exact 1D elastic formula
                vA_new = ((massA - massB) * this._velA + 2 * massB * this._velB) / M;
                vB_new = ((massB - massA) * this._velB + 2 * massA * this._velA) / M;
            } else if (this.config.collisionType === COLLISION_TYPE.PERFECTLY_INELASTIC) {
                // Objects couple — common velocity
                const vCommon = (massA * this._velA + massB * this._velB) / M;
                vA_new = vCommon;
                vB_new = vCommon;
                this._stickyVelocity = vCommon;
            } else {
                // General inelastic via COR + momentum conservation
                // v1' = (m1*v1 + m2*v2 + m2*e*(v2-v1)) / (m1+m2)
                // v2' = (m1*v1 + m2*v2 + m1*e*(v1-v2)) / (m1+m2)
                const dv = this._velA - this._velB;
                vA_new = (massA * this._velA + massB * this._velB - massB * e * dv) / M;
                vB_new = (massA * this._velA + massB * this._velB + massA * e * dv) / M;
            }

            // Apply post-collision velocities
            this._velA = vA_new;
            this._velB = vB_new;
            this._postVelA = vA_new;
            this._postVelB = vB_new;

            // Impulse: J = m1*(v1' - v1)  [equal and opposite for B]
            this._impulse = massA * (vA_new - this._preVelA);

            // Record post-collision momentum & KE
            this._pAfter = this._momentum(massA, this._velA) + this._momentum(massB, this._velB);
            this._keAfter = this._kineticEnergy(massA, this._velA) + this._kineticEnergy(massB, this._velB);

            // Overlap resolution: push objects apart so they don't stick
            const overlap = minDist - dist;
            if (overlap > 0) {
                const totalMass = massA + massB;
                const ratioA = massB / totalMass;
                const ratioB = massA / totalMass;
                this._posA -= ratioA * overlap;
                this._posB += ratioB * overlap;
            }

        } else if (dist > minDist && this._inContact) {
            // Objects have separated — release lock
            this._inContact = false;
        }

        this._updatePhase();
        this._recordHistory();
    }

    _updatePhase() {
        const { radiusA, radiusB } = this.config;
        const dist = Math.abs(this._posB - this._posA);
        const minDist = radiusA + radiusB;
        const relV = this._velA - this._velB;

        if (!this._collisionOccurred) {
            if (dist > minDist + 0.5 && relV > 0) {
                // Approaching
                this._phase = COLLISION_PHASE.APPROACH;
            } else if (dist <= minDist + 0.5) {
                this._phase = COLLISION_PHASE.CONTACT;
            } else {
                this._phase = COLLISION_PHASE.READY;
            }
        } else {
            if (dist <= minDist) {
                this._phase = COLLISION_PHASE.CONTACT;
            } else if (relV <= 0) {
                this._phase = COLLISION_PHASE.SEPARATING;
            } else {
                this._phase = COLLISION_PHASE.COMPLETED;
            }
        }
    }

    _recordHistory() {
        const { massA, massB } = this.config;
        const pA = this._momentum(massA, this._velA);
        const pB = this._momentum(massB, this._velB);
        this._history.push({
            t: this._time,
            xA: this._posA,
            xB: this._posB,
            vA: this._velA,
            vB: this._velB,
            pA,
            pB,
            pTotal: pA + pB,
            ke: this._kineticEnergy(massA, this._velA) + this._kineticEnergy(massB, this._velB),
        });
        if (this._history.length > this._historyMaxLen) {
            this._history.shift();
        }
    }

    _momentum(mass, velocity) {
        return mass * velocity;
    }

    _kineticEnergy(mass, velocity) {
        return 0.5 * mass * velocity * velocity;
    }
}
