





export const V6_CONFIG = {
    NUM_CYLINDERS: 6,
    PHASE_OFFSETS: [0, 2.0944, 4.1888, 1.0472, 3.1416, 5.2360], // 0°, 120°, 240°, 60°, 180°, 300°
    BANK_ANGLES_RAD: [
        -0.5236, -0.5236, -0.5236, // Left Bank: -30°
        +0.5236, +0.5236, +0.5236   // Right Bank: +30°
    ],
    V_ANGLE_DEG: 60,
    FIRING_ORDER: [1, 4, 2, 5, 3, 6], // Standard 1-4-2-5-3-6 firing order
};

const STROKE = { INTAKE: 0, COMPRESSION: 1, POWER: 2, EXHAUST: 3 };

function getCylinderStroke(crankAngle, phaseOffset) {
    const cycleAngle = ((crankAngle + phaseOffset) % (4 * Math.PI) + 4 * Math.PI) % (4 * Math.PI);
    if (cycleAngle < Math.PI)       return STROKE.INTAKE;
    if (cycleAngle < 2 * Math.PI)   return STROKE.COMPRESSION;
    if (cycleAngle < 3 * Math.PI)   return STROKE.POWER;
    return STROKE.EXHAUST;
}

function getCombustionMultiplier(crankAngle, phaseOffset) {
    const cycleAngle = ((crankAngle + phaseOffset) % (4 * Math.PI) + 4 * Math.PI) % (4 * Math.PI);
    if (cycleAngle < 2 * Math.PI || cycleAngle >= 3 * Math.PI) return 0;
    const t = (cycleAngle - 2 * Math.PI) / Math.PI; 
    return Math.sin(t * Math.PI) * Math.exp(-3 * t);
}

// Intake Valve Lift (0 to 1) during INTAKE stroke (0 to π)
function getIntakeValveLift(crankAngle, phaseOffset) {
    const cycleAngle = ((crankAngle + phaseOffset) % (4 * Math.PI) + 4 * Math.PI) % (4 * Math.PI);
    if (cycleAngle >= 0 && cycleAngle <= Math.PI) {
        return Math.sin(cycleAngle);
    }
    return 0;
}

// Exhaust Valve Lift (0 to 1) during EXHAUST stroke (3π to 4π)
function getExhaustValveLift(crankAngle, phaseOffset) {
    const cycleAngle = ((crankAngle + phaseOffset) % (4 * Math.PI) + 4 * Math.PI) % (4 * Math.PI);
    if (cycleAngle >= 3 * Math.PI && cycleAngle <= 4 * Math.PI) {
        return Math.sin(cycleAngle - 3 * Math.PI);
    }
    return 0;
}

export default class V6PhysicsSolver {
    constructor(config = {}) {
        const bore = config.bore ?? 86.0; // mm
        const stroke = config.stroke ?? 86.0; // mm
        const crankRadius = config.crankRadius ?? (stroke / 2); // mm (43 mm)
        const rodLength = config.rodLength ?? 130.0; // mm

        this.config = {
            bore,
            stroke,
            crankRadius,
            rodLength,
            compressionRatio: config.compressionRatio ?? 10.0,
            pistonMass:       config.pistonMass       ?? 0.45,    // kg
            crankInertia:     config.crankInertia     ?? 0.35,    // kg·m²
            initialRPM:       config.initialRPM       ?? 800,
            combustionForce:  config.combustionForce  ?? 30000,   // N
            frictionTorque:   config.frictionTorque   ?? 20,      // N·m
            loadTorque:       config.loadTorque       ?? 0,       // N·m
            throttle:         config.throttle         ?? 1.0,     // 0.0 to 1.0
            vAngleDeg:        config.vAngleDeg        ?? 60,
            timeStep:         config.timeStep         ?? 1 / 240, 
            gravityEnabled:   config.gravityEnabled   ?? false,
        };

        this.crankAngle = 0;
        this.angularVelocity = (this.config.initialRPM * 2 * Math.PI) / 60;

        this.pistonPositions    = new Array(6).fill(0); 
        this.pistonVelocities   = new Array(6).fill(0); 
        this.pistonAccelerations = new Array(6).fill(0);
        this.strokePhases       = new Array(6).fill(STROKE.INTAKE);
        this.combustionGlow     = new Array(6).fill(0); 
        this.intakeValveLifts   = new Array(6).fill(0);
        this.exhaustValveLifts  = new Array(6).fill(0);

        this.totalTorque     = 0;
        this.RPM             = this.config.initialRPM;
        this.time            = 0;
        this.targetRPM       = this.config.initialRPM;
        this.simulationHistory = []; 

        this._accumulator = 0;
    }

    setTargetRPM(rpm) {
        this.targetRPM = Math.max(0, Math.min(8000, rpm));
    }

    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        if (updates.stroke !== undefined && updates.crankRadius === undefined) {
            this.config.crankRadius = updates.stroke / 2;
        }
        if (updates.targetRPM !== undefined) {
            this.setTargetRPM(updates.targetRPM);
        }
    }

    tick(realDeltaTime) {
        const dt = this.config.timeStep;
        this._accumulator += realDeltaTime;

        while (this._accumulator >= dt) {
            this._step(dt);
            this._accumulator -= dt;
        }

        const snapshot = this.getSnapshot();
        snapshot.interpolationAlpha = Math.max(0, Math.min(1, this._accumulator / dt));
        return snapshot;
    }

    getDisplacement() {
        const b = this.config.bore / 10; // cm
        const s = this.config.stroke / 10; // cm
        const singleCylCc = (Math.PI / 4) * (b * b) * s; // cm³ (cc)
        const totalCc = 6 * singleCylCc;
        const totalLiters = totalCc / 1000;
        return {
            singleCylCc: Math.round(singleCylCc * 10) / 10,
            totalCc: Math.round(totalCc),
            totalLiters: Math.round(totalLiters * 100) / 100
        };
    }

    getSnapshot() {
        const { crankRadius: r, rodLength: l, vAngleDeg, crankInertia: J } = this.config;
        const halfBank = (vAngleDeg / 2) * (Math.PI / 180);
        const displacement = this.getDisplacement();

        const cylinders = [];
        for (let i = 0; i < 6; i++) {
            const phase  = V6_CONFIG.PHASE_OFFSETS[i];
            const bankRad = i < 3 ? -halfBank : +halfBank;
            const θ = this.crankAngle + phase;

            const sinθ = Math.sin(θ);
            const cosθ = Math.cos(θ);
            const pistonDist = r * cosθ + Math.sqrt(Math.max(1, l * l - r * r * sinθ * sinθ));

            const px = Math.sin(bankRad) * pistonDist;
            const py = -Math.cos(bankRad) * pistonDist;

            const crankPinX = r * Math.sin(θ);
            const crankPinY = -r * Math.cos(θ);

            const dxRod = px - crankPinX;
            const dyRod = py - crankPinY;
            const rodAngle = Math.atan2(dyRod, dxRod);

            cylinders.push({
                index:             i,
                cylinderNumber:    i + 1,
                phaseOffset:       phase,
                bank:              i < 3 ? 'left' : 'right',
                bankRad,
                stroke:            this.strokePhases[i],
                strokeName:        ['INTAKE', 'COMPRESSION', 'POWER', 'EXHAUST'][this.strokePhases[i]],
                pistonPos:         { x: px, y: py },
                crankPinPos:       { x: crankPinX, y: crankPinY },
                rodAngle,
                combustionGlow:    this.combustionGlow[i],
                normalizedPos:     this.pistonPositions[i],
                velocity:          this.pistonVelocities[i],
                acceleration:      this.pistonAccelerations[i],
                intakeValveLift:   this.intakeValveLifts[i],
                exhaustValveLift:  this.exhaustValveLifts[i],
            });
        }

        const powerkW = (this.totalTorque * Math.abs(this.angularVelocity)) / 1000;
        const powerHP = powerkW * 1.34102;
        const flywheelKineticEnergy = 0.5 * J * (this.angularVelocity * this.angularVelocity);

        return {
            time:                 this.time,
            crankAngle:           this.crankAngle,
            crankAngleDeg:        ((this.crankAngle * 180 / Math.PI) % 360 + 360) % 360,
            cycleAngleDeg:        ((this.crankAngle * 180 / Math.PI) % 720 + 720) % 720,
            RPM:                  this.RPM,
            angularVelocity:      this.angularVelocity,
            totalTorque:          this.totalTorque,
            powerOutputkW:        powerkW,
            powerOutputHP:        powerHP,
            flywheelKineticEnergy: flywheelKineticEnergy,
            displacement,
            config:               { ...this.config },
            cylinders,
            history:              this.simulationHistory.slice(-200),
        };
    }

    _step(dt) {
        const { crankRadius: r, rodLength: l, crankInertia: J, throttle } = this.config;
        const omega = this.angularVelocity;

        let netTorque = 0;

        for (let i = 0; i < 6; i++) {
            const phase = V6_CONFIG.PHASE_OFFSETS[i];
            const θ_i  = this.crankAngle + phase;

            this.strokePhases[i] = getCylinderStroke(this.crankAngle, phase);
            this.intakeValveLifts[i] = getIntakeValveLift(this.crankAngle, phase);
            this.exhaustValveLifts[i] = getExhaustValveLift(this.crankAngle, phase);

            const combMult = getCombustionMultiplier(this.crankAngle, phase) * throttle;
            const combForce = this.config.combustionForce * combMult;
            this.combustionGlow[i] = combMult;

            if (combForce > 0 && this.strokePhases[i] === STROKE.POWER) {
                const sinθ = Math.sin(θ_i);
                const rodAngle = Math.asin(Math.max(-1, Math.min(1, (r / l) * sinθ)));
                const torqueArm = (r * sinθ) / Math.max(Math.cos(rodAngle), 0.01);
                netTorque += combForce * (torqueArm / 1000);
            }

            const sinθ = Math.sin(θ_i);
            const cosθ = Math.cos(θ_i);
            const denom = Math.sqrt(Math.max(1, l * l - r * r * sinθ * sinθ));
            const pistonDist = r * cosθ + denom;
            
            const maxDist = r + l, minDist = l - r;
            this.pistonPositions[i] = 2 * (pistonDist - minDist) / (maxDist - minDist) - 1;

            // Analytical velocity (m/s assuming mm units scaled to m)
            const vp_mms = -r * omega * (sinθ + (r * Math.sin(2 * θ_i)) / (2 * denom));
            this.pistonVelocities[i] = vp_mms / 1000;

            // Analytical acceleration (m/s²)
            const ap_mms2 = -r * omega * omega * (cosθ + (r * Math.cos(2 * θ_i)) / l);
            this.pistonAccelerations[i] = ap_mms2 / 1000;
        }

        const frictionSign = this.angularVelocity > 0 ? -1 : 1;
        const viscousFriction = -0.05 * this.angularVelocity; 
        const loadResistance = -Math.abs(this.config.loadTorque) * Math.sign(this.angularVelocity || 1);

        netTorque += this.config.frictionTorque * frictionSign + viscousFriction + loadResistance;

        const targetOmega = (this.targetRPM * 2 * Math.PI) / 60;
        const omegaError  = targetOmega - this.angularVelocity;
        const governorTorque = 1.5 * omegaError - 0.5 * (omegaError / dt);
        netTorque += Math.max(-5000, Math.min(5000, governorTorque));

        this.totalTorque = netTorque;

        const angularAccel = netTorque / Math.max(J, 0.01);
        this.angularVelocity += angularAccel * dt;

        const minOmega = (200 * 2 * Math.PI) / 60;  
        const maxOmega = (8000 * 2 * Math.PI) / 60; 
        this.angularVelocity = Math.max(-maxOmega, Math.min(maxOmega, this.angularVelocity));
        if (Math.abs(this.angularVelocity) < minOmega * 0.1) {
            this.angularVelocity = 0; 
        }

        this.crankAngle += this.angularVelocity * dt;

        if (Math.abs(this.crankAngle) > 1e8) {
            this.crankAngle = this.crankAngle % (4 * Math.PI);
        }

        this.RPM = Math.abs(this.angularVelocity * 60 / (2 * Math.PI));
        this.time += dt;

        if (Math.round(this.time / dt) % 4 === 0) { 
            this.simulationHistory.push({
                t:         this.time,
                rpm:       this.RPM,
                torque:    this.totalTorque,
                powerkW:   (this.totalTorque * Math.abs(this.angularVelocity)) / 1000,
                piston0:   this.pistonPositions[0],
                activeCyl: this.strokePhases.indexOf(STROKE.POWER),
            });
            if (this.simulationHistory.length > 400) {
                this.simulationHistory.shift();
            }
        }
    }

    reset() {
        this.crankAngle           = 0;
        this.angularVelocity      = (this.config.initialRPM * 2 * Math.PI) / 60;
        this.pistonPositions      = new Array(6).fill(0);
        this.pistonVelocities     = new Array(6).fill(0);
        this.pistonAccelerations  = new Array(6).fill(0);
        this.combustionGlow       = new Array(6).fill(0);
        this.intakeValveLifts     = new Array(6).fill(0);
        this.exhaustValveLifts    = new Array(6).fill(0);
        this.time                 = 0;
        this._accumulator         = 0;
        this.simulationHistory    = [];
    }
}