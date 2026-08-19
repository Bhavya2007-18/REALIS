// ═══════════════════════════════════════════════════════════════════════════════
// REALIS PendulumPhysicsSolver — Simple (Single) Pendulum Engine
// Exact nonlinear dynamics of a rigid rod pendulum:
//   θ'' = -(g / L) · sin θ            (no air resistance, no damping by default)
// The live engine integrates the full nonlinear ODE with semi-implicit Euler
// (8 substeps) so large-amplitude motion is captured faithfully. A second,
// higher-resolution reference integrator runs in parallel to continuously
// validate numerical convergence, and energy conservation is tracked via the
// PE ⇄ KE exchange of the bob.
// ═══════════════════════════════════════════════════════════════════════════════

const REFERENCE_SUBSTEP = 0.0005; // s — high-res reference integrator resolution
const ENGINE_SUBSTEPS = 8;        // live-engine substeps per integration step

// Complete elliptic integral of the first kind K(m) via the arithmetic-geometric
// mean — exact large-amplitude pendulum period: T = 4·√(L/g)·K(sin²(θ₀/2)).
function ellipticK(m) {
    if (m < 0) m = 0;
    if (m >= 1) return Infinity;
    let a = 1.0;
    let b = Math.sqrt(1 - m);
    let c = m;
    const tol = 1e-14;
    while (Math.abs(c) > tol) {
        const aNext = (a + b) / 2;
        c = (a - b) / 2;
        b = Math.sqrt(a * b);
        a = aNext;
    }
    return Math.PI / (2 * a);
}

export class PendulumPhysicsSolver {
    constructor(config = {}) {
        this.config = {
            length: config.length ?? 2.0,          // rod length L (m)
            angle0: config.angle0 ?? 60.0,         // initial release angle θ₀ (deg)
            gravity: config.gravity ?? 9.81,       // m/s² downward
            mass: config.mass ?? 2.0,              // bob mass m (kg)
            damping: config.damping ?? 0.0,        // pivot friction coefficient (1/s)
            radius: config.radius ?? 0.15,         // bob radius (m)
            dt: config.dt ?? 0.016,                // s
            timeScale: config.timeScale ?? 1.0,
            strobeInterval: config.strobeInterval ?? 0.25
        };

        this.reset();
    }

    reset() {
        const { angle0, length, gravity, mass } = this.config;
        this.theta0 = angle0 * Math.PI / 180;
        this.theta = this.theta0;
        this.omega = 0.0;       // angular velocity (rad/s)
        this.alpha = 0.0;       // angular acceleration (rad/s²)
        this.time = 0.0;
        this.swingCount = 0;    // number of passes through the vertical equilibrium
        this.prevTheta = this.theta;
        this.initialEnergy = mass * gravity * length * (1 - Math.cos(this.theta0));
        this.isResting = false;

        // Reference integrator (numerical validation of the live engine)
        this.ref = { theta: this.theta0, omega: 0.0 };

        // Analytic predictions (computed once per configuration)
        this.analytics = this.computeAnalytics();

        this.strobeHistory = [];
        this.lastStrobeTime = -Infinity;
        this.history = { time: [], theta: [], omega: [] };
        this.recordPoint();
    }

    updateConfig(newConfig = {}) {
        const needsReset = (
            (newConfig.length !== undefined && newConfig.length !== this.config.length) ||
            (newConfig.angle0 !== undefined && newConfig.angle0 !== this.config.angle0) ||
            (newConfig.gravity !== undefined && newConfig.gravity !== this.config.gravity) ||
            (newConfig.mass !== undefined && newConfig.mass !== this.config.mass)
        );

        this.config = { ...this.config, ...newConfig };
        if (needsReset) this.reset();
    }

    // ── Analytical predictions (small-angle + exact large-amplitude) ────────────
    computeAnalytics() {
        const { length, gravity, angle0 } = this.config;
        const g = gravity;
        const L = length;

        // Small-angle approximation: T ≈ 2π√(L/g)
        const smallAnglePeriod = g > 0 ? 2 * Math.PI * Math.sqrt(L / g) : Infinity;

        // Exact nonlinear period: T = 4√(L/g)·K(sin²(θ₀/2)) (elliptic integral)
        const exactPeriod = (g > 0 && Math.abs(angle0) < 180)
            ? 4 * Math.sqrt(L / g) * ellipticK(Math.pow(Math.sin((angle0 * Math.PI / 180) / 2), 2))
            : Infinity;

        // Max tangential speed at the bottom: v_max = √(2 g L (1 − cos θ₀))
        const speedAtBottom = g > 0
            ? Math.sqrt(2 * g * L * (1 - Math.cos(this.theta0)))
            : 0;

        // Small-angle angular-velocity amplitude: ω_max ≈ θ₀√(g/L)
        const omegaMaxSmallAngle = g > 0 ? this.theta0 * Math.sqrt(g / L) : 0;

        return {
            smallAnglePeriod: Number.isFinite(smallAnglePeriod) ? Number(smallAnglePeriod.toFixed(3)) : null,
            exactPeriod: Number.isFinite(exactPeriod) ? Number(exactPeriod.toFixed(3)) : null,
            speedAtBottom: Number(speedAtBottom.toFixed(3)),
            omegaMaxSmallAngle: Number(omegaMaxSmallAngle.toFixed(3)),
            initialEnergy: Number(this.initialEnergy.toFixed(3))
        };
    }

    // Advance the high-resolution reference integrator (numerical validation)
    advanceReference(dt) {
        const { gravity, length, damping } = this.config;
        const steps = Math.max(1, Math.round(dt / REFERENCE_SUBSTEP));
        const h = dt / steps;
        for (let i = 0; i < steps; i++) {
            const alpha = -(gravity / length) * Math.sin(this.ref.theta) - damping * this.ref.omega;
            this.ref.omega += alpha * h;
            this.ref.theta += this.ref.omega * h;
        }
    }

    // ── Main simulation step (frame-rate independent) ──
    step(deltaSeconds) {
        if (this.isResting) return this.getSnapshot();

        const { gravity, length, damping } = this.config;
        const dt = Math.min(deltaSeconds || this.config.dt, 0.05) * this.config.timeScale;
        const subDt = dt / ENGINE_SUBSTEPS;

        for (let s = 0; s < ENGINE_SUBSTEPS; s++) {
            // Nonlinear equation of motion: θ'' = -(g/L)·sin θ - damping·θ'
            this.alpha = -(gravity / length) * Math.sin(this.theta) - damping * this.omega;
            this.omega += this.alpha * subDt;
            this.theta += this.omega * subDt;
            this.time += subDt;

            // Resting threshold (only reachable with damping present)
            if (damping > 0 && Math.abs(this.omega) < 0.002 && Math.abs(this.theta) < 0.01) {
                this.omega = 0;
                this.alpha = 0;
                this.isResting = true;
                break;
            }
        }

        // Swing detection: count passes through the vertical equilibrium
        if (this.prevTheta <= 0 && this.theta > 0) this.swingCount++;
        if (this.prevTheta >= 0 && this.theta < 0) this.swingCount++;
        this.prevTheta = this.theta;

        // Advance reference integrator for validation
        this.advanceReference(dt);

        this.recordPoint();
        return this.getSnapshot();
    }

    recordPoint() {
        // Stroboscopic bob positions along the arc
        if (this.time - this.lastStrobeTime >= this.config.strobeInterval) {
            this.strobeHistory.push({
                time: Number(this.time.toFixed(2)),
                angle: Number(this.wrapAngle(this.theta)),
                x: Number((this.config.length * Math.sin(this.theta)).toFixed(2)),
                y: Number((-this.config.length * Math.cos(this.theta)).toFixed(2))
            });
            this.lastStrobeTime = this.time;
        }

        // Telemetry history (bounded)
        if (this.history.time.length === 0 || this.time - this.history.time[this.history.time.length - 1] >= 0.04) {
            this.history.time.push(Number(this.time.toFixed(2)));
            this.history.theta.push(Number(this.wrapAngle(this.theta)));
            this.history.omega.push(Number(this.omega.toFixed(3)));
            if (this.history.time.length > 180) {
                this.history.time.shift();
                this.history.theta.shift();
                this.history.omega.shift();
            }
        }
    }

    wrapAngle(rad) {
        let a = rad % (2 * Math.PI);
        if (a > Math.PI) a -= 2 * Math.PI;
        if (a < -Math.PI) a += 2 * Math.PI;
        return a;
    }

    // ── Complete state snapshot (single source of truth for the renderer) ──
    getSnapshot() {
        const { length, gravity, mass } = this.config;
        const thetaDeg = this.wrapAngle(this.theta) * 180 / Math.PI;

        // Bob position relative to pivot (pivot at origin)
        const x = length * Math.sin(this.theta);
        const y = -length * Math.cos(this.theta);

        // Tangential bob speed and rod tension (radial equation)
        const speed = Math.abs(this.omega) * length;
        const tension = mass * gravity * Math.cos(this.theta) + mass * length * this.omega * this.omega;

        // Energy: PE = m g L (1 − cos θ), KE = ½ m L² ω²
        const potential = mass * gravity * length * (1 - Math.cos(this.theta));
        const kinetic = 0.5 * mass * length * length * this.omega * this.omega;
        const total = Math.max(0, potential + kinetic);
        const driftPercent = this.initialEnergy > 0
            ? ((total - this.initialEnergy) / this.initialEnergy) * 100
            : 0;

        // Numerical validation: live engine vs high-res reference
        const angleErrorDeg = Math.abs(this.wrapAngle(this.theta) - this.wrapAngle(this.ref.theta)) * 180 / Math.PI;

        return {
            time: Number(this.time.toFixed(3)),
            angle: Number(thetaDeg.toFixed(2)),       // wrapped display angle (deg)
            theta: Number(this.theta.toFixed(4)),     // raw accumulated angle (rad)
            omega: Number(this.omega.toFixed(3)),     // angular velocity (rad/s)
            alpha: Number(this.alpha.toFixed(2)),     // angular acceleration (rad/s²)
            speed: Number(speed.toFixed(3)),          // tangential bob speed (m/s)
            tension: Number(tension.toFixed(2)),      // rod tension (N)
            x: Number(x.toFixed(2)),                  // bob x relative to pivot (m)
            y: Number(y.toFixed(2)),                  // bob y relative to pivot (m, negative down)
            swingCount: this.swingCount,
            isResting: this.isResting,
            energy: {
                potential: Number(Math.max(0, potential).toFixed(2)),
                kinetic: Number(Math.max(0, kinetic).toFixed(2)),
                total: Number(Math.max(0, total).toFixed(2)),
                initialTotal: Number(Math.max(0, this.initialEnergy).toFixed(2)),
                driftPercent: Number(driftPercent.toFixed(4))
            },
            analytics: { ...this.analytics },
            validation: {
                angleErrorDeg: Number(angleErrorDeg.toFixed(4)),
                energyDriftPercent: Number(driftPercent.toFixed(4))
            },
            strobeHistory: this.strobeHistory,
            history: { ...this.history },
            pivot: { x: 0, y: 0 },
            config: { ...this.config }
        };
    }
}

export default PendulumPhysicsSolver;
