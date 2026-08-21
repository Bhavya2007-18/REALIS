// ═══════════════════════════════════════════════════════════════════════════════
// REALIS OrbitalPhysicsSolver — Newtonian Two-Body Orbital Mechanics Engine
//
// This is a REAL computational physics simulation. The orbit is NOT generated
// with sin(t)/cos(t), predefined circles or CSS keyframes. The trajectory EMERGES
// from integrating Newton's law of universal gravitation with a 4th-order
// Runge-Kutta integrator:
//
//     F⃗ = −GMm · r⃗/|r⃗|³          (force on satellite)
//     a⃗ = −μ · r⃗/|r⃗|³            (acceleration, μ = GM)
//     d⃗r/dt = v⃗
//     dv⃗/dt = a⃗ = −μ r⃗ / |r⃗|³
//
// Units: distances in km, velocities in km/s, time in seconds, μ in km³/s².
// Physics is advanced on a FIXED timestep (RK4) and is independent of render FPS.
// ═══════════════════════════════════════════════════════════════════════════════

export const GRAVITATIONAL_CONSTANT = 6.6743e-11; // m³ kg⁻¹ s⁻²

const TWO_PI = Math.PI * 2;

export function wrapAngleRad(a) {
    let out = a % TWO_PI;
    if (out > Math.PI) out -= TWO_PI;
    if (out < -Math.PI) out += TWO_PI;
    return out;
}

export function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
}

// ── Orbital preset catalog (applied by the UI) ──────────────────────────────
// Each preset maps to an initial speed relative to circular / escape velocity
// at the current radius. The orbit shape EMERGES from the resulting physics.
export const ORBITAL_PRESETS = {
    circular: {
        id: 'circular',
        name: 'Circular Orbit',
        description: 'v = √(μ/r) — exact circular orbital velocity',
        base: 'circular',
        factor: 1.0,
        accent: '#38bdf8',
    },
    low_elliptical: {
        id: 'low_elliptical',
        name: 'Low Elliptical Orbit',
        description: 'v ≈ 0.85·√(μ/r) — slightly slower than circular → bound ellipse',
        base: 'circular',
        factor: 0.85,
        accent: '#22d3ee',
    },
    high_elliptical: {
        id: 'high_elliptical',
        name: 'Highly Elliptical Orbit',
        description: 'v ≈ 0.55·√(μ/r) — much slower → very elongated bound ellipse',
        base: 'circular',
        factor: 0.55,
        accent: '#a78bfa',
    },
    escape: {
        id: 'escape',
        name: 'Escape Velocity (Parabolic)',
        description: 'v = √(2μ/r) — exactly at escape → parabolic boundary',
        base: 'escape',
        factor: 1.0,
        accent: '#fbbf24',
    },
    hyperbolic: {
        id: 'hyperbolic',
        name: 'Hyperbolic Escape',
        description: 'v = 1.30·√(2μ/r) — above escape → unbound hyperbola',
        base: 'escape',
        factor: 1.3,
        accent: '#f472b6',
    },
    earth_satellite: {
        id: 'earth_satellite',
        name: 'Earth Satellite (Realistic)',
        description: 'Real Earth values: μ = 398600 km³/s², r = 6871 km, v = 7.62 km/s',
        base: 'circular',
        factor: 1.0,
        earth: true,
        accent: '#4ade80',
    },
};

// ── Orbital Physics Solver ───────────────────────────────────────────────────
export class OrbitalPhysicsSolver {
    constructor(config = {}) {
        this.config = {
            mu: config.mu ?? 3986.0,                  // gravitational parameter (km³/s²)
            centralMass: config.centralMass ?? 6.0e22, // kg (informational)
            satelliteMass: config.satelliteMass ?? 1000, // kg
            centralRadius: config.centralRadius ?? 15.0, // km — PHYSICS radius (collision)
            initialPosition: config.initialPosition ?? { x: 100, y: 0 },
            initialVelocity: config.initialVelocity ?? { vx: 0, vy: 6.313 },
            dt: config.dt ?? 0.1,                      // fixed physics timestep (s)
            timeScale: config.timeScale ?? 5.0,        // sim-seconds per real-second
            // Adaptive visualization recording (user may override)
            sectorInterval: config.sectorInterval ?? null,   // sim-s between swept-area wedges
            energyInterval: config.energyInterval ?? null,   // sim-s between energy samples
            trailAngleStep: config.trailAngleStep ?? 0.01,   // rad — trail sampling density
            trailMaxInterval: config.trailMaxInterval ?? 0.25, // sim-s fallback
            trailMaxPoints: config.trailMaxPoints ?? 4000,
            sectorMax: config.sectorMax ?? 48,
        };

        this.reset();
    }

    reset() {
        const { initialPosition, initialVelocity, mu } = this.config;
        this.x = initialPosition.x;
        this.y = initialPosition.y;
        this.vx = initialVelocity.vx;
        this.vy = initialVelocity.vy;
        this.time = 0.0;
        this.impacted = false;
        this.impactTime = null;
        this.impactSpeed = null;

        this.trail = [];
        this.sectors = [];
        this.energyHistory = { time: [], kinetic: [], potential: [], total: [], eps: [] };

        this.orbitCount = 0;
        this.totalAngle = 0.0;
        this.lastAngle = Math.atan2(this.y, this.x);
        this.lastTrailAngle = this.lastAngle;
        this.lastTrailTime = 0.0;
        this.lastSectorTime = 0.0;
        this.lastEnergyTime = 0.0;
        this.sectorAnchor = { x: this.x, y: this.y };

        // Adaptive recording intervals based on the initial circular period.
        const r0 = Math.hypot(this.x, this.y);
        const T0 = (mu > 0 && r0 > 0) ? TWO_PI * r0 / Math.sqrt(mu / r0) : 100;
        this.periodEstimate = Number.isFinite(T0) && T0 > 0 ? T0 : 100;
        this.sectorInterval = this.config.sectorInterval ?? clamp(this.periodEstimate / 8, 0.25, 60);
        this.energyInterval = this.config.energyInterval ?? clamp(this.periodEstimate / 120, 0.1, 2.0);

        this.evec = null; // eccentricity vector (km)
        this.recordTrail(true);
    }

    updateConfig(newConfig = {}) {
        const coreKeys = ['mu', 'centralMass', 'satelliteMass', 'centralRadius', 'initialPosition', 'initialVelocity', 'dt'];
        const needsReset = coreKeys.some(k =>
            newConfig[k] !== undefined &&
            JSON.stringify(newConfig[k]) !== JSON.stringify(this.config[k])
        );
        this.config = { ...this.config, ...newConfig };
        if (needsReset) this.reset();
    }

    // ── Newtonian acceleration: a⃗ = −μ r⃗/|r⃗|³ ─────────────────────────────
    acceleration(x, y) {
        const r2 = x * x + y * y;
        const r = Math.sqrt(r2);
        if (r < 1e-6) return { ax: 0, ay: 0 }; // avoid singularity at center
        const r3 = r2 * r;
        const k = -this.config.mu / r3;
        return { ax: k * x, ay: k * y };
    }

    // State derivative: [dx/dt, dy/dt, dvx/dt, dvy/dt]
    derivatives(s) {
        const [x, y, vx, vy] = s;
        const { ax, ay } = this.acceleration(x, y);
        return [vx, vy, ax, ay];
    }

    // ── Single RK4 fixed-step integration ────────────────────────────────────
    stepRK4(dt) {
        const s = [this.x, this.y, this.vx, this.vy];
        const k1 = this.derivatives(s);
        const k2 = this.derivatives([s[0] + dt * 0.5 * k1[0], s[1] + dt * 0.5 * k1[1], s[2] + dt * 0.5 * k1[2], s[3] + dt * 0.5 * k1[3]]);
        const k3 = this.derivatives([s[0] + dt * 0.5 * k2[0], s[1] + dt * 0.5 * k2[1], s[2] + dt * 0.5 * k2[2], s[3] + dt * 0.5 * k2[3]]);
        const k4 = this.derivatives([s[0] + dt * k3[0], s[1] + dt * k3[1], s[2] + dt * k3[2], s[3] + dt * k3[3]]);

        this.x += (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
        this.y += (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
        this.vx += (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
        this.vy += (dt / 6) * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]);
        this.time += dt;
    }

    checkCollision() {
        const r = Math.hypot(this.x, this.y);
        if (r <= this.config.centralRadius) {
            this.impacted = true;
            this.impactTime = this.time;
            this.impactSpeed = Math.hypot(this.vx, this.vy);
            return true;
        }
        return false;
    }

    // ── Main step (frame-rate independent): advance by deltaSeconds ─────────
    step(deltaSeconds) {
        if (this.impacted) return this.getSnapshot();

        const realDt = Math.min(deltaSeconds || this.config.dt, 0.05);
        const simDt = realDt * this.config.timeScale;
        const dt = this.config.dt;
        const steps = Math.max(1, Math.round(simDt / dt));
        const maxSteps = 1000;

        for (let i = 0; i < Math.min(steps, maxSteps); i++) {
            this.stepRK4(dt);

            // Accumulate swept angle (for orbit count + Kepler's 2nd law).
            const angle = Math.atan2(this.y, this.x);
            this.totalAngle += wrapAngleRad(angle - this.lastAngle);
            this.lastAngle = angle;
            this.orbitCount = this.totalAngle / TWO_PI;

            if (this.checkCollision()) break;

            this.recordTrail();
            this.recordSector();
            this.recordEnergy();
        }

        return this.getSnapshot();
    }

    // ── Trajectory recording (density-adaptive, from actual positions) ──────
    recordTrail(force) {
        let should = force;
        if (!should) {
            const dTheta = Math.abs(wrapAngleRad(Math.atan2(this.y, this.x) - this.lastTrailAngle));
            if (dTheta >= this.config.trailAngleStep) should = true;
            else if (this.time - this.lastTrailTime >= this.config.trailMaxInterval) should = true;
        }
        if (should) {
            this.trail.push({ x: this.x, y: this.y, t: this.time });
            this.lastTrailAngle = Math.atan2(this.y, this.x);
            this.lastTrailTime = this.time;
            if (this.trail.length > this.config.trailMaxPoints) this.decimateTrail();
        }
    }

    decimateTrail() {
        const half = [];
        for (let i = 0; i < this.trail.length; i += 2) half.push(this.trail[i]);
        this.trail = half;
    }

    // ── Kepler's 2nd law: equal-area sectors over equal time ────────────────
    recordSector() {
        if (this.time - this.lastSectorTime >= this.sectorInterval) {
            const area = 0.5 * Math.abs(this.sectorAnchor.x * this.y - this.sectorAnchor.y * this.x);
            this.sectors.push({
                x0: this.sectorAnchor.x, y0: this.sectorAnchor.y,
                x1: this.x, y1: this.y,
                t0: this.lastSectorTime, t1: this.time,
                area,
            });
            this.lastSectorTime = this.time;
            this.sectorAnchor = { x: this.x, y: this.y };
            if (this.sectors.length > this.config.sectorMax) this.sectors.shift();
        }
    }

    // ── Energy telemetry sampling (bounded buffer) ──────────────────────────
    recordEnergy() {
        if (this.time - this.lastEnergyTime >= this.energyInterval) {
            const r = Math.hypot(this.x, this.y);
            const v = Math.hypot(this.vx, this.vy);
            const pe = -this.config.mu * this.config.satelliteMass / r;
            const ke = 0.5 * this.config.satelliteMass * v * v;
            const eps = v * v / 2 - this.config.mu / r;
            const H = this.energyHistory;
            H.time.push(this.time);
            H.kinetic.push(ke);
            H.potential.push(pe);
            H.total.push(ke + pe);
            H.eps.push(eps);
            this.lastEnergyTime = this.time;
            if (H.time.length > 600) {
                H.time.shift();
                H.kinetic.shift();
                H.potential.shift();
                H.total.shift();
                H.eps.shift();
            }
        }
    }

    // ── Complete live snapshot (single source of truth for the renderer) ────
    getSnapshot() {
        const { mu, centralMass, satelliteMass, centralRadius } = this.config;
        const x = this.x, y = this.y;
        const vx = this.vx, vy = this.vy;
        const r = Math.hypot(x, y);
        const v = Math.hypot(vx, vy);

        const accelMag = r > 0 ? mu / (r * r) : 0;
        const ax = r > 0 ? (-mu * x) / (r * r * r) : 0;
        const ay = r > 0 ? (-mu * y) / (r * r * r) : 0;
        const forceMag = r > 0 ? (mu * satelliteMass) / (r * r) : 0;
        const fx = r > 0 ? (-forceMag * x) / r : 0;
        const fy = r > 0 ? (-forceMag * y) / r : 0;

        const eps = (v * v) / 2 - mu / r;           // specific orbital energy (km²/s²)
        const h = x * vy - y * vx;                   // specific angular momentum (km²/s)
        const hMomentum = satelliteMass * h;         // angular momentum (kg·km²/s)

        const vCirc = r > 0 ? Math.sqrt(mu / r) : 0;
        const vEsc = r > 0 ? Math.sqrt((2 * mu) / r) : 0;

        // ── Orbital elements from state vectors ──────────────────────────────
        let semiMajor = Infinity;
        let ecc = 0;
        let rp = 0;
        let ra = Infinity;
        let period = Infinity;
        this.evec = null;

        if (eps < 0 && r > 0) {
            semiMajor = -mu / (2 * eps);
            const rdotv = x * vx + y * vy;
            const evecX = ((v * v * x - rdotv * vx) / mu) - x / r;
            const evecY = ((v * v * y - rdotv * vy) / mu) - y / r;
            ecc = Math.hypot(evecX, evecY);
            rp = semiMajor * (1 - ecc);
            ra = semiMajor * (1 + ecc);
            if (mu > 0) period = TWO_PI * Math.sqrt((semiMajor * semiMajor * semiMajor) / mu);
            this.evec = { x: evecX, y: evecY };
        }

        // ── Orbit classification from physics (not visuals) ─────────────────
        let orbitType = 'HYPERBOLIC';
        if (Math.abs(eps) < 1e-6) {
            orbitType = 'PARABOLIC';
        } else if (eps < 0) {
            orbitType = ecc < 0.05 ? 'CIRCULAR' : 'ELLIPTICAL';
        }

        // Apsis positions (only meaningful for bound orbits).
        let periapsis = null;
        let apoapsis = null;
        if (this.evec && eps < 0 && ecc > 0.005) {
            const ehatX = this.evec.x / ecc;
            const ehatY = this.evec.y / ecc;
            periapsis = { x: ehatX * rp, y: ehatY * rp };
            apoapsis = { x: -ehatX * ra, y: -ehatY * ra };
        }

        return {
            time: this.time,
            orbitCount: this.orbitCount,
            position: { x, y, r },
            velocity: { x: vx, y: vy, v },
            acceleration: { x: ax, y: ay, magnitude: accelMag },
            force: { x: fx, y: fy, magnitude: forceMag },
            angle: Math.atan2(y, x),
            orbit: {
                type: orbitType,
                mu,
                centralMass,
                satelliteMass,
                centralRadius,
                semiMajor,
                ecc,
                rp,
                ra,
                period,
                vCirc,
                vEsc,
                eps,
                h,
                hMomentum,
                periapsis,
                apoapsis,
            },
            kinetic: 0.5 * satelliteMass * v * v,
            potential: (-mu * satelliteMass) / r,
            totalEnergy: 0.5 * satelliteMass * v * v - (mu * satelliteMass) / r,
            impacted: this.impacted,
            impactTime: this.impactTime,
            impactSpeed: this.impactSpeed,
            trail: this.trail,
            sectors: this.sectors,
            energyHistory: this.energyHistory,
            config: { ...this.config },
        };
    }
}

export default OrbitalPhysicsSolver;
