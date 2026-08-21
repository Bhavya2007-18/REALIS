// ═══════════════════════════════════════════════════════════════════════════════
// REALIS SimulationDemoManager — Stage 1 (Foundation)
// 12 Declarative JSON Scenario Presets (Section 3.2 schema-conformant)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Declarative Preset Schema Library ───────────────────────────────────────
// Each preset is pure data — no imperative construction.
// The loadDemo method hydrates the store from this data.

const PRESETS = {
    projectile_motion: {
        metadata: { id: 'projectile_motion', name: 'Projectile Motion (Parabolic Arc)', version: '1.1' },
        world: { gravity: { x: 0, y: 9.81, z: 0 }, timestep: 0.016, substeps: 4 },
        lab: {
            type: 'projectile', v0: 20, angle: 45, y0: 0, gravity: 9.81
        },
        bodies: [
            { id: 'ground', type: 'rect', x: -20, y: 470, width: 640, height: 10, stroke: '#64748b', fill: 'rgba(100,116,139,0.4)', isStatic: true, friction: 0.5, restitution: 0.3 },
            { id: 'projectile', type: 'sphere', position: [-20, 440, 0], params: { radius: 8 }, color: '#f59e0b', mass: 1, restitution: 0.3, friction: 0.2, initialVelocity: { x: 0, y: 0, z: 0 } }
        ],
        materials: [], forces: [], constraints: [],
        simulation: { time_scale: 1.0 },
        overlay: { title: 'Projectile Motion', description: 'Parabolic trajectory from kinematic equations\nvx = v₀cosθ (constant) · vy = v₀sinθ - gt\nDefault: v₀=20 m/s, θ=45°, T≈2.88s, R≈40.77m, H≈10.19m' }
    },

    single_pendulum: {
        metadata: { id: 'single_pendulum', name: 'Single Pendulum', version: '1.0' },
        world: { gravity: { x: 0, y: 9.81, z: 0 }, timestep: 0.016, substeps: 4 },
        lab: {
            type: 'pendulum', length: 2.0, angle0: 60, gravity: 9.81
        },
        bodies: [
            { id: 'pivot', type: 'sphere', position: [0, 50, 0], params: { radius: 3 }, color: '#fbbf24', isStatic: true },
            { id: 'bob', type: 'sphere', position: [80, 50, 0], params: { radius: 8 }, color: '#3b82f6', mass: 5.0, restitution: 0.2 }
        ],
        materials: [], forces: [],
        constraints: [{ type: 'distance', targetA: 'pivot', targetB: 'bob', distance: 80 }],
        simulation: { time_scale: 1.0 },
        overlay: { title: 'Simple Pendulum', description: 'Distance Constraint\nPE ↔ KE Energy Exchange' }
    },

    double_pendulum: {
        metadata: { id: 'double_pendulum', name: 'Double Pendulum (Chaos Lab)', version: '2.0' },
        world: { gravity: { x: 0, y: 9.81, z: 0 }, timestep: 0.016, substeps: 8 },
        lab: {
            type: 'double_pendulum', mass1: 1, mass2: 1,
            length1: 1.0, length2: 1.0,
            theta1: 120, theta2: 120, omega1: 0, omega2: 0,
            gravity: 9.81, damping: 0
        },
        bodies: [
            { id: 'anchor', type: 'sphere', position: [0, 30, 0], params: { radius: 3 }, color: '#fbbf24', isStatic: true },
            { id: 'bob1', type: 'sphere', position: [50, 30, 0], params: { radius: 7 }, color: '#3b82f6', mass: 3.0 },
            { id: 'bob2', type: 'sphere', position: [100, 30, 0], params: { radius: 6 }, color: '#8b5cf6', mass: 2.0 }
        ],
        materials: [], forces: [],
        constraints: [
            { type: 'distance', targetA: 'anchor', targetB: 'bob1', distance: 50 },
            { type: 'distance', targetA: 'bob1', targetB: 'bob2', distance: 50 }
        ],
        simulation: { time_scale: 1.0 },
        overlay: { title: 'Double Pendulum', description: 'Chaotic Dynamics (RK4)\nCoupled nonlinear equations\nθ₁ ↔ θ₂ coupling' }
    },

    spring_oscillator: {
        metadata: { id: 'spring_oscillator', name: 'Spring Oscillator', version: '1.0' },
        world: { gravity: { x: 0, y: 9.81, z: 0 }, timestep: 0.016, substeps: 4 },
        bodies: [
            { id: 'anchor', type: 'sphere', position: [0, 30, 0], params: { radius: 4 }, color: '#64748b', isStatic: true },
            { id: 'mass', type: 'sphere', position: [0, 130, 0], params: { radius: 10 }, color: '#10b981', mass: 2.0, restitution: 0.3 }
        ],
        materials: [], forces: [],
        constraints: [{ type: 'spring', targetA: 'anchor', targetB: 'mass', distance: 60, stiffness: 40, damping: 1.5 }],
        simulation: { time_scale: 1.0 },
        overlay: { title: 'Spring Oscillator', description: 'Simple Harmonic Motion\nHooke\'s Law: F = -kx' }
    },

    elastic_inelastic_collision: {
        metadata: { id: 'elastic_inelastic_collision', name: 'Elastic & Inelastic Collisions', version: '1.0' },
        world: { gravity: { x: 0, y: 0, z: 0 }, timestep: 0.016, substeps: 4 },
        bodies: [
            { id: 'sphereA', type: 'sphere', position: [-80, 100, 0], params: { radius: 12 }, color: '#ef4444', mass: 1.0, restitution: 1.0, friction: 0, initialVelocity: { x: 40, y: 0, z: 0 } },
            { id: 'sphereB', type: 'sphere', position: [80, 100, 0], params: { radius: 12 }, color: '#3b82f6', mass: 1.0, restitution: 1.0, friction: 0, initialVelocity: { x: -40, y: 0, z: 0 } },
            { id: 'sphereC', type: 'sphere', position: [-80, 200, 0], params: { radius: 12 }, color: '#f59e0b', mass: 1.0, restitution: 0.0, friction: 0, initialVelocity: { x: 40, y: 0, z: 0 } },
            { id: 'sphereD', type: 'sphere', position: [80, 200, 0], params: { radius: 12 }, color: '#10b981', mass: 1.0, restitution: 0.0, friction: 0, initialVelocity: { x: -40, y: 0, z: 0 } }
        ],
        materials: [], forces: [], constraints: [],
        simulation: { time_scale: 1.0 },
        overlay: { title: 'Elastic vs Inelastic Collision', description: 'Top: e=1.0 (Elastic)\nBottom: e=0.0 (Perfectly Inelastic)' }
    },

    domino_chain: {
        metadata: { id: 'domino_chain', name: 'Domino Chain Reaction', version: '1.0' },
        world: { gravity: { x: 0, y: 9.81, z: 0 }, timestep: 0.016, substeps: 4 },
        bodies: [
            { id: 'ground', type: 'rect', x: -200, y: 200, width: 500, height: 15, stroke: '#475569', fill: 'rgba(71,85,105,0.4)', isStatic: true, friction: 0.8 },
            ...Array.from({ length: 12 }, (_, i) => ({
                id: `domino_${i}`, type: 'rect',
                x: -120 + i * 25, y: 160, width: 6, height: 40,
                stroke: '#e2e8f0', fill: i === 0 ? 'rgba(239,68,68,0.5)' : 'rgba(248,250,252,0.3)',
                mass: 0.5, restitution: 0.15, friction: 0.6,
                rotation: i === 0 ? 12 : 0
            }))
        ],
        materials: [], forces: [], constraints: [],
        simulation: { time_scale: 1.0 },
        overlay: { title: 'Domino Chain Reaction', description: 'Contact impulse propagation\n12 domino sequence' }
    },

    orbital_mechanics: {
        metadata: { id: 'orbital_mechanics', name: 'Orbital Mechanics', version: '2.0' },
        world: { gravity: { x: 0, y: 0, z: 0 }, timestep: 0.1, substeps: 8, pointGravity: { center: { x: 0, y: 0, z: 0 }, strength: 0 } },
        lab: {
            type: 'orbital',
            mu: 3986.0, centralRadius: 15, satelliteMass: 1000,
            r0: 100, theta0: 0, v0: Math.sqrt(3986 / 100), velAngle: 90,
            dt: 0.1, timeScale: 5.0
        },
        bodies: [
            { id: 'central_body', type: 'sphere', position: [0, 0, 0], params: { radius: 18 }, color: '#fbbf24', mass: 6e22, isStatic: true },
            { id: 'satellite', type: 'sphere', position: [100, 0, 0], params: { radius: 5 }, color: '#38bdf6', mass: 1000, initialVelocity: { x: 0, y: Math.sqrt(3986 / 100), z: 0 } }
        ],
        materials: [], forces: [], constraints: [],
        simulation: { time_scale: 5.0 },
        overlay: { title: 'Orbital Mechanics', description: 'Newtonian two-body gravity · RK4 integration\nv = √(μ/r) circular orbit preset' }
    },

    pulley_system: {
        metadata: { id: 'pulley_system', name: 'Pulley System', version: '1.0' },
        world: { gravity: { x: 0, y: 9.81, z: 0 }, timestep: 0.016, substeps: 4 },
        bodies: [
            { id: 'pulley', type: 'sphere', position: [0, 30, 0], params: { radius: 5 }, color: '#64748b', isStatic: true },
            { id: 'mass_left', type: 'sphere', position: [-40, 100, 0], params: { radius: 10 }, color: '#ef4444', mass: 5.0 },
            { id: 'mass_right', type: 'sphere', position: [40, 80, 0], params: { radius: 8 }, color: '#3b82f6', mass: 3.0 }
        ],
        materials: [], forces: [],
        constraints: [
            { type: 'distance', targetA: 'pulley', targetB: 'mass_left', distance: 80 },
            { type: 'distance', targetA: 'pulley', targetB: 'mass_right', distance: 60 }
        ],
        simulation: { time_scale: 1.0 },
        overlay: { title: 'Pulley System', description: 'Counterweighted masses\nTension constraint over pivot' }
    },

    four_bar_linkage: {
        metadata: { id: 'four_bar_linkage', name: 'Four-Bar Linkage', version: '1.0' },
        world: { gravity: { x: 0, y: 9.81, z: 0 }, timestep: 0.016, substeps: 6 },
        bodies: [
            { id: 'pin_a', type: 'sphere', position: [-50, 100, 0], params: { radius: 3 }, color: '#64748b', isStatic: true },
            { id: 'pin_d', type: 'sphere', position: [50, 100, 0], params: { radius: 3 }, color: '#64748b', isStatic: true },
            { id: 'link_b', type: 'sphere', position: [-50, 40, 0], params: { radius: 5 }, color: '#3b82f6', mass: 1.0 },
            { id: 'link_c', type: 'sphere', position: [50, 40, 0], params: { radius: 5 }, color: '#ef4444', mass: 1.0 }
        ],
        materials: [], forces: [],
        constraints: [
            { type: 'distance', targetA: 'pin_a', targetB: 'link_b', distance: 60 },
            { type: 'distance', targetA: 'link_b', targetB: 'link_c', distance: 100 },
            { type: 'distance', targetA: 'pin_d', targetB: 'link_c', distance: 60 }
        ],
        simulation: { time_scale: 1.0 },
        overlay: { title: 'Four-Bar Linkage', description: 'Closed-loop mechanism\nRevolute pin joints' }
    },

    v6_engine_simulation: {
        metadata: { id: 'v6_engine_simulation', name: 'V6 Engine Demonstrator', version: '2.0' },
        world: { gravity: { x: 0, y: 0, z: 0 }, timestep: 0.016, substeps: 8 },
        bodies: [
            // Central crank pivot (static, rendered at origin)
            { id: 'v6_crank_center', type: 'sphere', position: [0, 0, 0], params: { radius: 4, segments: 32 }, color: '#fbbf24', isStatic: true },
            // Crankshaft spine (cylinder along Z axis, rotated by adapter)
            { id: 'v6_crankshaft', type: 'cylinder', position: [0, 0, 0], params: { radiusTop: 2, radiusBottom: 2, height: 30, segments: 16 }, color: '#94a3b8', isStatic: true },
            // Flywheel disc
            { id: 'v6_flywheel', type: 'cylinder', position: [0, 0, -15], params: { radiusTop: 8, radiusBottom: 8, height: 3, segments: 32 }, color: '#475569', isStatic: true },
            // 6 cylinders: crank_throw, con_rod, piston
            ...Array.from({ length: 6 }, (_, i) => [
                {
                    id: `v6_crank_throw_${i}`, type: 'cube',
                    position: [0, 0, 0], params: { width: 3, height: 8, depth: 3 },
                    color: '#64748b'
                },
                {
                    id: `v6_con_rod_${i}`, type: 'cube',
                    position: [0, 0, 0], params: { width: 1.5, height: 26, depth: 1.5 },
                    color: i < 3 ? '#3b82f6' : '#8b5cf6'
                },
                {
                    id: `v6_piston_${i}`, type: 'cube',
                    position: [0, 0, 0], params: { width: 7, height: 5, depth: 7 },
                    color: '#e2e8f0', mass: 0.45, restitution: 0.1, friction: 0.2
                }
            ]).flat()
        ],
        materials: [], forces: [],
        constraints: [],
        simulation: { time_scale: 1.0 },
        overlay: { title: 'V6 Engine', description: 'Mathematical simulation of a 6-cylinder internal combustion engine.' }
    },

    revolute_crank_slider: {
        metadata: { id: 'revolute_crank_slider', name: 'Crank-Slider Mechanism', version: '1.0' },
        world: { gravity: { x: 0, y: 9.81, z: 0 }, timestep: 0.016, substeps: 6 },
        bodies: [
            { id: 'crank_pivot', type: 'sphere', position: [0, 100, 0], params: { radius: 4 }, color: '#fbbf24', isStatic: true },
            { id: 'crank_tip', type: 'sphere', position: [40, 100, 0], params: { radius: 5 }, color: '#3b82f6', mass: 1.0, initialVelocity: { x: 0, y: -30, z: 0 } },
            { id: 'slider', type: 'rect', x: 80, y: 95, width: 20, height: 10, stroke: '#10b981', fill: 'rgba(16,185,129,0.3)', mass: 2.0, friction: 0.2 }
        ],
        materials: [], forces: [],
        constraints: [
            { type: 'distance', targetA: 'crank_pivot', targetB: 'crank_tip', distance: 40 },
            { type: 'distance', targetA: 'crank_tip', targetB: 'slider', distance: 50 }
        ],
        simulation: { time_scale: 1.0 },
        overlay: { title: 'Crank-Slider Mechanism', description: 'Rotational → Linear conversion\nDistance constraints' }
    },

    inclined_friction_ramp: {
        metadata: { id: 'inclined_friction_ramp', name: 'Inclined Friction Ramp', version: '2.0' },
        world: { gravity: { x: 0, y: 9.81, z: 0 }, timestep: 1 / 120, substeps: 1 },
        lab: {
            type: 'inclined_ramp',
            mass: 2, gravity: 9.81, thetaDeg: 30,
            muStatic: 0.5, muKinetic: 0.3,
            rampLength: 5, startPos: 3, startVel: 0,
            dt: 1 / 120, timeScale: 1
        },
        bodies: [],
        materials: [], forces: [], constraints: [],
        simulation: { time_scale: 1.0 },
        overlay: { title: 'Inclined Friction Ramp', description: 'Static & kinetic friction on an incline · RK4 integration\nθ=30° with μ_s=0.5 (θ_c≈26.6°) — block slides' }
    },
    free_fall: {
        metadata: { id: 'free_fall', name: 'Free Fall (100m Drop)', version: '1.0' },
        world: { gravity: { x: 0, y: 9.81, z: 0 }, timestep: 0.016, substeps: 8 },
        bodies: [
            { id: 'ground', type: 'rect', x: -250, y: 380, width: 600, height: 25, stroke: '#64748b', fill: 'rgba(100,116,139,0.5)', isStatic: true, friction: 0.6, restitution: 0.35 },
            { id: 'falling_sphere', type: 'sphere', position: [0, 80, 0], params: { radius: 18 }, color: '#3b82f6', fill: 'rgba(59,130,246,0.3)', stroke: '#3b82f6', mass: 10.0, restitution: 0.45, friction: 0.2, initialVelocity: { x: 0, y: 0, z: 0 } }
        ],
        materials: [],
        forces: [],
        constraints: [],
        simulation: { time_scale: 1.0 },
        overlay: { title: 'Free Fall (100m Drop)', description: 'Sphere dropped from height under Earth gravity (9.81 m/s²)\nHard surface impact, precise bounce, and rest via backend physics' }
    }
};

// ─── Preset Catalog (for UI rendering) ───────────────────────────────────────
export const PRESET_CATALOG = Object.entries(PRESETS).map(([key, preset]) => ({
    id: key,
    name: preset.metadata.name,
    description: preset.overlay?.description || ''
}));

// ─── Demo Manager ────────────────────────────────────────────────────────────
export class SimulationDemoManager {
    static getPresetData(presetId) {
        const id = presetId === 'crank_slider' ? 'revolute_crank_slider' : presetId;
        return PRESETS[id] || null;
    }

    static loadDemo(presetId, store) {
        const id = presetId === 'crank_slider' ? 'revolute_crank_slider' : presetId;
        const preset = PRESETS[id];
        if (!preset) return;

        const { clearDesign, addCADObject, addShape3D, addConstraint, setSimulationSettings, setDemoOverlay, resetPlayback, setIsPlaying, setSimulationState, setSimulationPreset, setIs3DView } = store;
        clearDesign();
        if (resetPlayback) resetPlayback();
        if (setSimulationState) setSimulationState({ time: 0, energy: { kinetic: 0, potential: 0, total: 0 } });
        if (setSimulationPreset) setSimulationPreset(presetId);
        if (setIs3DView && presetId === 'v6_engine_simulation') setIs3DView(true);

        // Load world settings
        const world = preset.world;
        const settings = {
            gravity: world.gravity,
            timeStep: world.timestep,
            subSteps: world.substeps
        };
        if (world.pointGravity) settings.pointGravity = world.pointGravity;
        setSimulationSettings(settings);

        // Load bodies safely
        preset.bodies.forEach(body => {
            const posX = body.position ? (Array.isArray(body.position) ? body.position[0] : (body.position.x ?? 0)) : (body.x ?? 0);
            const posY = body.position ? (Array.isArray(body.position) ? body.position[1] : (body.position.y ?? 0)) : (body.y ?? 0);
            const posZ = body.position ? (Array.isArray(body.position) ? body.position[2] : (body.position.z ?? 0)) : (body.z ?? 0);

            const formattedBody = {
                ...body,
                position: [posX, posY, posZ]
            };

            if (typeof addCADObject === 'function') {
                addCADObject(formattedBody);
            } else if (typeof addShape3D === 'function') {
                addShape3D(formattedBody);
            }
        });

        // Load constraints
        if (preset.constraints) {
            preset.constraints.forEach(c => addConstraint({ ...c }));
        }

        // Set overlay
        if (preset.overlay) {
            setDemoOverlay(preset.overlay);
        }

        // Auto-start active physical simulation playback
        if (setIsPlaying) setIsPlaying(true);
    }

    // Legacy compat methods
    static setupGravityDemo(store) { this.loadDemo('projectile_motion', store); }
    static setupPendulumDemo(store) { this.loadDemo('single_pendulum', store); }
    static setupCollisionDemo(store) { this.loadDemo('elastic_inelastic_collision', store); }
    static setupDominoDemo(store) { this.loadDemo('domino_chain', store); }
    static setupOrbitDemo(store) { this.loadDemo('orbital_mechanics', store); }
}