// ═══════════════════════════════════════════════════════════════════════════════
// REALIS DoublePendulumPhysicsSolver — Coupled Nonlinear Double Pendulum Engine
// Exact equations of motion for a coupled double pendulum with RK4 integration.
// State: [θ₁, ω₁, θ₂, ω₂] where θ is angle from downward vertical (rad), ω is angular velocity (rad/s)
// ═══════════════════════════════════════════════════════════════════════════════

const REFERENCE_SUBSTEP = 0.00025; // high-res reference integrator resolution
const ENGINE_SUBSTEPS = 8;          // live-engine substeps per integration step

export class DoublePendulumPhysicsSolver {
    constructor(config = {}) {
        this.config = {
            // Physical parameters
            mass1: config.mass1 ?? 1.0,        // m₁ (kg)
            mass2: config.mass2 ?? 1.0,        // m₂ (kg)
            length1: config.length1 ?? 1.0,    // L₁ (m)
            length2: config.length2 ?? 1.0,    // L₂ (m)
            gravity: config.gravity ?? 9.81,   // g (m/s²)
            damping: config.damping ?? 0.0,    // pivot damping coefficient (1/s)

            // Initial conditions
            theta1_0: config.theta1_0 ?? 120.0,  // θ₁ initial angle (deg)
            theta2_0: config.theta2_0 ?? 120.0,  // θ₂ initial angle (deg)
            omega1_0: config.omega1_0 ?? 0.0,    // ω₁ initial angular velocity (rad/s)
            omega2_0: config.omega2_0 ?? 0.0,    // ω₂ initial angular velocity (rad/s)

            // Integration settings
            dt: config.dt ?? 0.016,                // base timestep (s)
            timeScale: config.timeScale ?? 1.0,    // simulation speed multiplier
            strobeInterval: config.strobeInterval ?? 0.1,

            // Visual parameters
            radius1: config.radius1 ?? 0.15,       // bob 1 radius (m)
            radius2: config.radius2 ?? 0.12,       // bob 2 radius (m)
        };

        // Dual system for chaos/sensitivity mode
        this.dualConfig = null;
        this.dualSolver = null;

        this.reset();
    }

    reset() {
        const { theta1_0, theta2_0, omega1_0, omega2_0, mass1, mass2, length1, length2, gravity } = this.config;

        // Primary system state
        this.theta1 = theta1_0 * Math.PI / 180;
        this.theta2 = theta2_0 * Math.PI / 180;
        this.omega1 = omega1_0;
        this.omega2 = omega2_0;
        this.alpha1 = 0.0;
        this.alpha2 = 0.0;
        this.time = 0.0;

        // Reference integrator (high-resolution validation)
        this.ref = { theta1: this.theta1, omega1: this.omega1, theta2: this.theta2, omega2: this.omega2 };

        // Initial energy (for conservation tracking)
        this.initialEnergy = this.computeEnergy(
            this.theta1, this.omega1, this.theta2, this.omega2,
            mass1, mass2, length1, length2, gravity
        ).total;

        // History & strobe
        this.strobeHistory = [];
        this.lastStrobeTime = -Infinity;
        this.history = { time: [], theta1: [], omega1: [], theta2: [], omega2: [], energy: [] };
        this.recordPoint();

        // Dual system (chaos mode) - if enabled
        if (this.dualConfig) {
            this.dualSolver.reset();
        }
    }

    // Enable chaos/sensitivity mode with a second system with slightly different initial conditions
    enableChaosMode(epsilon = 0.01) {
        this.dualConfig = { ...this.config };
        this.dualConfig.theta1_0 = this.config.theta1_0 + epsilon; // epsilon in degrees (e.g. 0.01°)
        this.dualSolver = new DoublePendulumPhysicsSolver(this.dualConfig);
    }

    disableChaosMode() {
        this.dualConfig = null;
        this.dualSolver = null;
    }

    updateConfig(newConfig = {}) {
        const needsReset = (
            (newConfig.mass1 !== undefined && newConfig.mass1 !== this.config.mass1) ||
            (newConfig.mass2 !== undefined && newConfig.mass2 !== this.config.mass2) ||
            (newConfig.length1 !== undefined && newConfig.length1 !== this.config.length1) ||
            (newConfig.length2 !== undefined && newConfig.length2 !== this.config.length2) ||
            (newConfig.gravity !== undefined && newConfig.gravity !== this.config.gravity) ||
            (newConfig.theta1_0 !== undefined && newConfig.theta1_0 !== this.config.theta1_0) ||
            (newConfig.theta2_0 !== undefined && newConfig.theta2_0 !== this.config.theta2_0) ||
            (newConfig.omega1_0 !== undefined && newConfig.omega1_0 !== this.config.omega1_0) ||
            (newConfig.omega2_0 !== undefined && newConfig.omega2_0 !== this.config.omega2_0) ||
            (newConfig.damping !== undefined && newConfig.damping !== this.config.damping)
        );

        this.config = { ...this.config, ...newConfig };
        if (needsReset) {
            this.reset();
            if (this.dualSolver) {
                this.dualSolver.updateConfig(this.dualConfig);
            }
        } else {
            // Update timeScale and other non-reset params immediately
            if (this.dualSolver) {
                this.dualSolver.config = { ...this.dualSolver.config, ...newConfig };
            }
        }
    }

    // ─── Equations of Motion ──────────────────────────────────────────────────
    // State vector: y = [θ₁, ω₁, θ₂, ω₂]
    // Derivative: y' = [ω₁, α₁, ω₂, α₂]
    // 
    // Δ = θ₁ - θ₂
    // α₁ = [-m₂L₁ω₁² sin(Δ)cos(Δ) + m₂g sin(θ₂)cos(Δ) - m₂L₂ω₂² sin(Δ) - (m₁+m₂)g sin(θ₁)] / [L₁(m₁+m₂ sin²(Δ))]
    // α₂ = [(m₁+m₂)(L₁ω₁² sin(Δ) + g sin(θ₁)cos(Δ) - g sin(θ₂) + L₂ω₂² sin(Δ)cos(Δ))] / [L₂(m₁+m₂ sin²(Δ))]
    computeDerivatives(state, { mass1, mass2, length1, length2, gravity, damping }) {
        const [theta1, omega1, theta2, omega2] = state;
        const delta = theta1 - theta2;

        const sinDelta = Math.sin(delta);
        const cosDelta = Math.cos(delta);
        const sinTheta1 = Math.sin(theta1);
        const sinTheta2 = Math.sin(theta2);
        const cosTheta1 = Math.cos(theta1);
        const cosTheta2 = Math.cos(theta2);

        const m1 = mass1;
        const m2 = mass2;
        const L1 = length1;
        const L2 = length2;
        const g = gravity;

        // Denominator (common)
        const denom1 = L1 * (m1 + m2 * sinDelta * sinDelta);
        const denom2 = L2 * (m1 + m2 * sinDelta * sinDelta);

        // α₁ numerator
        const alpha1_num = 
            -m2 * L1 * omega1 * omega1 * sinDelta * cosDelta
            + m2 * g * sinTheta2 * cosDelta
            - m2 * L2 * omega2 * omega2 * sinDelta
            - (m1 + m2) * g * sinTheta1;

        // α₂ numerator (derived from Lagrangian; the m₂L₂ω₂²·sinΔ·cosΔ term sits
        // OUTSIDE the (m₁+m₂) factor — see derivation in default export docs)
        const alpha2_num =
            (m1 + m2) * (
                L1 * omega1 * omega1 * sinDelta
                + g * sinTheta1 * cosDelta
                - g * sinTheta2
            )
            + m2 * L2 * omega2 * omega2 * sinDelta * cosDelta;

        // Angular accelerations
        let alpha1 = alpha1_num / denom1;
        let alpha2 = alpha2_num / denom2;

        // Add damping
        alpha1 -= damping * omega1;
        alpha2 -= damping * omega2;

        return [omega1, alpha1, omega2, alpha2];
    }

    // ─── RK4 Integration ──────────────────────────────────────────────────────
    rk4Step(state, dt, params) {
        const k1 = this.computeDerivatives(state, params);
        
        const state2 = state.map((s, i) => s + 0.5 * dt * k1[i]);
        const k2 = this.computeDerivatives(state2, params);

        const state3 = state.map((s, i) => s + 0.5 * dt * k2[i]);
        const k3 = this.computeDerivatives(state3, params);

        const state4 = state.map((s, i) => s + dt * k3[i]);
        const k4 = this.computeDerivatives(state4, params);

        return state.map((s, i) => s + (dt / 6) * (k1[i] + 2*k2[i] + 2*k3[i] + k4[i]));
    }

    // ─── Energy Computation ───────────────────────────────────────────────────
    // PE = -m₁gL₁cos(θ₁) - m₂g[L₁cos(θ₁) + L₂cos(θ₂)]
    // KE = ½(m₁+m₂)L₁²ω₁² + ½m₂L₂²ω₂² + m₂L₁L₂ω₁ω₂cos(θ₁-θ₂)
    computeEnergy(theta1, omega1, theta2, omega2, mass1, mass2, length1, length2, gravity) {
        const cosTheta1 = Math.cos(theta1);
        const cosTheta2 = Math.cos(theta2);
        const cosDelta = Math.cos(theta1 - theta2);

        const L1 = length1;
        const L2 = length2;
        const m1 = mass1;
        const m2 = mass2;
        const g = gravity;

        // Potential energy (zero at pivot, negative downward)
        const potential = -m1 * g * L1 * cosTheta1 - m2 * g * (L1 * cosTheta1 + L2 * cosTheta2);

        // Kinetic energy
        const kinetic = 
            0.5 * (m1 + m2) * L1 * L1 * omega1 * omega1
            + 0.5 * m2 * L2 * L2 * omega2 * omega2
            + m2 * L1 * L2 * omega1 * omega2 * cosDelta;

        return { kinetic, potential, total: kinetic + potential };
    }

    // ─── Position Computation ─────────────────────────────────────────────────
    // x₁ = L₁ sin(θ₁), y₁ = -L₁ cos(θ₁)
    // x₂ = L₁ sin(θ₁) + L₂ sin(θ₂), y₂ = -L₁ cos(θ₁) - L₂ cos(θ₂)
    computePositions(theta1, theta2, length1, length2) {
        const x1 = length1 * Math.sin(theta1);
        const y1 = -length1 * Math.cos(theta1);
        const x2 = x1 + length2 * Math.sin(theta2);
        const y2 = y1 - length2 * Math.cos(theta2);
        return { x1, y1, x2, y2 };
    }

    // ─── Velocity Computation ─────────────────────────────────────────────────
    // v₁ = L₁ ω₁ (tangential)
    // v₂ = v₁ + L₂ ω₂ (tangential relative to mass 1)
    // Actual velocity vectors:
    // vx₁ = L₁ ω₁ cos(θ₁), vy₁ = L₁ ω₁ sin(θ₁)
    // vx₂ = vx₁ + L₂ ω₂ cos(θ₂), vy₂ = vy₁ + L₂ ω₂ sin(θ₂)
    computeVelocities(theta1, omega1, theta2, omega2, length1, length2) {
        const vx1 = length1 * omega1 * Math.cos(theta1);
        const vy1 = length1 * omega1 * Math.sin(theta1);
        const vx2 = vx1 + length2 * omega2 * Math.cos(theta2);
        const vy2 = vy1 + length2 * omega2 * Math.sin(theta2);
        return { vx1, vy1, vx2, vy2 };
    }

    // ─── Tension Computation ──────────────────────────────────────────────────
    // Tension in rod 1 (between pivot and mass 1)
    // Tension in rod 2 (between mass 1 and mass 2)
    computeTensions(theta1, omega1, theta2, omega2, alpha1, alpha2, mass1, mass2, length1, length2, gravity) {
        // Radial forces on mass 1: T1 - T2*cos(Δ) - m1*g*cos(θ₁) = m1*L1*ω₁²
        // Radial forces on mass 2: T2 - m2*g*cos(θ₂) = m2*L2*ω₂²
        const cosDelta = Math.cos(theta1 - theta2);
        const cosTheta1 = Math.cos(theta1);
        const cosTheta2 = Math.cos(theta2);

        const T2 = mass2 * (gravity * cosTheta2 + length2 * omega2 * omega2);
        const T1 = mass1 * (gravity * cosTheta1 + length1 * omega1 * omega1) + T2 * cosDelta;

        return { tension1: T1, tension2: T2 };
    }

    // ─── Reference Integrator (Validation) ────────────────────────────────────
    advanceReference(dt) {
        const { gravity, length1, length2, mass1, mass2, damping } = this.config;
        const steps = Math.max(1, Math.round(dt / REFERENCE_SUBSTEP));
        const h = dt / steps;
        for (let i = 0; i < steps; i++) {
            const derivs = this.computeDerivatives(
                [this.ref.theta1, this.ref.omega1, this.ref.theta2, this.ref.omega2],
                { mass1, mass2, length1, length2, gravity, damping }
            );
            this.ref.omega1 += derivs[1] * h;
            this.ref.theta1 += derivs[0] * h;
            this.ref.omega2 += derivs[3] * h;
            this.ref.theta2 += derivs[2] * h;
        }
    }

    // ─── Main Simulation Step ─────────────────────────────────────────────────
    step(deltaSeconds) {
        const { gravity, length1, length2, mass1, mass2, damping, timeScale } = this.config;
        const dt = Math.min(deltaSeconds || this.config.dt, 0.05) * timeScale;
        const subDt = dt / ENGINE_SUBSTEPS;

        for (let s = 0; s < ENGINE_SUBSTEPS; s++) {
            const state = [this.theta1, this.omega1, this.theta2, this.omega2];
            const params = { mass1, mass2, length1, length2, gravity, damping };
            const newState = this.rk4Step(state, subDt, params);

            this.theta1 = newState[0];
            this.omega1 = newState[1];
            this.theta2 = newState[2];
            this.omega2 = newState[3];
            this.time += subDt;

            // Recompute accelerations for snapshot
            const derivs = this.computeDerivatives([this.theta1, this.omega1, this.theta2, this.omega2], params);
            this.alpha1 = derivs[1];
            this.alpha2 = derivs[3];
        }

        // Advance reference integrator for validation
        this.advanceReference(dt);

        // Advance dual system if chaos mode enabled
        if (this.dualSolver) {
            this.dualSolver.step(deltaSeconds);
        }

        this.recordPoint();
        return this.getSnapshot();
    }

    recordPoint() {
        // Stroboscopic positions
        if (this.time - this.lastStrobeTime >= this.config.strobeInterval) {
            const { x1, y1, x2, y2 } = this.computePositions(this.theta1, this.theta2, this.config.length1, this.config.length2);
            this.strobeHistory.push({
                time: Number(this.time.toFixed(2)),
                theta1: Number(this.wrapAngle(this.theta1).toFixed(3)),
                theta2: Number(this.wrapAngle(this.theta2).toFixed(3)),
                x1: Number(x1.toFixed(3)),
                y1: Number(y1.toFixed(3)),
                x2: Number(x2.toFixed(3)),
                y2: Number(y2.toFixed(3))
            });
            this.lastStrobeTime = this.time;
        }

        // Telemetry history (bounded)
        if (this.history.time.length === 0 || this.time - this.history.time[this.history.time.length - 1] >= 0.04) {
            this.history.time.push(Number(this.time.toFixed(2)));
            this.history.theta1.push(Number(this.wrapAngle(this.theta1).toFixed(3)));
            this.history.omega1.push(Number(this.omega1.toFixed(3)));
            this.history.theta2.push(Number(this.wrapAngle(this.theta2).toFixed(3)));
            this.history.omega2.push(Number(this.omega2.toFixed(3)));
            const energy = this.computeEnergy(this.theta1, this.omega1, this.theta2, this.omega2,
                this.config.mass1, this.config.mass2, this.config.length1, this.config.length2, this.config.gravity);
            this.history.energy.push(Number(energy.total.toFixed(3)));
            if (this.history.time.length > 200) {
                this.history.time.shift();
                this.history.theta1.shift();
                this.history.omega1.shift();
                this.history.theta2.shift();
                this.history.omega2.shift();
                this.history.energy.shift();
            }
        }

        // Dual system history
        if (this.dualSolver) {
            this.dualSolver.recordPoint();
        }
    }

    wrapAngle(rad) {
        let a = rad % (2 * Math.PI);
        if (a > Math.PI) a -= 2 * Math.PI;
        if (a < -Math.PI) a += 2 * Math.PI;
        return a;
    }

    // ─── Complete State Snapshot ──────────────────────────────────────────────
    getSnapshot() {
        const { mass1, mass2, length1, length2, gravity, damping, radius1, radius2 } = this.config;
        const theta1Deg = this.wrapAngle(this.theta1) * 180 / Math.PI;
        const theta2Deg = this.wrapAngle(this.theta2) * 180 / Math.PI;

        // Positions
        const { x1, y1, x2, y2 } = this.computePositions(this.theta1, this.theta2, length1, length2);

        // Velocities
        const { vx1, vy1, vx2, vy2 } = this.computeVelocities(this.theta1, this.omega1, this.theta2, this.omega2, length1, length2);
        const speed1 = Math.sqrt(vx1 * vx1 + vy1 * vy1);
        const speed2 = Math.sqrt(vx2 * vx2 + vy2 * vy2);

        // Tensions
        const { tension1, tension2 } = this.computeTensions(this.theta1, this.omega1, this.theta2, this.omega2, this.alpha1, this.alpha2, mass1, mass2, length1, length2, gravity);

        // Energy
        const energy = this.computeEnergy(this.theta1, this.omega1, this.theta2, this.omega2, mass1, mass2, length1, length2, gravity);
        const potential = energy.potential;
        const kinetic = energy.kinetic;
        const total = energy.total;
        const driftPercent = this.initialEnergy !== 0 ? ((total - this.initialEnergy) / this.initialEnergy) * 100 : 0;

        // Numerical validation: live engine vs high-res reference
        const angleError1 = Math.abs(this.wrapAngle(this.theta1) - this.wrapAngle(this.ref.theta1)) * 180 / Math.PI;
        const angleError2 = Math.abs(this.wrapAngle(this.theta2) - this.wrapAngle(this.ref.theta2)) * 180 / Math.PI;

        // Phase space data
        const phaseSpace1 = { theta: this.wrapAngle(this.theta1), omega: this.omega1 };
        const phaseSpace2 = { theta: this.wrapAngle(this.theta2), omega: this.omega2 };

        // Dual system snapshot (for chaos mode)
        let dualSnapshot = null;
        if (this.dualSolver) {
            dualSnapshot = this.dualSolver.getSnapshot();
        }

        return {
            time: Number(this.time.toFixed(3)),
            angle1: Number(theta1Deg.toFixed(2)),
            angle2: Number(theta2Deg.toFixed(2)),
            theta1: Number(this.theta1.toFixed(4)),
            theta2: Number(this.theta2.toFixed(4)),
            omega1: Number(this.omega1.toFixed(3)),
            omega2: Number(this.omega2.toFixed(3)),
            alpha1: Number(this.alpha1.toFixed(2)),
            alpha2: Number(this.alpha2.toFixed(2)),
            speed1: Number(speed1.toFixed(3)),
            speed2: Number(speed2.toFixed(3)),
            tension1: Number(tension1.toFixed(2)),
            tension2: Number(tension2.toFixed(2)),
            x1: Number(x1.toFixed(2)),
            y1: Number(y1.toFixed(2)),
            x2: Number(x2.toFixed(2)),
            y2: Number(y2.toFixed(2)),
            vx1: Number(vx1.toFixed(3)),
            vy1: Number(vy1.toFixed(3)),
            vx2: Number(vx2.toFixed(3)),
            vy2: Number(vy2.toFixed(3)),
            energy: {
                potential: Number(Math.max(-1e6, Math.min(1e6, potential)).toFixed(2)),
                kinetic: Number(Math.max(0, kinetic).toFixed(2)),
                total: Number(Math.max(-1e6, Math.min(1e6, total)).toFixed(2)),
                initialTotal: Number(Math.max(-1e6, Math.min(1e6, this.initialEnergy)).toFixed(2)),
                driftPercent: Number(driftPercent.toFixed(4))
            },
            validation: {
                angleError1Deg: Number(angleError1.toFixed(4)),
                angleError2Deg: Number(angleError2.toFixed(4)),
                energyDriftPercent: Number(driftPercent.toFixed(4))
            },
            phaseSpace1,
            phaseSpace2,
            strobeHistory: this.strobeHistory,
            history: { ...this.history },
            pivot: { x: 0, y: 0 },
            config: { ...this.config },
            chaosMode: !!this.dualSolver,
            dual: dualSnapshot
        };
    }
}

export default DoublePendulumPhysicsSolver;