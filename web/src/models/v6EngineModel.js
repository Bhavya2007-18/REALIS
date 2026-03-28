/**
 * V6 Engine Model — REALIS
 * ════════════════════════════════════════════════════════════════════════════
 * Generates a geometrically accurate 3D V6 engine block for the 3D Viewport.
 *
 * Architecture:
 *  - All components are native shapes3D (Three.js primitives)
 *  - Positioned in world-space centered at origin
 *  - V-bank at 60° total angle (±30° from vertical)
 *  - 6 cylinders staggered 60mm apart along Z-axis
 *  - Hierarchy: Block → Crankshaft → Crank Throws → ConRods → Pistons
 */

// ─── Engine Geometry Constants ────────────────────────────────────────────────
const CRANK_RADIUS      = 0.045;  // meters (45mm throw)
const ROD_LENGTH        = 0.130;  // meters (130mm)
const PISTON_RADIUS     = 0.042;  // meters (42mm bore)
const PISTON_HEIGHT     = 0.060;  // meters (60mm piston height)
const BORE              = 0.089;  // meters (89mm bore diameter)
const STROKE            = 0.090;  // meters (90mm stroke)
const CYLINDER_LENGTH   = 0.200;  // meters
const ROD_RADIUS        = 0.012;
const CRANK_JOURNAL_R   = 0.025;  // main journal radius
const CRANK_TOTAL_LEN   = 0.400;  // full crankshaft length

// V-bank: 60° total → ±30° each bank from vertical
const BANK_ANGLE_RAD    = Math.PI / 6; // 30 degrees
const CYLINDER_SPACING  = 0.085; // 85mm between cylinder centers (z-axis)
const SCALE             = 200;   // Scale to REALIS units (internal 1 unit ≈ 1px/mm)

function s(m) { return m * SCALE; } // meters → REALIS units

function generateV6Engine() {
    const shapes3D   = [];
    const objects    = [];
    const constraints = [];

    // ── 1. ENGINE BLOCK (Static housing) ─────────────────────────────────────
    // A large static box representing the cast-iron block
    shapes3D.push({
        id:       'v6_block',
        type:     'cube',
        position: [0, s(-0.09), 0],
        rotation: [0, 0, 0],
        scale:    [1, 1, 1],
        params:   { width: s(0.32), height: s(0.18), depth: s(0.60) },
        color:    '#374151',
        roughness: 0.7,
        metalness: 0.4,
        isStatic:  true,
        mass:      65,
        label:     'Cylinder Block',
        opacity:   0.35,  // Semi-transparent so internals are visible
    });

    // ── 2. CRANKSHAFT (Single central rotating shaft) ────────────────────────
    shapes3D.push({
        id:       'v6_crankshaft',
        type:     'cylinder',
        position: [0, 0, 0],
        rotation: [Math.PI / 2, 0, 0], // Rotate to lie along Z-axis
        scale:    [1, 1, 1],
        params: {
            radiusTop:    s(CRANK_JOURNAL_R),
            radiusBottom: s(CRANK_JOURNAL_R),
            height:       s(CRANK_TOTAL_LEN),
            segments:     24,
        },
        color:    '#94a3b8',
        roughness: 0.2,
        metalness: 0.9,
        isStatic:  false,
        mass:      18,
        label:     'Crankshaft',
    });

    // ── 3. FLYWHEEL (at +Z end of crankshaft) ────────────────────────────────
    shapes3D.push({
        id:       'v6_flywheel',
        type:     'cylinder',
        position: [0, 0, s(CRANK_TOTAL_LEN / 2 + 0.02)],
        rotation: [Math.PI / 2, 0, 0],
        scale:    [1, 1, 1],
        params: {
            radiusTop:    s(0.12),
            radiusBottom: s(0.12),
            height:       s(0.030),
            segments:     32,
        },
        color:    '#1e293b',
        roughness: 0.5,
        metalness: 0.8,
        isStatic:  false,
        mass:      8,
        label:     'Flywheel',
    });

    // ── 4. PER-CYLINDER COMPONENTS (6 cylinders) ─────────────────────────────
    // 6 cylinders: 3 left bank (index 0-2), 3 right bank (index 3-5)
    // Each offset along Z-axis by CYLINDER_SPACING
    // Left/Right bank cylinders interleave: z[0]=0, z[1]=85, z[2]=170 (left)
    //                                       z[3]=42, z[4]=127, z[5]=212 (right, offset)

    const phaseOffsets = [0, 2.094, 4.189, 1.047, 3.141, 5.236];

    // Z positions for each cylinder pair
    const zPositions = [
        s(-0.17),  // Cyl 1 (Left)
        s(-0.085), // Cyl 3 (Left)
        s(0),      // Cyl 5 (Left)
        s(-0.127), // Cyl 2 (Right) — offset by half pitch
        s(-0.042), // Cyl 4 (Right)
        s(0.043),  // Cyl 6 (Right)
    ];

    for (let i = 0; i < 6; i++) {
        const isLeft = i < 3;
        const bankSign  = isLeft ? -1 : +1;
        const bankRad   = bankSign * BANK_ANGLE_RAD;
        const phase     = phaseOffsets[i];
        const zPos      = zPositions[i];

        // Initial crank angle for this cylinder (at TDC start)
        // Crank throw position:
        const crankThrowX = s(CRANK_RADIUS) * Math.sin(phase);
        const crankThrowY = -s(CRANK_RADIUS) * Math.cos(phase);

        // Piston TDC position (top-dead-center initial position)
        const totalDist = s(CRANK_RADIUS + ROD_LENGTH);
        const pistonBaseX = Math.sin(bankRad) * totalDist;
        const pistonBaseY = -Math.cos(bankRad) * totalDist;

        // ── a. Cylinder bore (static tube) ───────────────────────────────────
        shapes3D.push({
            id:       `v6_cylinder_bore_${i}`,
            type:     'cylinder',
            position: [
                Math.sin(bankRad) * s(CRANK_RADIUS + ROD_LENGTH * 0.7),
                -Math.cos(bankRad) * s(CRANK_RADIUS + ROD_LENGTH * 0.7),
                zPos,
            ],
            rotation: [0, 0, bankRad], // Tilt along bank angle
            scale:    [1, 1, 1],
            params: {
                radiusTop:    s(BORE / 2),
                radiusBottom: s(BORE / 2),
                height:       s(CYLINDER_LENGTH),
                segments:     24,
            },
            color:    '#475569',
            roughness: 0.6,
            metalness: 0.5,
            isStatic:  true,
            mass:      4.5,
            label:     `Cylinder ${i + 1} Bore`,
            opacity:   0.25, // Transparent to see piston inside
        });

        // ── b. Crank throw / crank pin ────────────────────────────────────────
        shapes3D.push({
            id:       `v6_crank_throw_${i}`,
            type:     'cylinder',
            position: [crankThrowX, crankThrowY, zPos],
            rotation: [Math.PI / 2, 0, 0],
            scale:    [1, 1, 1],
            params: {
                radiusTop:    s(ROD_RADIUS * 1.5),
                radiusBottom: s(ROD_RADIUS * 1.5),
                height:       s(0.020),
                segments:     16,
            },
            color:    '#64748b',
            roughness: 0.3,
            metalness: 0.9,
            isStatic:  false,
            mass:      1.2,
            label:     `Crank Throw ${i + 1}`,
        });

        // ── c. Connecting rod ─────────────────────────────────────────────────
        // Con-rod stretches between crank pin and piston pin
        const midX = (crankThrowX + pistonBaseX) / 2;
        const midY = (crankThrowY + pistonBaseY) / 2;
        const rodAngle = Math.atan2(pistonBaseY - crankThrowY, pistonBaseX - crankThrowX);
        const rodWorldLen = Math.sqrt(
            (pistonBaseX - crankThrowX) ** 2 + (pistonBaseY - crankThrowY) ** 2
        );

        shapes3D.push({
            id:       `v6_con_rod_${i}`,
            type:     'cylinder',
            position: [midX, midY, zPos],
            rotation: [0, 0, rodAngle + Math.PI / 2], // align along rod axis
            scale:    [1, 1, 1],
            params: {
                radiusTop:    s(ROD_RADIUS),
                radiusBottom: s(ROD_RADIUS),
                height:       rodWorldLen,
                segments:     12,
            },
            color:    '#c0c8d8',
            roughness: 0.3,
            metalness: 0.85,
            isStatic:  false,
            mass:      0.55,
            label:     `Con Rod ${i + 1}`,
        });

        // ── d. Piston ─────────────────────────────────────────────────────────
        shapes3D.push({
            id:       `v6_piston_${i}`,
            type:     'cylinder',
            position: [pistonBaseX, pistonBaseY, zPos],
            rotation: [0, 0, bankRad], // Aligned with bank angle
            scale:    [1, 1, 1],
            params: {
                radiusTop:    s(PISTON_RADIUS),
                radiusBottom: s(PISTON_RADIUS),
                height:       s(PISTON_HEIGHT),
                segments:     24,
            },
            color:    isLeft ? '#e11d48' : '#2563eb',  // Red=left, Blue=right
            roughness: 0.4,
            metalness: 0.7,
            isStatic:  false,
            mass:      0.45,
            label:     `Piston ${i + 1} (${isLeft ? 'L' : 'R'}${Math.floor(i % 3) + 1})`,
            emissiveColor: isLeft ? '#f43f5e' : '#3b82f6',
            emissiveIntensity: 0,
        });
    }

    // ── 5. CYLINDER HEADS (per bank) ──────────────────────────────────────────
    const headLength = s(0.30);
    for (const bank of ['left', 'right']) {
        const bankSign = bank === 'left' ? -1 : +1;
        const bankRad  = bankSign * BANK_ANGLE_RAD;
        const headDist = s(CRANK_RADIUS + ROD_LENGTH + PISTON_HEIGHT * 0.5);

        shapes3D.push({
            id:       `v6_head_${bank}`,
            type:     'cube',
            position: [
                Math.sin(bankRad) * headDist,
                -Math.cos(bankRad) * headDist,
                s(-0.085),
            ],
            rotation: [0, 0, bankRad],
            scale:    [1, 1, 1],
            params:   { width: s(0.10), height: s(0.04), depth: headLength },
            color:    '#1e293b',
            roughness: 0.5,
            metalness: 0.6,
            isStatic:  true,
            mass:      12,
            label:     `${bank.charAt(0).toUpperCase() + bank.slice(1)} Cylinder Head`,
            opacity:   0.6,
        });
    }

    return { shapes3D, objects, constraints };
}

// ─── Generate Model ───────────────────────────────────────────────────────────
const engineGeometry = generateV6Engine();

const v6EngineModel = {
    id:          'v6_engine_simulation',
    name:        'V6 Engine Simulation',
    description: 'Physically accurate 60° V6 internal combustion engine. Crank-slider kinematics, 4-stroke combustion, real dynamics.',
    category:    'Automotive',
    complexity:  'Extreme',

    // No 2D objects — pure 3D
    objects:     [],
    shapes3D:    engineGeometry.shapes3D,
    constraints: engineGeometry.constraints,

    physics_config: {
        gravity:          { x: 0, y: 0, z: 0 }, // Gravity toggle in V6ControlPanel
        timeStep:         1 / 240,  // 240Hz V6 solver internal rate
        solverIterations: 30,
        subSteps:         4,
        airResistance:    0.001,
        frictionCoeff:    0.02,
    },

    // V6PhysicsSolver parameters (read by modelLoader → V6ControlPanel)
    v6Config: {
        crankRadius:      45,    // mm
        rodLength:        130,   // mm
        pistonMass:       0.45,  // kg
        crankInertia:     0.35,  // kg·m²
        initialRPM:       800,
        combustionForce:  30000, // N
        frictionTorque:   20,    // N·m
        vAngleDeg:        60,
    },

    controls: {
        parameters: [
            { id: 'v6_rpm',        name: 'Engine Speed (RPM)',    min: 0,   max: 8000, step: 50,  current: 800 },
            { id: 'v6_torque',     name: 'Load Torque (N·m)',     min: 0,   max: 500,  step: 10,  current: 0 },
            { id: 'v6_v_angle',    name: 'V-Angle (°)',           min: 60,  max: 90,   step: 30,  current: 60 },
            { id: 'v6_crank_r',    name: 'Crank Radius (mm)',     min: 20,  max: 80,   step: 5,   current: 45 },
            { id: 'v6_rod_length', name: 'Rod Length (mm)',       min: 80,  max: 200,  step: 5,   current: 130 },
        ]
    },

    metadata: {
        isV6Simulation: true, // Flag for modelLoader to activate V6PhysicsSolver
        engineType:     'V6',
        displacement:   '3.5L',
        configuration:  '60° V-Bank',
    }
};

export default v6EngineModel;
