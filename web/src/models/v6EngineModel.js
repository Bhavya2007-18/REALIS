


const CRANK_RADIUS      = 0.045;  
const ROD_LENGTH        = 0.130;  
const PISTON_RADIUS     = 0.042;  
const PISTON_HEIGHT     = 0.060;  
const BORE              = 0.089;  
const STROKE            = 0.090;  
const CYLINDER_LENGTH   = 0.200;  
const ROD_RADIUS        = 0.012;
const CRANK_JOURNAL_R   = 0.025;  
const CRANK_TOTAL_LEN   = 0.400;  


const BANK_ANGLE_RAD    = Math.PI / 6; 
const CYLINDER_SPACING  = 0.085; 
const SCALE             = 200;   

function s(m) { return m * SCALE; } 

function generateV6Engine() {
    const shapes3D   = [];
    const objects    = [];
    const constraints = [];

    
    
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
        opacity:   0.35,  
    });

    
    shapes3D.push({
        id:       'v6_crankshaft',
        type:     'cylinder',
        position: [0, 0, 0],
        rotation: [Math.PI / 2, 0, 0], 
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

    
    
    
    
    

    const phaseOffsets = [0, 2.094, 4.189, 1.047, 3.141, 5.236];

    
    const zPositions = [
        s(-0.17),  
        s(-0.085), 
        s(0),      
        s(-0.127), 
        s(-0.042), 
        s(0.043),  
    ];

    for (let i = 0; i < 6; i++) {
        const isLeft = i < 3;
        const bankSign  = isLeft ? -1 : +1;
        const bankRad   = bankSign * BANK_ANGLE_RAD;
        const phase     = phaseOffsets[i];
        const zPos      = zPositions[i];

        
        
        const crankThrowX = s(CRANK_RADIUS) * Math.sin(phase);
        const crankThrowY = -s(CRANK_RADIUS) * Math.cos(phase);

        
        const totalDist = s(CRANK_RADIUS + ROD_LENGTH);
        const pistonBaseX = Math.sin(bankRad) * totalDist;
        const pistonBaseY = -Math.cos(bankRad) * totalDist;

        
        shapes3D.push({
            id:       `v6_cylinder_bore_${i}`,
            type:     'cylinder',
            position: [
                Math.sin(bankRad) * s(CRANK_RADIUS + ROD_LENGTH * 0.7),
                -Math.cos(bankRad) * s(CRANK_RADIUS + ROD_LENGTH * 0.7),
                zPos,
            ],
            rotation: [0, 0, bankRad], 
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
            opacity:   0.25, 
        });

        
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
            rotation: [0, 0, rodAngle + Math.PI / 2], 
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

        
        shapes3D.push({
            id:       `v6_piston_${i}`,
            type:     'cylinder',
            position: [pistonBaseX, pistonBaseY, zPos],
            rotation: [0, 0, bankRad], 
            scale:    [1, 1, 1],
            params: {
                radiusTop:    s(PISTON_RADIUS),
                radiusBottom: s(PISTON_RADIUS),
                height:       s(PISTON_HEIGHT),
                segments:     24,
            },
            color:    isLeft ? '#e11d48' : '#2563eb',  
            roughness: 0.4,
            metalness: 0.7,
            isStatic:  false,
            mass:      0.45,
            label:     `Piston ${i + 1} (${isLeft ? 'L' : 'R'}${Math.floor(i % 3) + 1})`,
            emissiveColor: isLeft ? '#f43f5e' : '#3b82f6',
            emissiveIntensity: 0,
        });
    }

    
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


const engineGeometry = generateV6Engine();

const v6EngineModel = {
    id:          'v6_engine_simulation',
    name:        'V6 Engine Simulation',
    description: 'Physically accurate 60° V6 internal combustion engine. Crank-slider kinematics, 4-stroke combustion, real dynamics.',
    category:    'Automotive',
    complexity:  'Extreme',

    
    objects:     [],
    shapes3D:    engineGeometry.shapes3D,
    constraints: engineGeometry.constraints,

    physics_config: {
        gravity:          { x: 0, y: 0, z: 0 }, 
        timeStep:         1 / 240,  
        solverIterations: 30,
        subSteps:         4,
        airResistance:    0.001,
        frictionCoeff:    0.02,
    },

    
    v6Config: {
        crankRadius:      45,    
        rodLength:        130,   
        pistonMass:       0.45,  
        crankInertia:     0.35,  
        initialRPM:       800,
        combustionForce:  30000, 
        frictionTorque:   20,    
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
        isV6Simulation: true, 
        engineType:     'V6',
        displacement:   '3.5L',
        configuration:  '60° V-Bank',
    }
};

export default v6EngineModel;