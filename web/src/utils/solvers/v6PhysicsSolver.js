/**
 * V6PhysicsSolver — REALIS Engine
 * ════════════════════════════════════════════════════════════════════════════
 * A self-contained, physically accurate V6 internal combustion engine solver.
 *
 * Architecture:
 *   - Phase 2: Kinematics — exact crank-slider mechanism equations
 *   - Phase 3: Dynamics   — angular impulse/inertia on crankshaft
 *   - Phase 4: Combustion — 4-stroke cycle per cylinder
 *   - Phase 5: Sync       — all cylinders derive from single crankAngle master
 *   - Phase 8: Performance — fixed substep at 1/240s, runs at 60fps
 *
 * Equations used:
 *   Piston position (crank-slider):
 *     x(θ) = r·cos(θ) + √( l² − r²·sin²(θ) )
 *   where:
 *     r = crank throw radius
 *     l = connecting rod length
 *     θ = crank angle + per-cylinder phase offset
 *
 *   Angular dynamics:
 *     J·(dω/dt) = τ_combustion − τ_friction − τ_load
 *     ω += (τ_net / J) · dt
 *     θ += ω · dt
 */

// ─── V6 Firing Order & Phase Configuration ───────────────────────────────────
// Canonical even-fire V6 firing order: 1-4-2-5-3-6
// Each cylinder is separated by 120° of crankshaft rotation
// Left bank (0,1,2): cylinders 1,3,5 | Right bank (3,4,5): cylinders 2,4,6
export const V6_CONFIG = {
    NUM_CYLINDERS: 6,
    // Phase offsets in radians (degrees: 0, 120, 240, 60, 180, 300)
    PHASE_OFFSETS: [0, 2.094, 4.189, 1.047, 3.141, 5.236],
    // Bank angles from vertical: left = -30°, right = +30°
    BANK_ANGLES_RAD: [
        -0.5236, -0.5236, -0.5236, // Left bank
        +0.5236, +0.5236, +0.5236  // Right bank
    ],
    // V-angle between banks (60° total = ±30° each)
    V_ANGLE_DEG: 60,
    // Firing order: cylinder index sequence
    FIRING_ORDER: [0, 3, 1, 4, 2, 5],
};

// ─── 4-Stroke Cycle Phases ────────────────────────────────────────────────────
const STROKE = { INTAKE: 0, COMPRESSION: 1, POWER: 2, EXHAUST: 3 };

/**
 * Determine which 4-stroke phase a cylinder is in, given the total crankAngle
 * each full 4-stroke cycle = 4π radians (720°) of crank rotation
 */
function getCylinderStroke(crankAngle, phaseOffset) {
    // Normalize angle into [0, 4π] cycle
    const cycleAngle = ((crankAngle + phaseOffset) % (4 * Math.PI) + 4 * Math.PI) % (4 * Math.PI);
    if (cycleAngle < Math.PI)       return STROKE.INTAKE;
    if (cycleAngle < 2 * Math.PI)   return STROKE.COMPRESSION;
    if (cycleAngle < 3 * Math.PI)   return STROKE.POWER;
    return STROKE.EXHAUST;
}

/**
 * Combustion force multiplier within power stroke (0 at start, peak at 1/4, 0 at end)
 * Approximates pressure curve of a real combustion event
 */
function getCombustionMultiplier(crankAngle, phaseOffset) {
    const cycleAngle = ((crankAngle + phaseOffset) % (4 * Math.PI) + 4 * Math.PI) % (4 * Math.PI);
    if (cycleAngle < 2 * Math.PI || cycleAngle >= 3 * Math.PI) return 0;
    const t = (cycleAngle - 2 * Math.PI) / Math.PI; // 0→1 through power stroke
    // Wiebe function approximation: rapid rise, slow decay
    return Math.sin(t * Math.PI) * Math.exp(-3 * t);
}

export default class V6PhysicsSolver {
    /**
     * @param {Object} config - Engine parameters
     * @param {number} config.crankRadius     - r: crank throw radius (mm)
     * @param {number} config.rodLength       - l: connecting rod length (mm)
     * @param {number} config.pistonMass      - mass of each piston (kg)
     * @param {number} config.crankInertia    - J: moment of inertia of crankshaft (kg·m²)
     * @param {number} config.initialRPM      - starting engine RPM
     * @param {number} config.combustionForce - peak combustion force per cylinder (N)
     * @param {number} config.frictionTorque  - τ_friction: constant friction loss (N·m)
     * @param {number} config.vAngleDeg       - total V angle (60° or 90°)
     * @param {number} config.timeStep        - simulation step in seconds
     */
    constructor(config = {}) {
        this.config = {
            crankRadius:     config.crankRadius     ?? 45,      // mm → internal units
            rodLength:       config.rodLength        ?? 130,
            pistonMass:      config.pistonMass       ?? 0.45,    // kg
            crankInertia:    config.crankInertia     ?? 0.35,    // kg·m²
            initialRPM:      config.initialRPM       ?? 800,
            combustionForce: config.combustionForce  ?? 30000,   // N (peak cylinder pressure)
            frictionTorque:  config.frictionTorque   ?? 20,      // N·m constant drag
            vAngleDeg:       config.vAngleDeg        ?? 60,
            timeStep:        config.timeStep         ?? 1 / 240, // 240Hz internal
            gravityEnabled:  config.gravityEnabled   ?? false,
        };

        // ── Master crankshaft state ──────────────────────────────────────────
        // θ — crank angle in radians (continuously increasing)
        this.crankAngle = 0;
        // ω — angular velocity in rad/s; convert from RPM
        this.angularVelocity = (this.config.initialRPM * 2 * Math.PI) / 60;

        // ── Per-cylinder state ───────────────────────────────────────────────
        this.pistonPositions  = new Array(6).fill(0); // normalized (-1 to +1)
        this.pistonVelocities = new Array(6).fill(0); // rate of change
        this.strokePhases     = new Array(6).fill(STROKE.INTAKE);
        this.combustionGlow   = new Array(6).fill(0); // 0–1 visual intensity

        // ── Analytics ───────────────────────────────────────────────────────
        this.totalTorque     = 0;
        this.RPM             = this.config.initialRPM;
        this.time            = 0;
        this.targetRPM       = this.config.initialRPM;
        this.simulationHistory = []; // Ring buffer for graphs

        // Accumulator for fixed substep
        this._accumulator = 0;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Set target RPM — solver will smoothly accelerate/decelerate toward it
     */
    setTargetRPM(rpm) {
        this.targetRPM = Math.max(0, Math.min(8000, rpm));
    }

    /**
     * Update engine configuration at runtime
     */
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
    }

    /**
     * Advance simulation by realDeltaTime seconds using fixed substep accumulator
     * Returns a snapshot of current state for rendering
     */
    tick(realDeltaTime) {
        const dt = this.config.timeStep;
        this._accumulator += realDeltaTime;

        // Run as many fixed steps as accumulated time allows
        while (this._accumulator >= dt) {
            this._step(dt);
            this._accumulator -= dt;
        }

        const snapshot = this.getSnapshot();
        snapshot.interpolationAlpha = Math.max(0, Math.min(1, this._accumulator / dt));
        return snapshot;
    }

    /**
     * Get current state snapshot for rendering & UI
     */
    getSnapshot() {
        const { crankRadius: r, rodLength: l, vAngleDeg } = this.config;
        const halfBank = (vAngleDeg / 2) * (Math.PI / 180);

        // Build per-cylinder world-space piston positions
        const cylinders = [];
        for (let i = 0; i < 6; i++) {
            const phase  = V6_CONFIG.PHASE_OFFSETS[i];
            const bankRad = i < 3 ? -halfBank : +halfBank;
            const θ = this.crankAngle + phase;

            // ── Phase 2: Crank-slider kinematics ────────────────────────────
            // Exact crank-slider equation:
            // x(θ) = r·cos(θ) + √(l² − r²·sin²(θ))
            const sinθ = Math.sin(θ);
            const cosθ = Math.cos(θ);
            const pistonDist = r * cosθ + Math.sqrt(l * l - r * r * sinθ * sinθ);

            // Convert to world-space position (bank angle determines direction)
            const px = Math.sin(bankRad) * pistonDist;
            const py = -Math.cos(bankRad) * pistonDist;

            // Crank pin position (end of crank throw)
            const crankPinX = r * Math.sin(θ);
            const crankPinY = -r * Math.cos(θ);

            // Con-rod angle
            const dxRod = px - crankPinX;
            const dyRod = py - crankPinY;
            const rodAngle = Math.atan2(dyRod, dxRod);

            cylinders.push({
                index:         i,
                phaseOffset:   phase,
                bank:          i < 3 ? 'left' : 'right',
                bankRad,
                stroke:        this.strokePhases[i],
                strokeName:    ['INTAKE', 'COMPRESSION', 'POWER', 'EXHAUST'][this.strokePhases[i]],
                pistonPos:     { x: px, y: py },
                crankPinPos:   { x: crankPinX, y: crankPinY },
                rodAngle,
                combustionGlow: this.combustionGlow[i],
                normalizedPos: this.pistonPositions[i], // -1 (TDC) to +1 (BDC)
            });
        }

        return {
            time:             this.time,
            crankAngle:       this.crankAngle,
            crankAngleDeg:    (this.crankAngle * 180 / Math.PI) % 360,
            RPM:              this.RPM,
            angularVelocity:  this.angularVelocity,
            totalTorque:      this.totalTorque,
            cylinders,
            powerOutput:      this.totalTorque * Math.abs(this.angularVelocity) / 1000, // kW
            history:          this.simulationHistory.slice(-200),
        };
    }

    // ── Private Simulation Step ───────────────────────────────────────────────

    _step(dt) {
        const { crankRadius: r, rodLength: l, crankInertia: J } = this.config;

        // ── Phase 3: Dynamics — Torque accumulation ──────────────────────────
        let netTorque = 0;

        for (let i = 0; i < 6; i++) {
            const phase = V6_CONFIG.PHASE_OFFSETS[i];
            const θ_i  = this.crankAngle + phase;

            // Determine stroke & update phase
            this.strokePhases[i] = getCylinderStroke(this.crankAngle, phase);

            // ── Phase 4: Combustion — power stroke force → torque ────────────
            const combMult = getCombustionMultiplier(this.crankAngle, phase);
            const combForce = this.config.combustionForce * combMult;

            // Combustion glow for visual feedback (clamped 0–1)
            this.combustionGlow[i] = combMult;

            // Convert piston force to crankshaft torque:
            // τ = F · r · sin(θ) / cos(rodAngle)
            // Simplified: τ = F · r · sin(θ_i) for small rod angles
            if (combForce > 0 && this.strokePhases[i] === STROKE.POWER) {
                const sinθ = Math.sin(θ_i);
                const rodAngle = Math.asin((r / l) * sinθ);
                const torqueArm = r * sinθ / Math.max(Math.cos(rodAngle), 0.01);
                // Convert mm → m for torque (r is in mm internally)
                netTorque += combForce * (torqueArm / 1000);
            }

            // Update normalized piston position for graph display
            const sinθ = Math.sin(θ_i);
            const pistonDist = r * Math.cos(θ_i) + Math.sqrt(l * l - r * r * sinθ * sinθ);
            // Normalize: TDC = r+l (dist max), BDC = l-r (dist min)
            const maxDist = r + l, minDist = l - r;
            this.pistonPositions[i] = 2 * (pistonDist - minDist) / (maxDist - minDist) - 1;
        }

        // ── Phase 3: Friction damping ────────────────────────────────────────
        // Coulomb + viscous friction
        const frictionSign = this.angularVelocity > 0 ? -1 : 1;
        const viscousFriction = -0.05 * this.angularVelocity; // Viscous drag
        netTorque += this.config.frictionTorque * frictionSign + viscousFriction;

        // RPM governor: soft torque correction to track targetRPM
        const targetOmega = (this.targetRPM * 2 * Math.PI) / 60;
        const omegaError  = targetOmega - this.angularVelocity;
        // PD controller: Kp=1.5, Kd=0.5
        const governorTorque = 1.5 * omegaError - 0.5 * (omegaError / dt);
        netTorque += Math.max(-5000, Math.min(5000, governorTorque));

        this.totalTorque = netTorque;

        // ── Phase 3: Angular integration (Euler) ─────────────────────────────
        // J · α = τ_net  →  α = τ/J
        const angularAccel = netTorque / J;
        this.angularVelocity += angularAccel * dt;

        // Clamp to physical limits (idle floor + redline)
        const minOmega = (200 * 2 * Math.PI) / 60;  // 200 RPM idle min
        const maxOmega = (8000 * 2 * Math.PI) / 60; // 8000 RPM redline
        this.angularVelocity = Math.max(-maxOmega, Math.min(maxOmega, this.angularVelocity));
        if (Math.abs(this.angularVelocity) < minOmega * 0.1) {
            this.angularVelocity = 0; // Stall
        }

        // ── Phase 5: Advance master crank angle ──────────────────────────────
        this.crankAngle += this.angularVelocity * dt;
        // Keep crankAngle from overflowing (wrap at 4π cycle boundary)
        // Note: do NOT wrap — keep increasing for correct 4-stroke phase tracking
        // But cap at something sensible to avoid float precision loss after hours
        if (Math.abs(this.crankAngle) > 1e8) {
            this.crankAngle = this.crankAngle % (4 * Math.PI);
        }

        // Update derived metrics
        this.RPM = Math.abs(this.angularVelocity * 60 / (2 * Math.PI));
        this.time += dt;

        // Push to ring-buffer history (for graphs)
        if (Math.round(this.time / dt) % 4 === 0) { // sample at 60Hz effective
            this.simulationHistory.push({
                t:   this.time,
                rpm: this.RPM,
                torque: this.totalTorque,
                piston0: this.pistonPositions[0],
                activeCyl: this.strokePhases.indexOf(STROKE.POWER),
            });
            if (this.simulationHistory.length > 400) {
                this.simulationHistory.shift();
            }
        }
    }

    reset() {
        this.crankAngle       = 0;
        this.angularVelocity  = (this.config.initialRPM * 2 * Math.PI) / 60;
        this.pistonPositions  = new Array(6).fill(0);
        this.combustionGlow   = new Array(6).fill(0);
        this.time             = 0;
        this._accumulator     = 0;
        this.simulationHistory = [];
    }
}
