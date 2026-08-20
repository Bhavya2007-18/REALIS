// ═══════════════════════════════════════════════════════════════════════════════
// REALIS ProjectilePhysicsSolver — Exact Kinematic Projectile Motion Engine
// Ideal projectile motion (no air resistance):
//   ax = 0,  ay = -g
//   vx(t) = v0 cos(θ)                       (constant)
//   vy(t) = v0 sin(θ) - g t
//   x(t)  = x0 + v0 cos(θ) t
//   y(t)  = y0 + v0 sin(θ) t - ½ g t²
// The physics engine is the single source of truth. The renderer only
// visualizes this state. A parallel semi-implicit-Euler integrator runs
// alongside the closed-form solution so numerical error is continuously
// validated against the analytical expectations.
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_PREVIEW_TIME = 5.0; // seconds — caps the predicted-trajectory display span
const EULER_SUBSTEP = 0.001;  // seconds — reference numerical integrator resolution

export class ProjectilePhysicsSolver {
    constructor(config = {}) {
        this.config = {
            v0: config.v0 ?? 20.0,            // initial speed  (m/s)
            angle: config.angle ?? 45.0,      // launch angle   (degrees above horizontal)
            x0: config.x0 ?? 0.0,             // launch x       (m)
            y0: config.y0 ?? 0.0,             // launch y       (m)
            yGround: config.yGround ?? 0.0,   // ground level   (m)
            gravity: config.gravity ?? 9.81,  // m/s² downward
            mass: config.mass ?? 1.0,         // kg (inertial only)
            radius: config.radius ?? 0.4,     // m
            dt: config.dt ?? 0.016,           // s
            timeScale: config.timeScale ?? 1.0,
            strobeInterval: config.strobeInterval ?? 0.25 // strobe marker every 0.25 s
        };

        this.reset();
    }

    reset() {
        const { v0, angle, x0, y0, yGround, gravity } = this.config;
        const theta = angle * Math.PI / 180;

        // Resolve initial velocity into horizontal and vertical components (Section 2)
        this.v0x = v0 * Math.cos(theta);
        this.v0y = v0 * Math.sin(theta);

        // Analytical expectations (computed once per configuration)
        this.analytics = this.computeAnalytics();

        this.time = 0.0;
        this.isLanded = false;
        this.isResting = false;
        this.apexReached = false;
        this.apexPoint = null;
        this.landingInfo = null;

        // Parallel reference integrator for numerical validation (Section 29)
        this.euler = { x: x0, y: y0, vx: this.v0x, vy: this.v0y };
        this.numericalError = { x: 0, y: 0, vx: 0, vy: 0 };

        // Predicted (theoretical) trajectory samples — dashed preview
        this.predictedPath = this.buildPredictedPath();

        // Actual traversed path + stroboscopic history
        this.actualPath = [];
        this.strobeHistory = [];
        this.lastStrobeTime = -Infinity;

        // Telemetry history buffers
        this.history = { time: [], x: [], y: [], vx: [], vy: [], speed: [] };

        // Ground-level special case: launched at or below ground with no upward velocity lands instantly
        if (gravity > 0 && y0 <= yGround && this.v0y <= 0) {
            this.time = 0;
            this.isLanded = true;
            this.isResting = true;
            this.x = x0;
            this.y = yGround;
            this.vx = this.v0x;
            this.vy = this.v0y;
            this.ax = 0;
            this.ay = -gravity;
            this.landingInfo = { time: 0, range: 0 };
            return;
        }

        this.updateStateFromTime(0);
        this.recordPoint();
    }

    updateConfig(newConfig = {}) {
        const needsReset = (
            (newConfig.v0 !== undefined && newConfig.v0 !== this.config.v0) ||
            (newConfig.angle !== undefined && newConfig.angle !== this.config.angle) ||
            (newConfig.x0 !== undefined && newConfig.x0 !== this.config.x0) ||
            (newConfig.y0 !== undefined && newConfig.y0 !== this.config.y0) ||
            (newConfig.yGround !== undefined && newConfig.yGround !== this.config.yGround) ||
            (newConfig.gravity !== undefined && newConfig.gravity !== this.config.gravity)
        );

        this.config = { ...this.config, ...newConfig };
        if (needsReset) this.reset();
    }

    // ── Analytical computations (Sections 3-12) ────────────────────────────────
    computeAnalytics() {
        const { v0, angle, y0, yGround, gravity } = this.config;
        const theta = angle * Math.PI / 180;
        const v0x = v0 * Math.cos(theta);
        const v0y = v0 * Math.sin(theta);
        const g = gravity;

        // Time of flight: solve y0 + v0y·t - ½g·t² = yGround  for positive t (Section 10)
        let timeOfFlight = 0;
        let maxHeight = y0;
        let timeToMaxHeight = 0;
        let range = 0;

        if (g > 0) {
            // ½g·t² - v0y·t - (y0 - yGround) = 0  =>  quadratic
            const a = 0.5 * g;
            const b = -v0y;
            const c = -(y0 - yGround);
            const disc = b * b - 4 * a * c;
            if (disc >= 0) {
                const t1 = (-b + Math.sqrt(disc)) / (2 * a);
                const t2 = (-b - Math.sqrt(disc)) / (2 * a);
                const positive = [t1, t2].filter(t => t > 1e-9);
                timeOfFlight = positive.length ? Math.min(...positive) : 0;
            }
            maxHeight = y0 + (v0y * v0y) / (2 * g);          // Section 9
            timeToMaxHeight = v0y > 0 ? v0y / g : 0;          // Section 9
            range = v0x * timeOfFlight;                        // Section 11
        } else {
            // Zero gravity: straight-line motion, never returns to ground
            timeOfFlight = Infinity;
            maxHeight = v0y > 0 ? Infinity : y0;
            timeToMaxHeight = v0y > 0 ? Infinity : 0;
            range = Infinity;
        }

        return {
            v0x,
            v0y,
            timeOfFlight: Number(timeOfFlight.toFixed(4)),
            maxHeight: Number.isFinite(maxHeight) ? Number(maxHeight.toFixed(4)) : null,
            timeToMaxHeight: Number.isFinite(timeToMaxHeight) ? Number(timeToMaxHeight.toFixed(4)) : null,
            range: Number.isFinite(range) ? Number(range.toFixed(4)) : null
        };
    }

    // Evaluate the exact closed-form position/velocity at physical time t
    updateStateFromTime(t) {
        const { x0, y0, gravity } = this.config;
        this.time = t;
        this.x = x0 + this.v0x * t;                  // Section 5
        this.y = y0 + this.v0y * t - 0.5 * gravity * t * t; // Section 5
        this.vx = this.v0x;                           // Section 6
        this.vy = this.v0y - gravity * t;             // Section 6
        this.ax = 0;                                  // Section 7
        this.ay = -gravity;                           // Section 7
    }

    buildPredictedPath() {
        const T = Math.min(
            Number.isFinite(this.analytics.timeOfFlight) ? this.analytics.timeOfFlight : MAX_PREVIEW_TIME,
            MAX_PREVIEW_TIME
        );
        const { x0, y0, v0x, v0y, gravity } = this.config;
        const points = [];
        const N = 96;
        for (let i = 0; i <= N; i++) {
            const t = (i / N) * T;
            const x = x0 + v0x * t;
            const y = y0 + v0y * t - 0.5 * gravity * t * t;
            points.push({ x, y });
        }
        return points;
    }

    // Advance the reference semi-implicit Euler integrator by dt (numerical validation)
    advanceEuler(dt) {
        const g = this.config.gravity;
        const e = this.euler;
        const steps = Math.max(1, Math.round(dt / EULER_SUBSTEP));
        const h = dt / steps;
        for (let i = 0; i < steps; i++) {
            e.vy += (-g) * h;       // semi-implicit: update velocity first
            e.vx += 0 * h;
            e.x += e.vx * h;
            e.y += e.vy * h;
        }
    }

    // ── Main simulation step (frame-rate independent: driven by real elapsed time) ──
    step(deltaSeconds) {
        if (this.isLanded || this.isResting) return this.getSnapshot();

        const { gravity, yGround, x0 } = this.config;
        const dt = Math.min(deltaSeconds || this.config.dt, 0.05) * this.config.timeScale;
        const newTime = this.time + dt;

        // Analytic y at the end of this step (retained for clarity/telemetry)
        const yAtNew = this.config.y0 + this.v0y * newTime - 0.5 * gravity * newTime * newTime;
        void yAtNew;

        // Ground collision: once physical time reaches the exact analytical landing
        // time T (positive root of the quadratic), land precisely at (x(T), yGround).
        if (gravity > 0 && this.analytics.timeOfFlight > 0 && newTime >= this.analytics.timeOfFlight) {
            const T = this.analytics.timeOfFlight;
            this.updateStateFromTime(T);
            this.y = yGround;
            this.isLanded = true;
            this.isResting = true;
            this.landingInfo = { time: T, range: this.x - x0 };
            // Sync reference integrator to the analytic landing state (error -> 0 at impact)
            this.euler = { x: this.x, y: this.y, vx: this.vx, vy: this.vy };
            this.recordPoint();
            return this.getSnapshot();
        }

        // Advance the reference Euler integrator for numerical validation
        this.advanceEuler(dt);

        // Update analytic state from physical time
        this.updateStateFromTime(newTime);

        // Apex detection: vy changes sign from positive to negative (Section 9)
        if (!this.apexReached && this.v0y > 0 && newTime >= this.analytics.timeToMaxHeight) {
            this.apexReached = true;
            const ta = this.analytics.timeToMaxHeight;
            this.apexPoint = {
                x: x0 + this.v0x * ta,
                y: this.config.y0 + this.v0y * ta - 0.5 * gravity * ta * ta
            };
        }

        // Numerical error vs analytical expectation (Section 29)
        this.numericalError = {
            x: Math.abs(this.x - this.euler.x),
            y: Math.abs(this.y - this.euler.y),
            vx: Math.abs(this.vx - this.euler.vx),
            vy: Math.abs(this.vy - this.euler.vy)
        };

        this.recordPoint();
        return this.getSnapshot();
    }

    recordPoint() {
        // Dense actual path (for the solid traversed-trail)
        this.actualPath.push({ x: this.x, y: this.y });
        if (this.actualPath.length > 600) this.actualPath.shift();

        // Stroboscopic markers every strobeInterval seconds
        if (this.time - this.lastStrobeTime >= this.config.strobeInterval) {
            this.strobeHistory.push({
                time: Number(this.time.toFixed(2)),
                x: Number(this.x.toFixed(2)),
                y: Number(this.y.toFixed(2))
            });
            this.lastStrobeTime = this.time;
        }

        // Telemetry history (bounded)
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (this.history.time.length === 0 || this.time - this.history.time[this.history.time.length - 1] >= 0.04) {
            this.history.time.push(Number(this.time.toFixed(2)));
            this.history.x.push(Number(this.x.toFixed(2)));
            this.history.y.push(Number(this.y.toFixed(2)));
            this.history.vx.push(Number(this.vx.toFixed(2)));
            this.history.vy.push(Number(this.vy.toFixed(2)));
            this.history.speed.push(Number(speed.toFixed(2)));
            if (this.history.time.length > 180) {
                Object.keys(this.history).forEach(k => this.history[k].shift());
            }
        }
    }

    // ── Complete state snapshot (single source of truth for the renderer) ──
    getSnapshot() {
        const { x0, y0, yGround } = this.config;
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const phi = Math.atan2(this.vy, this.vx) * 180 / Math.PI; // velocity direction (deg)
        const height = this.y - yGround;

        // Validation summary (Section 29)
        const validation = {
            expected: {
                timeOfFlight: this.analytics.timeOfFlight,
                range: this.analytics.range,
                maxHeight: this.analytics.maxHeight
            },
            actual: {
                timeOfFlight: this.isLanded ? this.landingInfo.time : Number(this.time.toFixed(4)),
                range: this.isLanded ? this.landingInfo.range : this.x - x0,
                maxHeight: this.apexReached ? this.apexPoint.y - yGround : height
            },
            error: { ...this.numericalError }
        };

        return {
            time: Number(this.time.toFixed(3)),
            x: Number(this.x.toFixed(3)),
            y: Number(this.y.toFixed(3)),
            vx: Number(this.vx.toFixed(3)),
            vy: Number(this.vy.toFixed(3)),
            speed: Number(speed.toFixed(3)),
            phi: Number(phi.toFixed(1)),
            ax: 0,
            ay: Number(this.ay.toFixed(2)),
            height: Number(height.toFixed(2)),
            distanceX: Number((this.x - x0).toFixed(2)),
            isLanded: this.isLanded,
            isResting: this.isResting,
            apexReached: this.apexReached,
            apexPoint: this.apexPoint,
            landingInfo: this.landingInfo,
            analytics: { ...this.analytics },
            validation,
            predictedPath: this.predictedPath,
            actualPath: this.actualPath,
            strobeHistory: this.strobeHistory,
            history: { ...this.history },
            launch: { x: x0, y: y0 },
            groundY: yGround,
            config: { ...this.config }
        };
    }
}

export default ProjectilePhysicsSolver;
