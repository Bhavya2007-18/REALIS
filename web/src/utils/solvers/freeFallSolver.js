// ═══════════════════════════════════════════════════════════════════════════════
// REALIS FreeFallPhysicsSolver — High-Precision Free Fall & Multi-Bounce Engine
// Implements exact kinematic equations, Newtonian gravity, restitution damping,
// energy conservation tracking, and stroboscopic trajectory history.
// ═══════════════════════════════════════════════════════════════════════════════

export const PLANETARY_GRAVITY = {
    earth: { name: 'Earth', g: 9.81, color: '#38bdf8' },
    moon: { name: 'Moon', g: 1.62, color: '#94a3b8' },
    mars: { name: 'Mars', g: 3.71, color: '#f97316' },
    jupiter: { name: 'Jupiter', g: 24.79, color: '#eab308' },
    zero_g: { name: 'Zero-G', g: 0.0, color: '#a855f7' }
};

export class FreeFallPhysicsSolver {
    constructor(config = {}) {
        this.config = {
            initialHeight: config.initialHeight ?? 100.0,   // meters (y0)
            initialVelocity: config.initialVelocity ?? 0.0, // m/s (v0)
            gravity: config.gravity ?? 9.81,               // m/s^2 (downward)
            mass: config.mass ?? 10.0,                      // kg (m)
            restitution: config.restitution ?? 0.45,        // bounce coefficient (e)
            radius: config.radius ?? 1.5,                  // meters
            dt: config.dt ?? 0.016,                         // time step (seconds)
            timeScale: config.timeScale ?? 1.0,
            strobeInterval: config.strobeInterval ?? 0.25  // strobe snapshot every 0.25s
        };

        this.reset();
    }

    reset() {
        this.time = 0.0;
        this.height = this.config.initialHeight; // current altitude y(t) in meters
        this.velocity = this.config.initialVelocity; // m/s (negative = downward)
        this.acceleration = -this.config.gravity; // m/s^2
        this.distanceFallen = 0.0; // total absolute distance traversed
        this.bounceCount = 0;
        this.isResting = false;
        this.impactEvents = []; // timestamps of ground collisions
        this.lastStrobeTime = -1;
        this.strobeHistory = []; // stroboscopic snapshots: { time, height, velocity, distanceFallen }

        // Initial strobe snapshot at t = 0
        this.recordStrobeSnapshot();

        // History for live sparkline charting
        this.timeHistory = [0];
        this.heightHistory = [this.height];
        this.velocityHistory = [this.velocity];
        this.energyHistory = [this.getEnergy()];
    }

    updateConfig(newConfig = {}) {
        const needsReset = (
            newConfig.initialHeight !== undefined && newConfig.initialHeight !== this.config.initialHeight ||
            newConfig.gravity !== undefined && newConfig.gravity !== this.config.gravity ||
            newConfig.mass !== undefined && newConfig.mass !== this.config.mass ||
            newConfig.restitution !== undefined && newConfig.restitution !== this.config.restitution
        );

        this.config = { ...this.config, ...newConfig };
        if (needsReset) {
            this.reset();
        }
    }

    recordStrobeSnapshot() {
        this.strobeHistory.push({
            time: Number(this.time.toFixed(2)),
            height: Number(Math.max(0, this.height).toFixed(2)),
            velocity: Number(this.velocity.toFixed(2)),
            distanceFallen: Number(this.distanceFallen.toFixed(2))
        });
        this.lastStrobeTime = this.time;
    }

    getEnergy() {
        const h = Math.max(0, this.height);
        const pe = this.config.mass * this.config.gravity * h; // PE = mgh
        const ke = 0.5 * this.config.mass * (this.velocity * this.velocity); // KE = 1/2 m v^2
        const total = pe + ke;
        const initialTotal = this.config.mass * this.config.gravity * this.config.initialHeight;
        return {
            potential: Math.max(0, pe),
            kinetic: Math.max(0, ke),
            total: Math.max(0, total),
            initialTotal: Math.max(0, initialTotal),
            dissipated: Math.max(0, initialTotal - total)
        };
    }

    // Step the simulation forward by deltaSeconds (clamped for stability)
    step(deltaSeconds) {
        if (this.isResting) {
            return this.getSnapshot();
        }

        const effectiveDt = Math.min(deltaSeconds || this.config.dt, 0.05) * this.config.timeScale;
        const subSteps = 4;
        const subDt = effectiveDt / subSteps;

        for (let s = 0; s < subSteps; s++) {
            if (this.isResting) break;

            const g = this.config.gravity;
            const e = this.config.restitution;

            // Semi-Implicit Euler integration for exact Newtonian mechanics
            // 1. Velocity update: v(t + dt) = v(t) - g * dt
            this.velocity -= g * subDt;
            this.acceleration = -g;

            // 2. Position update: y(t + dt) = y(t) + v(t + dt) * dt
            const prevHeight = this.height;
            this.height += this.velocity * subDt;

            // Accumulate distance fallen
            if (this.velocity < 0) {
                this.distanceFallen += Math.abs(this.height - prevHeight);
            }

            // Ground Collision Detection & Resolution at y = 0
            if (this.height <= 0) {
                this.height = 0;

                // Impact velocity magnitude
                const impactSpeed = Math.abs(this.velocity);

                // Resting threshold check (micro-bounces below 0.15 m/s or < 0.02m height threshold)
                if (impactSpeed < 0.25 || (this.bounceCount > 10 && impactSpeed < 0.5)) {
                    this.velocity = 0;
                    this.acceleration = 0;
                    this.height = 0;
                    this.isResting = true;
                } else {
                    // Restitution bounce: v' = +e * |v|
                    this.velocity = e * impactSpeed;
                    this.bounceCount++;
                    this.impactEvents.push({
                        time: this.time,
                        impactSpeed: Number(impactSpeed.toFixed(2)),
                        bounceCount: this.bounceCount
                    });
                }
            }

            this.time += subDt;

            // Check if strobe snapshot is due
            if (this.time - this.lastStrobeTime >= this.config.strobeInterval) {
                this.recordStrobeSnapshot();
            }
        }

        // Maintain sparkline history buffer (max 120 points)
        if (this.timeHistory.length === 0 || this.time - this.timeHistory[this.timeHistory.length - 1] >= 0.04) {
            this.timeHistory.push(Number(this.time.toFixed(2)));
            this.heightHistory.push(Number(Math.max(0, this.height).toFixed(2)));
            this.velocityHistory.push(Number(this.velocity.toFixed(2)));
            this.energyHistory.push(this.getEnergy());

            if (this.timeHistory.length > 120) {
                this.timeHistory.shift();
                this.heightHistory.shift();
                this.velocityHistory.shift();
                this.energyHistory.shift();
            }
        }

        return this.getSnapshot();
    }

    // Get current complete state snapshot
    getSnapshot() {
        const energy = this.getEnergy();
        const initialH = this.config.initialHeight;
        const currentH = Math.max(0, this.height);
        const percentFallen = initialH > 0 ? Math.min(100, ((initialH - currentH) / initialH) * 100) : 100;

        // Theoretical analytical time to first ground impact: t1 = sqrt(2 * h0 / g)
        const theoreticalTimeOfFirstImpact = this.config.gravity > 0
            ? Math.sqrt((2 * this.config.initialHeight) / this.config.gravity)
            : Infinity;

        // Theoretical max impact velocity: v_impact = sqrt(2 * g * h0)
        const theoreticalImpactVelocity = this.config.gravity > 0
            ? Math.sqrt(2 * this.config.gravity * this.config.initialHeight)
            : 0;

        return {
            time: Number(this.time.toFixed(3)),
            height: Number(currentH.toFixed(2)),
            velocity: Number(this.velocity.toFixed(2)),
            acceleration: Number(this.acceleration.toFixed(2)),
            distanceFallen: Number(this.distanceFallen.toFixed(2)),
            percentFallen: Number(percentFallen.toFixed(1)),
            bounceCount: this.bounceCount,
            isResting: this.isResting,
            energy,
            strobeHistory: this.strobeHistory,
            impactEvents: this.impactEvents,
            theoretical: {
                firstImpactTime: Number(theoreticalTimeOfFirstImpact.toFixed(2)),
                impactVelocity: Number(theoreticalImpactVelocity.toFixed(2))
            },
            history: {
                time: this.timeHistory,
                height: this.heightHistory,
                velocity: this.velocityHistory,
                energy: this.energyHistory
            },
            config: { ...this.config }
        };
    }
}

export default FreeFallPhysicsSolver;
