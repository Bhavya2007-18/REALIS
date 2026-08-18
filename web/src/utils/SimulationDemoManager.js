// ═══════════════════════════════════════════════════════════════════════════════
// REALIS SimulationDemoManager — Stage 1 (Foundation)
// 12 Declarative JSON Scenario Presets (Section 3.2 schema-conformant)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Declarative Preset Schema Library ───────────────────────────────────────
// Each preset is pure data — no imperative construction.
// The loadDemo method hydrates the store from this data.

const PRESETS = {
    projectile_motion: {
        metadata: { id: 'projectile_motion', name: 'Projectile Motion', version: '1.0' },
        world: { gravity: { x: 0, y: 9.81, z: 0 }, timestep: 0.016, substeps: 4 },
        bodies: [
            { id: 'ground', type: 'rect', x: -200, y: 150, width: 500, height: 20, stroke: '#64748b', fill: 'rgba(100,116,139,0.4)', isStatic: true, friction: 0.5, restitution: 0.3 },
            { id: 'target_1', type: 'rect', x: 120, y: 100, width: 20, height: 50, stroke: '#f59e0b', fill: 'rgba(245,158,11,0.3)', mass: 2, restitution: 0.3, friction: 0.5 },
            { id: 'target_2', type: 'rect', x: 150, y: 100, width: 20, height: 50, stroke: '#f59e0b', fill: 'rgba(245,158,11,0.3)', mass: 2, restitution: 0.3, friction: 0.5 },
            { id: 'projectile', type: 'sphere', position: [-100, 120, 0], params: { radius: 8 }, color: '#ef4444', mass: 3, restitution: 0.4, friction: 0.3, initialVelocity: { x: 80, y: -60, z: 0 } }
        ],
        materials: [], forces: [], constraints: [],
        simulation: { time_scale: 1.0 },
        overlay: { title: 'Projectile Motion', description: 'Parabolic trajectory with gravity\nImpact against target blocks' }
    },

    single_pendulum: {
        metadata: { id: 'single_pendulum', name: 'Single Pendulum', version: '1.0' },
        world: { gravity: { x: 0, y: 9.81, z: 0 }, timestep: 0.016, substeps: 4 },
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
        metadata: { id: 'double_pendulum', name: 'Double Pendulum', version: '1.0' },
        world: { gravity: { x: 0, y: 9.81, z: 0 }, timestep: 0.016, substeps: 8 },
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
        overlay: { title: 'Double Pendulum', description: 'Chaotic Dynamics\nSensitive to Initial Conditions' }
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
        metadata: { id: 'orbital_mechanics', name: 'Orbital Mechanics', version: '1.0' },
        world: { gravity: { x: 0, y: 0, z: 0 }, timestep: 0.016, substeps: 8, pointGravity: { center: { x: 0, y: 0, z: 0 }, strength: 5000000 } },
        bodies: [
            { id: 'sun', type: 'sphere', position: [0, 0, 0], params: { radius: 18 }, color: '#fbbf24', mass: 1000, isStatic: true },
            { id: 'planet1', type: 'sphere', position: [120, 0, 0], params: { radius: 5 }, color: '#3b82f6', mass: 1.0, initialVelocity: { x: 0, y: 65, z: 0 } },
            { id: 'planet2', type: 'sphere', position: [200, 0, 0], params: { radius: 4 }, color: '#ef4444', mass: 0.5, initialVelocity: { x: 0, y: 48, z: 0 } }
        ],
        materials: [], forces: [], constraints: [],
        simulation: { time_scale: 1.0 },
        overlay: { title: 'Orbital Mechanics', description: 'Inverse-square gravity\nKeplerian orbits' }
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

    v6_engine_demonstrator: {
        metadata: { id: 'v6_engine_demonstrator', name: 'V6 Engine Demonstrator', version: '1.0' },
        world: { gravity: { x: 0, y: 0, z: 0 }, timestep: 0.016, substeps: 8 },
        bodies: [
            { id: 'crank_center', type: 'sphere', position: [0, 150, 0], params: { radius: 6 }, color: '#fbbf24', isStatic: true },
            ...Array.from({ length: 6 }, (_, i) => {
                const angle = (i * 60) * Math.PI / 180;
                const crankR = 35;
                return {
                    id: `piston_${i}`, type: 'sphere',
                    position: [Math.cos(angle) * crankR * 2.5, 150 + Math.sin(angle) * crankR * 2.5, 0],
                    params: { radius: 6 }, color: i < 3 ? '#3b82f6' : '#ef4444',
                    mass: 0.45, restitution: 0.1, friction: 0.2
                };
            })
        ],
        materials: [], forces: [],
        constraints: Array.from({ length: 6 }, (_, i) => ({
            type: 'distance', targetA: 'crank_center', targetB: `piston_${i}`, distance: 87.5
        })),
        simulation: { time_scale: 1.0 },
        overlay: { title: 'V6 Engine Demonstrator', description: '6-cylinder radial assembly\nCrankshaft constraint dynamics' }
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
        metadata: { id: 'inclined_friction_ramp', name: 'Inclined Friction Ramp', version: '1.0' },
        world: { gravity: { x: 0, y: 9.81, z: 0 }, timestep: 0.016, substeps: 4 },
        bodies: [
            { id: 'ramp', type: 'rect', x: -60, y: 120, width: 200, height: 10, rotation: -20, stroke: '#64748b', fill: 'rgba(100,116,139,0.4)', isStatic: true, friction: 0.4 },
            { id: 'ground', type: 'rect', x: -100, y: 200, width: 400, height: 15, stroke: '#475569', fill: 'rgba(71,85,105,0.4)', isStatic: true, friction: 0.5 },
            { id: 'block_low_friction', type: 'rect', x: -100, y: 80, width: 20, height: 20, stroke: '#3b82f6', fill: 'rgba(59,130,246,0.3)', mass: 1.0, friction: 0.1, restitution: 0.2 },
            { id: 'block_high_friction', type: 'rect', x: -70, y: 60, width: 20, height: 20, stroke: '#ef4444', fill: 'rgba(239,68,68,0.3)', mass: 1.0, friction: 0.8, restitution: 0.2 }
        ],
        materials: [], forces: [], constraints: [],
        simulation: { time_scale: 1.0 },
        overlay: { title: 'Inclined Friction Ramp', description: 'Static vs Dynamic Friction\nBlue: μ=0.1 | Red: μ=0.8' }
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
        return PRESETS[presetId] || null;
    }

    static loadDemo(presetId, store) {
        const preset = PRESETS[presetId];
        if (!preset) return;

        const { clearDesign, addCADObject, addShape3D, addConstraint, setSimulationSettings, setDemoOverlay, resetPlayback, setIsPlaying, setSimulationState } = store;
        clearDesign();
        if (resetPlayback) resetPlayback();
        if (setSimulationState) setSimulationState({ time: 0, energy: { kinetic: 0, potential: 0, total: 0 } });

        // Load world settings
        const world = preset.world;
        const settings = {
            gravity: world.gravity,
            timeStep: world.timestep,
            subSteps: world.substeps
        };
        if (world.pointGravity) settings.pointGravity = world.pointGravity;
        setSimulationSettings(settings);

        // Load bodies
        preset.bodies.forEach(body => {
            if (body.position || body.type === 'sphere' || body.params) {
                addShape3D({ ...body });
            } else {
                addCADObject({ ...body });
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