// ─────────────────────────────────────────────────────────────────────────────
// INCLINED FRICTION RAMP — real computational physics
//
// State vector: [s, v]
//   s = position along the ramp measured from the base (m, 0 → rampLength)
//   v = velocity along the ramp (m/s, positive = UP the ramp)
//
// Forces along the ramp (positive = up the ramp):
//   gravity component      F_par = −m·g·sinθ
//   normal (perp)          N     = m·g·cosθ
//   kinetic friction (v≠0) f_k   = −sign(v)·μ_k·N
//   static friction (v=0)  f_s   = +min(m·g·sinθ, μ_s·N)   (only what is required)
//
// Motion condition: the block slips when m·g·sinθ > μ_s·N  ⇔  tanθ > μ_s
// Critical angle:      θ_c = arctan(μ_s)
//
// Numerical integration: RK4 over a fixed physics timestep. Because the
// acceleration is piecewise-constant (it only depends on the sign of v and the
// static/slip decision), RK4 is exact between events. A zero-velocity crossing
// (stick/slip transition) is located by bisection so upward motion can come to
// rest and either stick or reverse — never via a manual velocity flip.
// ─────────────────────────────────────────────────────────────────────────────

const DEG = Math.PI / 180;

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export const RAMP_STATES = {
    STATIONARY: 'STATIONARY',
    SLIDING_DOWN: 'SLIDING DOWN',
    SLIDING_UP: 'SLIDING UP',
    CRITICAL: 'CRITICAL ANGLE',
};

export const GRAVITY_PRESETS = [
    { id: 'earth', name: 'Earth', g: 9.81, accent: '#38bdf8' },
    { id: 'moon', name: 'Moon', g: 1.62, accent: '#94a3b8' },
    { id: 'mars', name: 'Mars', g: 3.71, accent: '#f87171' },
    { id: 'zero', name: 'Zero-G', g: 0.0, accent: '#a78bfa' },
];

// thetaDeg may be a number or a special key resolved against θ_c = arctan(μ_s)
export const RAMP_PRESETS = [
    { id: 'no_friction', name: 'No Friction', thetaDeg: 30, muS: 0.0, muK: 0.0, v0: 0.0, accent: '#38bdf8' },
    { id: 'low_friction', name: 'Low Friction', thetaDeg: 30, muS: 0.2, muK: 0.1, v0: 0.0, accent: '#34d399' },
    { id: 'high_friction', name: 'High Friction', thetaDeg: 30, muS: 0.9, muK: 0.7, v0: 0.0, accent: '#fbbf24' },
    { id: 'below_critical', name: 'Below θ_c', thetaDeg: 'below', muS: 0.5, muK: 0.3, v0: 0.0, accent: '#22d3ee' },
    { id: 'critical_angle', name: 'Critical θ_c', thetaDeg: 'critical', muS: 0.5, muK: 0.3, v0: 0.0, accent: '#f472b6' },
    { id: 'above_critical', name: 'Above θ_c', thetaDeg: 'above', muS: 0.5, muK: 0.3, v0: 0.0, accent: '#fb7185' },
    { id: 'upward_launch', name: 'Upward Launch', thetaDeg: 30, muS: 0.5, muK: 0.3, v0: 3.0, accent: '#f59e0b' },
    { id: 'moon_gravity', name: 'Moon Gravity', thetaDeg: 40, muS: 0.3, muK: 0.15, v0: 0.0, accent: '#94a3b8' },
    { id: 'zero_gravity', name: 'Zero Gravity', thetaDeg: 30, muS: 0.5, muK: 0.3, v0: 2.0, accent: '#a78bfa' },
];

export default class InclinedRampSolver {
    constructor(config = {}) {
        this.config = {
            mass: config.mass ?? 2.0,                // kg
            g: config.g ?? 9.81,                     // m/s²
            thetaDeg: config.thetaDeg ?? 30.0,       // ramp incline angle
            muS: config.muS ?? 0.5,                  // static friction coefficient
            muK: config.muK ?? 0.3,                  // kinetic friction coefficient
            rampLength: config.rampLength ?? 5.0,    // m
            initialPosition: config.initialPosition ?? 3.0, // m along ramp (0 → L)
            initialVelocity: config.initialVelocity ?? 0.0, // m/s along ramp (+ = up)
            dt: config.dt ?? 1 / 120,                // fixed physics timestep (s)
            timeScale: config.timeScale ?? 1.0,      // sim-seconds per real-second
            blockSize: config.blockSize ?? 0.45,     // m (render reference + PE offset)
            sampleInterval: config.sampleInterval ?? 0.008, // graph sampling (sim-s)
            trailMaxInterval: config.trailMaxInterval ?? 0.02, // trail sampling (sim-s)
            maxHistory: config.maxHistory ?? 2000,
            maxTrail: config.maxTrail ?? 1200,
        };
        this.reset();
    }

    reset() {
        const c = this.config;
        this.s = clamp(c.initialPosition, 0, Math.max(c.rampLength, 1e-6));
        this.v = c.initialVelocity;
        this.time = 0.0;
        this.stopped = false;
        this.hitEnd = null;                 // 'top' | 'bottom' | null
        this.slidingDistance = 0.0;         // total distance slid under kinetic friction (m)
        this.frictionWork = 0.0;            // cumulative |W_f| = μ_k·N·d (J)
        this.lastSampleTime = 0.0;
        this.lastTrailTime = 0.0;
        this.history = {
            t: [], s: [], v: [], a: [], friction: [], netForce: [],
            ke: [], pe: [], e: [], lost: [],
        };
        this.trail = [];
        this.recordSample(true);
        this.recordTrail(true);
    }

    updateConfig(newConfig = {}) {
        const coreKeys = ['mass', 'g', 'thetaDeg', 'muS', 'muK', 'rampLength', 'initialPosition', 'initialVelocity', 'dt'];
        const needsReset = coreKeys.some(k =>
            newConfig[k] !== undefined &&
            JSON.stringify(newConfig[k]) !== JSON.stringify(this.config[k])
        );
        this.config = { ...this.config, ...newConfig };
        if (needsReset) this.reset();
    }

    // ── Derived physics quantities (all from parameters, no hard-coding) ────
    derived() {
        const c = this.config;
        const theta = c.thetaDeg * DEG;
        const sin = Math.sin(theta);
        const cos = Math.cos(theta);
        const g = c.g;
        const weight = c.mass * g;
        const normal = c.mass * g * cos;         // N = mg cosθ
        const parallel = c.mass * g * sin;       // F_par = mg sinθ (down the ramp)
        const perp = c.mass * g * cos;           // F_perp = mg cosθ (into the ramp)
        const thetaC = Math.atan(c.muS);         // θ_c = arctan(μ_s)  [rad]
        const fMax = c.muS * normal;             // f_s,max = μ_s·N
        const fKin = c.muK * normal;             // f_k = μ_k·N
        const staticHolds = parallel <= fMax + 1e-12; // tanθ ≤ μ_s
        const gSin = g * sin;                    // along-ramp gravity acceleration (m/s²)
        const gCos = g * cos;
        const aUp = -gSin - c.muK * gCos;        // accel while sliding UP
        const aDown = -gSin + c.muK * gCos;      // accel while sliding DOWN (or at slip onset)
        return { theta, thetaDeg: c.thetaDeg, sin, cos, thetaC, muS: c.muS, muK: c.muK, weight, normal, parallel, perp, fMax, fKin, staticHolds, gSin, gCos, aUp, aDown };
    }

    // Signed acceleration along +s (up the ramp). This single function encodes
    // the whole friction model: static holds at rest, kinetic opposes motion.
    accel(v, d) {
        const tol = 1e-9;
        if (v > tol) return d.aUp;
        if (v < -tol) return d.aDown;
        if (d.staticHolds) return 0;
        return d.aDown; // slips downward
    }

    // ── Single RK4 fixed-step integration of [ds/dt, dv/dt] = [v, a] ────────
    rk4State(s0, v0, h) {
        const d = this.derived();
        // state [s, v]; derivative [v, a]. Slopes for s are the intermediate
        // VELOCITIES (v₀ + ½h·a …), slopes for v are the intermediate ACCELS.
        const k1 = [v0, this.accel(v0, d)];
        const k2 = [v0 + 0.5 * h * k1[1], this.accel(v0 + 0.5 * h * k1[1], d)];
        const k3 = [v0 + 0.5 * h * k2[1], this.accel(v0 + 0.5 * h * k2[1], d)];
        const k4 = [v0 + h * k3[1], this.accel(v0 + h * k3[1], d)];
        return {
            s: s0 + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
            v: v0 + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
        };
    }

    // ── Advance one fixed sub-step with exact stick/slip event detection ──
    // The acceleration is piecewise-constant (it only depends on the sign of v
    // and the static/slip decision), so the zero-velocity instant can be found
    // exactly. This avoids the RK4 numerical oscillation at the v = 0
    // discontinuity and guarantees correct up-motion → rest or reverse
    // transitions — never a manual velocity flip.
    advanceSub(h) {
        const d = this.derived();
        const v = this.v;

        // Event: sliding UP and about to stop (aUp < 0 always when g>0, θ>0).
        if (v > 0 && d.aUp < 0) {
            const tStop = v / (-d.aUp);
            if (tStop <= h) {
                this.s += v * tStop + 0.5 * d.aUp * tStop * tStop;
                this.v = 0;
                if (d.staticHolds) { this.stopped = true; return; }
                const rem = h - tStop;   // static exhausted → slides back DOWN
                if (rem > 0) {
                    this.v = d.aDown * rem;
                    this.s += 0.5 * d.aDown * rem * rem;
                }
                return;
            }
        }
        // Event: sliding DOWN, friction stronger than gravity → decelerates to rest.
        else if (v < 0 && d.aDown > 0) {
            const tStop = -v / d.aDown;
            if (tStop <= h) {
                this.s += v * tStop + 0.5 * d.aDown * tStop * tStop;
                this.v = 0;
                if (d.staticHolds) { this.stopped = true; return; }
                const rem = h - tStop;
                if (rem > 0) {
                    this.v = d.aDown * rem;
                    this.s += 0.5 * d.aDown * rem * rem;
                }
                return;
            }
        }

        // ── Ordinary RK4 step (exact between constant-acceleration events) ──
        const next = this.rk4State(this.s, this.v, h);
        this.s = next.s;
        this.v = next.v;
    }

    clampToRamp() {
        const L = this.config.rampLength;
        if (this.s > L) { this.s = L; this.v = 0; this.hitEnd = 'top'; this.stopped = true; }
        else if (this.s < 0) { this.s = 0; this.v = 0; this.hitEnd = 'bottom'; this.stopped = true; }
    }

    // ── Main step (frame-rate independent) ─────────────────────────────────
    step(deltaSeconds) {
        const realDt = clamp(deltaSeconds || this.config.dt, 0, 0.05);
        const simDt = realDt * this.config.timeScale;
        const h = this.config.dt;
        let remaining = simDt;
        let guard = 0;

        while (remaining > 1e-12 && !this.stopped && guard < 4000) {
            guard++;
            const sBefore = this.s;
            const stepH = Math.min(remaining, h);
            this.advanceSub(stepH);
            this.clampToRamp();

            // Cumulative kinetic-friction work: W_f = μ_k·N·(path length slid).
            // Path length is the actual displacement — exact for all branches.
            const d = this.derived();
            const moved = Math.abs(this.s - sBefore);
            if (moved > 1e-12) {
                this.slidingDistance += moved;
                this.frictionWork += d.muK * d.normal * moved;
            }
            remaining -= stepH;
        }

        this.time += simDt;
        this.recordSample();
        this.recordTrail();
        return this.getSnapshot();
    }

    // ── Graph history sampling (bounded rolling buffer) ────────────────────
    recordSample(force) {
        if (!force && this.time - this.lastSampleTime < this.config.sampleInterval) return;
        this.lastSampleTime = this.time;
        const d = this.derived();
        const a = this.accel(this.v, d);
        const fSig = this.frictionSigned(d);
        const H = this.history;
        H.t.push(this.time);
        H.s.push(this.s);
        H.v.push(this.v);
        H.a.push(a);
        H.friction.push(fSig);
        H.netForce.push(this.config.mass * a);
        H.ke.push(this.kineticEnergy());
        H.pe.push(this.potentialEnergy());
        H.e.push(this.kineticEnergy() + this.potentialEnergy());
        H.lost.push(this.frictionWork);
        if (H.t.length > this.config.maxHistory) {
            for (const k of Object.keys(H)) H[k].shift();
        }
    }

    // ── Motion trail (actual historical positions) ─────────────────────────
    recordTrail(force) {
        const p = this.blockWorld(this.s);
        const moved = this.trail.length === 0 ||
            Math.hypot(p.x - this.trail[this.trail.length - 1].x, p.y - this.trail[this.trail.length - 1].y) > 0.004;
        if ((force || moved) && (force || this.time - this.lastTrailTime >= this.config.trailMaxInterval)) {
            this.trail.push({ x: p.x, y: p.y, t: this.time });
            this.lastTrailTime = this.time;
            if (this.trail.length > this.config.maxTrail) this.trail.shift();
        }
    }

    // ── Signed friction force along the ramp (positive = up) ───────────────
    frictionSigned(d) {
        const tol = 1e-9;
        if (this.v > tol) return -d.fKin;
        if (this.v < -tol) return d.fKin;
        if (d.staticHolds) return d.parallel; // just enough to balance — NOT μ_s·N
        return d.fKin;
    }

    // ── Energies ────────────────────────────────────────────────────────────
    kineticEnergy() { return 0.5 * this.config.mass * this.v * this.v; }

    potentialEnergy() {
        // h = vertical height of the block centre above the base
        const d = this.derived();
        const h = this.s * d.sin + (this.config.blockSize / 2) * d.cos;
        return this.config.mass * this.config.g * h;
    }

    // Block centre in world coordinates (physics → render pipeline).
    blockWorld(s) {
        const d = this.derived();
        const bh = this.config.blockSize / 2;
        return { x: s * d.cos - bh * d.sin, y: s * d.sin + bh * d.cos };
    }

    // Contact point (bottom face centre) on the ramp surface.
    contactWorld(s) {
        const d = this.derived();
        return { x: s * d.cos, y: s * d.sin };
    }

    // ── Physical state string (derived from actual v / θ / θ_c) ────────────
    stateString(d) {
        const tol = 1e-6;
        if (this.stopped || this.hitEnd) return RAMP_STATES.STATIONARY;
        if (this.v > tol) return RAMP_STATES.SLIDING_UP;
        if (this.v < -tol) return RAMP_STATES.SLIDING_DOWN;
        if (d.muS > 0 && d.theta > 0 && Math.abs(d.theta - d.thetaC) <= 0.35 * DEG) {
            return RAMP_STATES.CRITICAL;
        }
        if (!d.staticHolds) return RAMP_STATES.SLIDING_DOWN;
        return RAMP_STATES.STATIONARY;
    }

    // ── Complete live snapshot (single source of truth for the renderer) ───
    getSnapshot() {
        const c = this.config;
        const d = this.derived();
        const p = this.blockWorld(this.s);
        const a = this.accel(this.v, d);
        const fSig = this.frictionSigned(d);
        const ke = this.kineticEnergy();
        const pe = this.potentialEnergy();
        const state = this.stateString(d);

        return {
            time: this.time,
            state,
            hitEnd: this.hitEnd,
            stopped: this.stopped,
            slidingDistance: this.slidingDistance,
            frictionWork: this.frictionWork,
            // Ramp-coordinate state
            rampState: { s: this.s, v: this.v, a },
            // World position (block centre)
            position: p,
            contact: this.contactWorld(this.s),
            height: p.y,
            // Parameters
            params: {
                mass: c.mass,
                g: c.g,
                thetaDeg: c.thetaDeg,
                muS: c.muS,
                muK: c.muK,
                rampLength: c.rampLength,
                blockSize: c.blockSize,
                dt: c.dt,
                timeScale: c.timeScale,
            },
            // Forces (magnitudes + signed along-ramp components)
            forces: {
                weight: d.weight,
                normal: d.normal,
                parallel: d.parallel,
                perp: d.perp,
                fStaticMax: d.fMax,
                friction: fSig,          // signed along ramp (+ = up)
                frictionMagnitude: Math.abs(fSig),
                frictionKind: this.v > 1e-9 || this.v < -1e-9 ? 'kinetic' : (d.staticHolds ? 'static' : 'kinetic'),
                kineticFriction: d.fKin,
                netForce: c.mass * a,   // signed along ramp
                aParallel: d.gSin,      // g sinθ (down-ramp gravity acceleration)
            },
            // Critical angle
            criticalAngleDeg: d.thetaC / DEG,
            thetaCDeg: d.thetaC / DEG,
            // Energy
            energy: {
                kinetic: ke,
                potential: pe,
                total: ke + pe,
                lost: this.frictionWork,
            },
            trail: this.trail,
            history: this.history,
        };
    }
}