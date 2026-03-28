const shaftRingAssemblyModel = {
    id: 'shaft_ring_assembly',
    name: 'Shaft Ring Assembly',
    description: 'Rotating shaft with axis-constrained sliding rings and cylindrical support components.',
    category: 'Mechanical',
    complexity: 'Medium',
    objects: [],
    shapes3D: [
        {
            id: 'main_shaft',
            type: 'cylinder',
            position: [0, 0, 0],
            rotation: [Math.PI / 2, 0, 0],
            params: { radiusTop: 6, radiusBottom: 6, height: 260, segments: 28 },
            color: '#94a3b8',
            isStatic: false,
            mass: 8,
            label: 'Main Shaft',
            meta: {
                shaftAxis: { x: 0, y: 0, z: 1 },
                angularVelocity: 1.8
            }
        },
        {
            id: 'ring_a',
            type: 'cylinder',
            position: [0, 0, -65],
            rotation: [Math.PI / 2, 0, 0],
            params: { radiusTop: 12, radiusBottom: 12, height: 12, segments: 28 },
            color: '#22c55e',
            isStatic: false,
            mass: 1.2,
            label: 'Sliding Ring A',
            meta: {
                motionMode: 'eased',
                travelRange: [-95, 95],
                slideSpeed: 0.36,
                phase: 0
            }
        },
        {
            id: 'ring_b',
            type: 'cylinder',
            position: [0, 0, 30],
            rotation: [Math.PI / 2, 0, 0],
            params: { radiusTop: 10, radiusBottom: 10, height: 10, segments: 28 },
            color: '#38bdf8',
            isStatic: false,
            mass: 1.1,
            label: 'Sliding Ring B',
            meta: {
                motionMode: 'force',
                travelRange: [-90, 90],
                slideSpeed: 0.43,
                phase: 0.9
            }
        },
        {
            id: 'support_cylinder_left',
            type: 'cylinder',
            position: [0, -24, -125],
            rotation: [Math.PI / 2, 0, 0],
            params: { radiusTop: 18, radiusBottom: 18, height: 24, segments: 20 },
            color: '#334155',
            isStatic: true,
            mass: 4,
            label: 'Support Cylinder Left'
        },
        {
            id: 'support_cylinder_right',
            type: 'cylinder',
            position: [0, -24, 125],
            rotation: [Math.PI / 2, 0, 0],
            params: { radiusTop: 18, radiusBottom: 18, height: 24, segments: 20 },
            color: '#334155',
            isStatic: true,
            mass: 4,
            label: 'Support Cylinder Right'
        }
    ],
    constraints: [],
    physics_config: {
        gravity: { x: 0, y: 0, z: 0 },
        timeStep: 0.016,
        solverIterations: 12,
        subSteps: 4,
        airResistance: 0.001,
        frictionCoeff: 0.02
    },
    controls: { parameters: [] },
    metadata: {
        zoom: 1,
        isMechanicalAssembly: true
    }
};

export default shaftRingAssemblyModel;
