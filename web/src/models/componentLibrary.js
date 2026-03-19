const componentLibrary = [
    {
        id: 'component_piston',
        name: 'Piston Head',
        description: 'Standard aluminum piston head for internal combustion.',
        category: 'Engine',
        type: 'cylinder',
        is3D: true,
        mass: 1.2,
        friction: 0.1,
        restitution: 0.2,
        roughness: 0.3,
        metalness: 0.8,
        color: '#d1d5db',
        material: 'aluminum',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        params: {
            radiusTop: 40,
            radiusBottom: 40,
            height: 60,
            segments: 32
        }
    },
    {
        id: 'component_cylinder',
        name: 'Cylinder Sleeve',
        description: 'Cast iron cylinder sleeve.',
        category: 'Engine',
        type: 'cylinder',
        is3D: true,
        mass: 5.0,
        friction: 0.2,
        restitution: 0.1,
        roughness: 0.6,
        metalness: 0.6,
        color: '#4b5563',
        material: 'cast_iron',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        params: {
            radiusTop: 45,
            radiusBottom: 45,
            height: 100,
            segments: 16
        }
    },
    {
        id: 'component_gear',
        name: 'Spur Gear',
        description: 'Steel spur gear for power transmission.',
        category: 'Mechanics',
        type: 'cylinder',
        is3D: true,
        mass: 2.5,
        friction: 0.3,
        restitution: 0.3,
        roughness: 0.4,
        metalness: 0.9,
        color: '#9ca3af',
        material: 'steel',
        position: [0, 0, 0],
        rotation: [Math.PI / 2, 0, 0],
        scale: [1, 1, 1],
        params: {
            radiusTop: 30,
            radiusBottom: 30,
            height: 15,
            segments: 24
        }
    },
    {
        id: 'component_crankshaft',
        name: 'Crankshaft Section',
        description: 'Forged steel crankshaft segment.',
        category: 'Engine',
        type: 'cylinder',
        is3D: true,
        mass: 8.0,
        friction: 0.1,
        restitution: 0.4,
        roughness: 0.5,
        metalness: 0.9,
        color: '#6b7280',
        material: 'steel',
        position: [0, 0, 0],
        rotation: [0, 0, Math.PI / 2],
        scale: [1, 1, 1],
        params: {
            radiusTop: 25,
            radiusBottom: 25,
            height: 100,
            segments: 32
        }
    },
    {
        id: 'component_ibeam',
        name: 'I-Beam (1m)',
        description: 'Structural steel I-Beam for load-bearing.',
        category: 'Structural',
        type: 'cube',
        is3D: true,
        mass: 45.0,
        friction: 0.4,
        restitution: 0.1,
        roughness: 0.7,
        metalness: 0.8,
        color: '#eab308', /* Yellow painted warning color */
        material: 'structural_steel',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        params: {
            width: 100,
            height: 200,
            depth: 1000
        }
    }
];

export default componentLibrary;
