// ═══════════════════════════════════════════════════════════════════════════════
// REALIS CrankSliderPhysicsSolver — Planar Crank-Slider Kinematics Engine
// Standard horizontal slider configuration:
//   O = fixed crank center (pivot)
//   A = crank pin (rotating at radius r)
//   B = slider/piston (constrained to horizontal guide)
//   r = crank radius
//   L = connecting rod length
//   θ = crank angle (0 = along +x axis, positive CCW)
//   ω = angular velocity (rad/s), α = angular acceleration (rad/s²)
// Kinematics:
//   x = r·cos(θ) + √(L² - r²·sin²(θ))          (slider position from guide origin)
//   v = dx/dt = -r·ω·sin(θ) - (r²·ω·sin(θ)·cos(θ)) / √(L² - r²·sin²(θ))
//   a = d²x/dt² = -r·α·sin(θ) - r·ω²·cos(θ)
//                - r²·α·sin²(θ)·cos(θ)/√(...) - r²·ω²·cos²(θ)/√(...)
//                - r⁴·ω²·sin²(θ)·cos²(θ) / (L² - r²·sin²(θ))^(3/2)
// Constraint: L > r for standard configuration (otherwise no real solution for all θ)
// ═══════════════════════════════════════════════════════════════════════════════

const HISTORY_CAP = 5000;

export class CrankSliderPhysicsSolver {
    constructor(config = {}) {
        this.config = {
            // Geometry
            crankRadius: config.crankRadius ?? 0.1,       // r (m)
            rodLength: config.rodLength ?? 0.3,           // L (m)
            
            // Motion
            theta0: config.theta0 ?? 0.0,                 // initial crank angle (deg)
            omega: config.omega ?? 10.0,                  // angular velocity (rad/s)
            alpha: config.alpha ?? 0.0,                   // angular acceleration (rad/s²)
            
            // Guide offset (slider guide y-position relative to crank center)
            guideOffset: config.guideOffset ?? 0.0,       // y-offset of slider guide (m)
            
            // Integration
            dt: config.dt ?? 0.005,                       // fixed physics timestep (s)
            timeScale: config.timeScale ?? 1.0,           // speed multiplier
            strobeInterval: config.strobeInterval ?? 0.05, // strobe marker interval (s)
            
            // Visual
            crankThickness: config.crankThickness ?? 0.015,
            rodThickness: config.rodThickness ?? 0.012,
            sliderWidth: config.sliderWidth ?? 0.08,
            sliderHeight: config.sliderHeight ?? 0.04,
        };
        this.validateGeometry();
        this.reset();
    }

    validateGeometry() {
        const { crankRadius, rodLength } = this.config;
        if (rodLength <= crankRadius) {
            // Will produce NaN for some angles - clamp rod length to be > crank radius
            this.config.rodLength = crankRadius * 1.01;
        }
    }

    reset() {
        const { theta0, omega, alpha } = this.config;
        this.time = 0.0;
        this.theta = theta0 * Math.PI / 180;  // radians
        this.omega = omega;
        this.alpha = alpha;
        
        this.updateKinematics();
        
        this.strobeHistory = [];
        this.lastStrobeTime = -Infinity;
        this.history = { 
            t: [], theta: [], omega: [], alpha: [], 
            x: [], v: [], a: [] 
        };
        this.recordPoint();
    }

    updateConfig(newConfig = {}) {
        const old = this.config;
        const geoKeys = ['crankRadius', 'rodLength', 'guideOffset'];
        const motionKeys = ['theta0', 'omega', 'alpha'];
        
        const needsGeoReset = geoKeys.some(k => newConfig[k] !== undefined && newConfig[k] !== old[k]);
        const needsMotionReset = motionKeys.some(k => newConfig[k] !== undefined && newConfig[k] !== old[k]);
        
        this.config = { ...old, ...newConfig };
        this.validateGeometry();
        
        if (needsGeoReset || needsMotionReset) {
            this.reset();
        } else {
            this.updateKinematics();
        }
    }

    // Core kinematic calculations
    // x = r·cos(θ) + √(L² - r²·sin²(θ))
    updateKinematics() {
        const { crankRadius, rodLength, guideOffset, omega, alpha } = this.config;
        const r = crankRadius;
        const L = rodLength;
        const th = this.theta;
        const w = this.omega;
        const a = this.alpha;
        
        const sinTh = Math.sin(th);
        const cosTh = Math.cos(th);
        const sin2 = sinTh * sinTh;
        const cos2 = cosTh * cosTh;
        
        // Discriminant for sqrt: L² - r²·sin²(θ)
        const disc = L * L - r * r * sin2;
        const sqrtDisc = disc > 0 ? Math.sqrt(disc) : 0;
        
        // Position
        this.x = r * cosTh + sqrtDisc;
        this.y = guideOffset;  // slider constrained to guide
        
        // Crank pin position
        this.crankPinX = r * cosTh;
        this.crankPinY = r * sinTh;
        
        // Velocity: dx/dt = -r·ω·sin(θ) - (r²·ω·sin(θ)·cos(θ)) / √(L² - r²·sin²(θ))
        if (sqrtDisc > 1e-12) {
            this.v = -r * w * sinTh - (r * r * w * sinTh * cosTh) / sqrtDisc;
        } else {
            // At limit positions (discriminant ≈ 0), velocity is just tangential component
            this.v = -r * w * sinTh;
        }
        
        // Acceleration - full derivative
        // a = -r·α·sin(θ) - r·ω²·cos(θ)
        //     - r²·α·sin²(θ)·cos(θ)/√(...) - r²·ω²·cos²(θ)/√(...)
        //     - r⁴·ω²·sin²(θ)·cos²(θ) / (L² - r²·sin²(θ))^(3/2)
        if (sqrtDisc > 1e-12) {
            const term1 = -r * a * sinTh - r * w * w * cosTh;
            const term2 = -(r * r * a * sin2 * cosTh) / sqrtDisc;
            const term3 = -(r * r * w * w * cos2) / sqrtDisc;
            const term4 = -(r * r * r * r * w * w * sin2 * cos2) / (disc * sqrtDisc);
            this.a = term1 + term2 + term3 + term4;
        } else {
            // At limit positions
            this.a = -r * a * sinTh - r * w * w * cosTh;
        }
        
        // Crank pin velocity & acceleration
        this.crankPinVx = -r * w * sinTh;
        this.crankPinVy = r * w * cosTh;
        this.crankPinAx = -r * a * sinTh - r * w * w * cosTh;
        this.crankPinAy = r * a * cosTh - r * w * w * sinTh;
    }

    step(deltaSeconds) {
        const dt = Math.min(deltaSeconds || this.config.dt, 0.05) * this.config.timeScale;
        
        // Simple Euler integration for angle (sufficient for constant/slowly-varying omega)
        // For high accuracy with varying alpha, use RK4
        if (Math.abs(this.alpha) < 1e-12) {
            // Constant omega - exact
            this.theta += this.omega * dt;
        } else {
            // Varying omega - RK4 for angle
            const k1w = this.omega;
            const k1a = this.alpha;
            const k2w = this.omega + 0.5 * dt * this.alpha;
            const k2a = this.alpha;  // assume constant alpha over step
            const k3w = this.omega + 0.5 * dt * k2a;
            const k3a = this.alpha;
            const k4w = this.omega + dt * k3a;
            const k4a = this.alpha;
            
            this.theta += (dt / 6) * (k1w + 2*k2w + 2*k3w + k4w);
            this.omega += (dt / 6) * (k1a + 2*k2a + 2*k3a + k4a);
        }
        
        // Normalize theta
        this.theta = this.theta % (2 * Math.PI);
        
        this.time += dt;
        this.updateKinematics();
        
        // Strobe record
        if (this.time - this.lastStrobeTime >= this.config.strobeInterval) {
            this.recordPoint();
        }
    }

    recordPoint() {
        this.strobeHistory.push({
            time: this.time,
            theta: this.theta,
            thetaDeg: this.theta * 180 / Math.PI,
            omega: this.omega,
            alpha: this.alpha,
            x: this.x,
            v: this.v,
            a: this.a,
            crankPinX: this.crankPinX,
            crankPinY: this.crankPinY,
        });
        if (this.strobeHistory.length > HISTORY_CAP) {
            this.strobeHistory.splice(0, this.strobeHistory.length - HISTORY_CAP);
        }
        
        // Compact parallel history for graphs
        const h = this.history;
        h.t.push(this.time);
        h.theta.push(this.theta);
        h.omega.push(this.omega);
        h.alpha.push(this.alpha);
        h.x.push(this.x);
        h.v.push(this.v);
        h.a.push(this.a);
        if (h.t.length > HISTORY_CAP) {
            const cut = h.t.length - HISTORY_CAP;
            Object.keys(h).forEach(k => h[k].splice(0, cut));
        }
    }

    getSnapshot() {
        const { crankRadius, rodLength, guideOffset, crankThickness, rodThickness, sliderWidth, sliderHeight } = this.config;
        const r = crankRadius;
        const L = rodLength;
        const th = this.theta;
        
        // Quick validation metrics
        const sinTh = Math.sin(th);
        const disc = L * L - r * r * sinTh * sinTh;
        const validGeometry = disc >= -1e-12;
        
        return {
            time: Number(this.time.toFixed(3)),
            theta: Number(this.theta.toFixed(4)),
            thetaDeg: Number((this.theta * 180 / Math.PI).toFixed(2)),
            omega: Number(this.omega.toFixed(4)),
            alpha: Number(this.alpha.toFixed(4)),
            x: Number(this.x.toFixed(4)),
            y: Number(this.y.toFixed(4)),
            v: Number(this.v.toFixed(4)),
            a: Number(this.a.toFixed(4)),
            crankPinX: Number(this.crankPinX.toFixed(4)),
            crankPinY: Number(this.crankPinY.toFixed(4)),
            crankPinVx: Number(this.crankPinVx.toFixed(4)),
            crankPinVy: Number(this.crankPinVy.toFixed(4)),
            crankPinAx: Number(this.crankPinAx.toFixed(4)),
            crankPinAy: Number(this.crankPinAy.toFixed(4)),
            crankRadius: r,
            rodLength: L,
            guideOffset: guideOffset,
            validGeometry: validGeometry,
            discriminant: Number(disc.toFixed(6)),
            // Config for validation display
            config: { 
                ...this.config,
                crankRadius: r,
                rodLength: L,
                theta0: this.config.theta0,
                omega: this.config.omega,
                alpha: this.config.alpha,
            },
            // History for graphs
            strobeHistory: this.strobeHistory,
            history: this.history
        };
    }

    // Analytical validation at specific angle
    analyticalAtTheta(theta) {
        const { crankRadius, rodLength, guideOffset } = this.config;
        const r = crankRadius;
        const L = rodLength;
        const sinTh = Math.sin(theta);
        const cosTh = Math.cos(theta);
        const disc = L * L - r * r * sinTh * sinTh;
        const sqrtDisc = disc > 0 ? Math.sqrt(disc) : 0;
        return {
            x: r * cosTh + sqrtDisc,
            y: guideOffset,
            valid: disc >= 0
        };
    }
}

export default CrankSliderPhysicsSolver;