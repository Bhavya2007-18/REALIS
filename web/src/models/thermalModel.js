const thermalModel = {
    id: 'demo_thermal',
    name: 'Thermal Stress Test',
    description: 'Heat conduction simulation across a metal plate.',
    complexity: 'Medium',
    simulationOptions: {
        mode: 'accurate',
        type: 'thermal',
        timeStep: 0.005,
        subSteps: 10,
        gravity: { x: 0, y: -9.81, z: 0 },
        frictionCoeff: 0.3,
        airResistance: 0.05,
        ambientTemp: 293.15, // 20 C
        thermalSteps: 5,
        thermalConductivity: 0.8
    },
    objects: [
        {
            id: 'heat_source',
            name: 'Heat Sink',
            type: 'rect',
            x: 200, y: 300, width: 80, height: 80,
            isStatic: true,
            temperature: 800, // Very hot
            fixedTemperature: true,
            material: 'titanium',
            color: '#ef4444' // Red
        },
        {
            id: 'cooling_plate',
            name: 'Cooling Plate',
            type: 'rect',
            x: 500, y: 300, width: 80, height: 80,
            isStatic: true,
            temperature: 200, // Cold
            fixedTemperature: true,
            material: 'aluminum',
            color: '#3b82f6' // Blue
        },
        {
            id: 'conductor_bar',
            name: 'Conductor Bar',
            type: 'rect',
            x: 280, y: 320, width: 220, height: 40,
            isStatic: false,
            mass: 5,
            temperature: 293.15, // Room temp
            material: 'structural_steel',
            color: '#9ca3af'
        }
    ],
    constraints: [],
    shapes3D: []
};

export default thermalModel;
