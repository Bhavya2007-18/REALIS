// ═══════════════════════════════════════════════════════════════════════════════
// REALIS SpringOscillatorPhysicsSolver — Vertical Spring-Mass Engine (RK4)
// Physics (mass m, spring constant k, gravity g, natural length L₀, damping c):
//   Let y = position of the mass CENTER measured downward from the fixed support (m).
//   Static equilibrium:            y_eq = L₀ + mg/k          (x = 0)
//   Displacement from equilibrium: x = y - y_eq
//   Equation of motion:            m·x'' + c·x' + k·x = F₀·sin(ω_d·t)  ⇒  a = -(k/m)x - (c/m)v + (F₀/m)·sin(ω_d·t)
//   Natural angular frequency:     ω₀ = √(k/m)    Period: T = 2π√(m/k)
//   Damping ratio:                 ζ = c / (2√(mk))
// State: [x, v] — RK4 integration, fixed timestep, force term is time-aware.
// The engine ALSO integrates an analytical twin x(t) = A·cos(ω₀t + φ) for validation ONLY.
// ═══════════════════════════════════════════════════════════════════════════════

const ENGINE_SUBSTEPS = 4;         // RK4 substeps per integration step
const HISTORY_CAP = 20000;         // strobe history ring cap

export class SpringOscillatorPhysicsSolver {
    constructor(config = {}) {
        this.config = {
            // Physical parameters
            mass: config.mass ?? 1.0,                   // m (kg)
            springConstant: config.springConstant ?? 10.0, // k (N/m)
            naturalLength: config.naturalLength ?? 1.0,    // L₀ (m) — un-stretched spring length
            gravity: config.gravity ?? 9.81,               // g (m/s²)
            damping: config.damping ?? 0.0,                // c (N·s/m)

            // Forced oscillation (m·x'' + c·x' + k·x = F₀·sin(ω_d·t))
            forced: config.forced ?? false,
            forceAmplitude: config.forceAmplitude ?? 2.0,  // F₀ (N)
            drivingFrequency: config.drivingFrequency ?? 0.0, // ω_d (rad/s)

            // Initial conditions (displacement from equilibrium, velocity)
            x0: config.x0 ?? 0.2,                        // x₀ (m)
            v0: config.v0 ?? 0.0,                        // v₀ (m/s)

            // Integration settings
            dt: config.dt ?? 0.005,                      // fixed physics timestep (s)
            timeScale: config.timeScale ?? 1.0,          // speed multiplier (loop-level, kept here for parity)
            strobeInterval: config.strobeInterval ?? 0.05,

            // Visual parameters (rendering-only)
            blockHeight: config.blockHeight ?? 0.20,     // mass block height (m)
            blockWidth: config.blockWidth ?? 0.42,       // mass block width (m)
        };
        this.reset();
    }

    // ─── Derived physical constants ───────────────────────────────────────────
    get y_eq() {
        const { mass, gravity, springConstant, naturalLength } = this.config;
        return naturalLength + (mass * gravity) / springConstant;   // equilibrium y (mass center), m
    }
    get omega0() { return Math.sqrt(this.config.springConstant / this.config.mass); }   // ω₀ = √(k/m), rad/s
    get period() { return 2 * Math.PI * Math.sqrt(this.config.mass / this.config.springConstant); }   // T (s)
    get naturalFrequency() { return this.omega0 / (2 * Math.PI); }                        // f₀ (Hz)
    get dampingRatio() {
        const { mass, springConstant, damping } = this.config;
        return damping / (2 * Math.sqrt(mass * springConstant));   // ζ
    }
    get dampingClass() {
        const z = this.dampingRatio;
        if (z < 1 - 1e-9) return 'Underdamped';
        if (z > 1 + 1e-9) return 'Overdamped';
        return 'Critically damped';
    }
    get amplitudeEstimate() {
        // Free-response amplitude from initial conditions: A₀ = √(x₀² + (v₀/ω₀)²)
        const w = this.omega0;
        return Math.hypot(this.config.x0, this.config.v0 / w);
    }
    get staticDeflection() {
        // Equilibrium spring stretch caused by the weight: Δy_eq = mg/k
        return (this.config.mass * this.config.gravity) / this.config.springConstant;
    }

    // ─── State reset ──────────────────────────────────────────────────────────
    reset() {
        const { x0, v0 } = this.config;
        this.time = 0.0;
        this.x = x0;                       // displacement from equilibrium (m)
        this.v = v0;                       // velocity (m/s)
        this.a = this.computeAcceleration([x0, v0], this.time);

        // Analytical twin (validation only) — x(t) = A·cos(ω₀t + φ)
        this.analytical = this.computeAnalytical(0);

        // Energy of the initial state (conservation reference)
        this.initialEnergy = this.computeEnergy().total;
        this.maxAbsError = 0;

        // History & strobe
        this.strobeHistory = [];
        this.lastStrobeTime = -Infinity;
        this.history = { t: [], x: [], v: [], a: [], ke: [], peSpring: [], peGravity: [], total: [], fSpring: [], fNet: [] , l: [] };
        this.recordPoint();
    }

    // ─── Equations of Motion ──────────────────────────────────────────────────
    // a(x, v, t) = -(k/m)·x - (c/m)·v + (F₀/m)·sin(ω_d·t)
    computeAcceleration(state, t = this.time) {
        const { mass, springConstant, damping, forced, forceAmplitude, drivingFrequency } = this.config;
        const [x, v] = state;
        let a = -(springConstant / mass) * x - (damping / mass) * v;
        if (forced && forceAmplitude !== 0) {
            a += (forceAmplitude / mass) * Math.sin(drivingFrequency * t);
        }
        return a;
    }

    derivs(state, t) {
        return [state[1], this.computeAcceleration(state, t)];
    }

    // ─── RK4 Integration (time-aware forcing term) ────────────────────────────
    rk4Step(state, t, dt) {
        const k1 = this.derivs(state, t);
        const s2 = [state[0] + 0.5 * dt * k1[0], state[1] + 0.5 * dt * k1[1]];
        const k2 = this.derivs(s2, t + 0.5 * dt);
        const s3 = [state[0] + 0.5 * dt * k2[0], state[1] + 0.5 * dt * k2[1]];
        const k3 = this.derivs(s3, t + 0.5 * dt);
        const s4 = [state[0] + dt * k3[0], state[1] + dt * k3[1]];
        const k4 = this.derivs(s4, t + dt);
        return [
            state[0] + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
            state[1] + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])
        ];
    }

    // Actually advance the simulation by deltaSeconds (rendering-time delta).
    step(deltaSeconds) {
        const dt = Math.min(deltaSeconds || this.config.dt, 0.05) * this.config.timeScale;
        const subDt = dt / ENGINE_SUBSTEPS;
        let state = [this.x, this.v];
        let t = this.time;
        for (let i = 0; i < ENGINE_SUBSTEPS; i++) {
            state = this.rk4Step(state, t, subDt);
            t += subDt;
        }
        this.x = state[0];
        this.v = state[1];
        this.time = t;
        this.a = this.computeAcceleration([this.x, this.v], this.time);

        // Analytical twin (validation ONLY — never used for motion)
        this.analytical = this.computeAnalytical(this.time);
        this.maxAbsError = Math.max(this.maxAbsError, Math.abs(this.x - this.analytical.x));

        // Strobe record
        if (this.time - this.lastStrobeTime >= this.config.strobeInterval) {
            this.recordPoint();
        }
    }

    recordPoint() {
        const e = this.computeEnergy();
        const forces = this.computeForces();
        this.strobeHistory.push({
            time: this.time, x: this.x, v: this.v, a: this.a,
            y: this.yValue, length: this.springLength,
            ke: e.kinetic, peSpring: e.peSpring, peGravity: e.peGravity, total: e.total,
            fSpring: forces.fSpring, fGravity: forces.fGravity, fNet: forces.fNet
        });
        if (this.strobeHistory.length > HISTORY_CAP) this.strobeHistory.splice(0, this.strobeHistory.length - HISTORY_CAP);
        this.lastStrobeTime = this.time;
        // compact parallel history for graphs (also capped)
        const h = this.history;
        h.t.push(this.time); h.x.push(this.x); h.v.push(this.v); h.a.push(this.a);
        h.ke.push(e.kinetic); h.peSpring.push(e.peSpring); h.peGravity.push(e.peGravity); h.total.push(e.total);
        h.fSpring.push(forces.fSpring); h.fNet.push(forces.fNet); h.l.push(this.springLength);
        if (h.t.length > HISTORY_CAP) {
            const cut = h.t.length - HISTORY_CAP;
            Object.keys(h).forEach(k => h[k].splice(0, cut));
        }
    }

    // ─── Derived kinematic quantities ─────────────────────────────────────────
    // y = position of the mass CENTER, measured downward from the support (m)
    get yValue() { return this.y_eq + this.x; }
    get springLength() { return this.yValue - this.config.blockHeight / 2; } // visible spring length (mass top → support)
    get deltaL() { return this.x + this.staticDeflection; }                 // ΔL = extension beyond natural length (m)

    // ─── Forces (actual magnitudes, N) ────────────────────────────────────────
    computeForces() {
        const m = this.config.mass, k = this.config.springConstant, c = this.config.damping;
        const fGravity = m * this.config.gravity;          // F_g = mg  (downward)
        const fSpring = k * this.x;                        // F_s = -kx (restoring; signed toward equilibrium)
        const fDamp = c * this.v;                          // F_d = -cv
        const driving = this.config.forced && this.config.forceAmplitude !== 0
            ? this.config.forceAmplitude * Math.sin(this.config.drivingFrequency * this.time)
            : 0;
        const fNet = -(fSpring + fDamp) + driving;         // F_net = m·a (downward-positive convention kept)
        return { fGravity, fSpring, fDamp, fNet: Math.abs(fNet), fNetSigned: fNet };
    }

    // ─── Energy ───────────────────────────────────────────────────────────────
    computeEnergy() {
        const m = this.config.mass, k = this.config.springConstant, g = this.config.gravity;
        const v = this.v;
        const dL = this.deltaL;
        const ke = 0.5 * m * v * v;                        // KE = ½mv²
        const peSpring = 0.5 * k * dL * dL;                // PE_spring = ½k(ΔL)²   (ΔL = extension)
        const peGravity = -m * g * this.x;                 // PE_gravity = mgh with h measured from equilibrium
        const total = ke + peSpring + peGravity;           // conserved (ideal) to the const ½m²g²/k offset
        return { kinetic: ke, peSpring, peGravity, total };
    }

    // ─── Analytical solution (validation only) ────────────────────────────────
    // x(t) = A·cos(ω₀t + φ)   with  A = √(x₀² + (v₀/ω₀)²),  φ = atan2(-v₀/ω₀, x₀)
    computeAnalytical(t) {
        const w = this.omega0;
        const x0 = this.config.x0, v0 = this.config.v0;
        const A = Math.hypot(x0, v0 / w);
        const phi = Math.atan2(-v0 / w, x0);
        const xa = A * Math.cos(w * t + phi);
        const va = -A * w * Math.sin(w * t + phi);
        const aa = -A * w * w * Math.cos(w * t + phi);
        return { x: xa, v: va, a: aa, A, phi };
    }

    // ─── Resonance sweep (real simulation, on demand) ────────────────────────
    // For ω_d in [fMin..fMax], integrate a scratch driven oscillator until near
    // steady state, then measure the plateau amplitude. Returns curve + peak+index.
    sweepResonance(fMinW, fMaxW, samples = 80) {
        const w0 = this.omega0;
        const base = { ...this.config, forced: true, x0: 0, v0: 0, timeScale: 1.0 };
        const points = [];
        let peak = { w: w0, amp: 0, idx: 0 };
        for (let i = 0; i <= samples; i++) {
            const w = fMinW + (fMaxW - fMinW) * (i / samples);
            const scratch = new SpringOscillatorPhysicsSolver({ ...base, drivingFrequency: w, dt: 0.005 });
            // warm up long enough for transients to decay (damped) or a stable window (unforced peak ~ ω₀)
            const settle = Math.max(10 / (this.dampingRatio * w0 + 1e-9), 6 * this.period, 8 * (2 * Math.PI) / Math.max(w, 0.01)) + this.period;
            const steps = Math.round(settle / 0.005);
            for (let s = 0; s < steps; s++) scratch.step(0.005);
            // measure amplitude over the final 30% window
            const lookback = Math.max(8, Math.round(steps * 0.3));
            let mn = Infinity, mx = -Infinity;
            for (let s = steps - lookback; s < scratch.strobeHistory.length; s++) {
                const xv = scratch.strobeHistory[s].x;
                if (xv < mn) mn = xv;
                if (xv > mx) mx = xv;
            }
            if (!isFinite(mn) || !isFinite(mx)) continue;
            const amp = (mx - mn) / 2;
            points.push({ w, amp, periodMs: 2 * Math.PI / w });
            if (amp > peak.amp) peak = { w, amp, idx: i };
        }
        return { points, peak, w0 };
    }

    // ─── Snapshot for the renderer / telemetry ────────────────────────────────
    getSnapshot() {
        const e = this.computeEnergy();
        const f = this.computeForces();
        const errPct = this.initialEnergy !== 0
            ? Math.abs((e.total - this.initialEnergy) / this.initialEnergy) * 100
            : 0;
        return {
            time: Number(this.time.toFixed(3)),
            x: Number(this.x.toFixed(4)),                       // displacement from equilibrium (m)
            v: Number(this.v.toFixed(4)),                       // velocity (m/s)
            a: Number(this.a.toFixed(4)),                       // acceleration (m/s²)
            y: Number(this.yValue.toFixed(4)),                  // mass center below support (m)
            yEq: Number(this.y_eq.toFixed(4)),                  // equilibrium y (m)
            springLength: Number(this.springLength.toFixed(4)), // visible spring length (m)
            deltaL: Number(this.deltaL.toFixed(4)),             // extension (m)
            omega0: Number(this.omega0.toFixed(4)),             // ω₀ = √(k/m) (rad/s)
            naturalFrequency: Number(this.naturalFrequency.toFixed(4)), // f₀ (Hz)
            period: Number(this.period.toFixed(4)),             // T (s)
            damping: this.config.damping,                       // c (N·s/m)
            dampingRatio: Number(this.dampingRatio.toFixed(4)), // ζ
            dampingClass: this.dampingClass,
            fGravity: Number(f.fGravity.toFixed(3)),            // mg (N)
            fSpring: Number(f.fSpring.toFixed(3)),              // -kx (N)
            fDamping: Number(f.fDamp.toFixed(3)),
            fNet: Number(f.fNet.toFixed(3)),                    // |F_net| = |m·a| (N)
            ke: Number(e.kinetic.toFixed(5)),
            peSpring: Number(e.peSpring.toFixed(5)),
            peGravity: Number(e.peGravity.toFixed(5)),
            totalEnergy: Number(e.total.toFixed(5)),
            initialEnergy: Number(this.initialEnergy.toFixed(5)),
            energyErrorPct: Number(errPct.toExponential(2)),
            analyticalX: Number(this.analytical.x.toFixed(4)),
            analyticalError: Number((this.analytical.x - this.x).toFixed(5)),
            maxAbsError: Number(this.maxAbsError.toExponential(2)),
            forced: this.config.forced,
            forceAmplitude: this.config.forceAmplitude,
            drivingFrequency: this.config.drivingFrequency,
            mass: this.config.mass,
            springConstant: this.config.springConstant,
            naturalLength: this.config.naturalLength,
            gravity: this.config.gravity,
            isResting: Math.abs(this.v) < 1e-9 && Math.abs(this.a) < 1e-9,
            // data buffers (graphs)
            strobeHistory: this.strobeHistory,
            history: this.history
        };
    }

    updateConfig(newConfig = {}) {
        const old = this.config;
        const resetKeys = ['mass', 'springConstant', 'naturalLength', 'gravity', 'x0', 'v0', 'damping'];
        const needsReset = resetKeys.some(k => newConfig[k] !== undefined && newConfig[k] !== old[k]);
        this.config = { ...old, ...newConfig };
        if (needsReset) this.reset();
    }
}

export default SpringOscillatorPhysicsSolver;