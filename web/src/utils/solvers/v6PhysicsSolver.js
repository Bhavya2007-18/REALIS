





export const V6_CONFIG = {
    NUM_CYLINDERS: 6,
    
    PHASE_OFFSETS: [0, 2.094, 4.189, 1.047, 3.141, 5.236],
    
    BANK_ANGLES_RAD: [
        -0.5236, -0.5236, -0.5236, 
        +0.5236, +0.5236, +0.5236  
    ],
    
    V_ANGLE_DEG: 60,
    
    FIRING_ORDER: [0, 3, 1, 4, 2, 5],
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

export default class V6PhysicsSolver {
    
    constructor(config = {}) {
        this.config = {
            crankRadius:     config.crankRadius     ?? 45,      
            rodLength:       config.rodLength        ?? 130,
            pistonMass:      config.pistonMass       ?? 0.45,    
            crankInertia:    config.crankInertia     ?? 0.35,    
            initialRPM:      config.initialRPM       ?? 800,
            combustionForce: config.combustionForce  ?? 30000,   
            frictionTorque:  config.frictionTorque   ?? 20,      
            vAngleDeg:       config.vAngleDeg        ?? 60,
            timeStep:        config.timeStep         ?? 1 / 240, 
            gravityEnabled:  config.gravityEnabled   ?? false,
        };

        
        
        this.crankAngle = 0;
        
        this.angularVelocity = (this.config.initialRPM * 2 * Math.PI) / 60;

        
        this.pistonPositions  = new Array(6).fill(0); 
        this.pistonVelocities = new Array(6).fill(0); 
        this.strokePhases     = new Array(6).fill(STROKE.INTAKE);
        this.combustionGlow   = new Array(6).fill(0); 

        
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

    
    getSnapshot() {
        const { crankRadius: r, rodLength: l, vAngleDeg } = this.config;
        const halfBank = (vAngleDeg / 2) * (Math.PI / 180);

        
        const cylinders = [];
        for (let i = 0; i < 6; i++) {
            const phase  = V6_CONFIG.PHASE_OFFSETS[i];
            const bankRad = i < 3 ? -halfBank : +halfBank;
            const θ = this.crankAngle + phase;

            
            
            
            const sinθ = Math.sin(θ);
            const cosθ = Math.cos(θ);
            const pistonDist = r * cosθ + Math.sqrt(l * l - r * r * sinθ * sinθ);

            
            const px = Math.sin(bankRad) * pistonDist;
            const py = -Math.cos(bankRad) * pistonDist;

            
            const crankPinX = r * Math.sin(θ);
            const crankPinY = -r * Math.cos(θ);

            
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
                normalizedPos: this.pistonPositions[i], 
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
            powerOutput:      this.totalTorque * Math.abs(this.angularVelocity) / 1000, 
            history:          this.simulationHistory.slice(-200),
        };
    }

    

    _step(dt) {
        const { crankRadius: r, rodLength: l, crankInertia: J } = this.config;

        
        let netTorque = 0;

        for (let i = 0; i < 6; i++) {
            const phase = V6_CONFIG.PHASE_OFFSETS[i];
            const θ_i  = this.crankAngle + phase;

            
            this.strokePhases[i] = getCylinderStroke(this.crankAngle, phase);

            
            const combMult = getCombustionMultiplier(this.crankAngle, phase);
            const combForce = this.config.combustionForce * combMult;

            
            this.combustionGlow[i] = combMult;

            
            
            
            if (combForce > 0 && this.strokePhases[i] === STROKE.POWER) {
                const sinθ = Math.sin(θ_i);
                const rodAngle = Math.asin((r / l) * sinθ);
                const torqueArm = r * sinθ / Math.max(Math.cos(rodAngle), 0.01);
                
                netTorque += combForce * (torqueArm / 1000);
            }

            
            const sinθ = Math.sin(θ_i);
            const pistonDist = r * Math.cos(θ_i) + Math.sqrt(l * l - r * r * sinθ * sinθ);
            
            const maxDist = r + l, minDist = l - r;
            this.pistonPositions[i] = 2 * (pistonDist - minDist) / (maxDist - minDist) - 1;
        }

        
        
        const frictionSign = this.angularVelocity > 0 ? -1 : 1;
        const viscousFriction = -0.05 * this.angularVelocity; 
        netTorque += this.config.frictionTorque * frictionSign + viscousFriction;

        
        const targetOmega = (this.targetRPM * 2 * Math.PI) / 60;
        const omegaError  = targetOmega - this.angularVelocity;
        
        const governorTorque = 1.5 * omegaError - 0.5 * (omegaError / dt);
        netTorque += Math.max(-5000, Math.min(5000, governorTorque));

        this.totalTorque = netTorque;

        
        
        const angularAccel = netTorque / J;
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