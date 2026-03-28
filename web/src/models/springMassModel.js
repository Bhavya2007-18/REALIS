const springMassModel = {
    id: "spring_mass_1",
    name: "Spring-Mass System",
    description: "Oscillation with damping and adjustable stiffness.",
    category: "Classical Mechanics",
    complexity: "Low",
    objects: [
        {
            id: "anchor",
            type: "rect",
            x: 350,
            y: 50,
            width: 100,
            height: 20,
            fill: "#64748b",
            stroke: "#334155",
            strokeWidth: 2,
            isStatic: true,
            label: "Ceiling Anchor"
        },
        {
            id: "mass_block",
            type: "rect",
            x: 375,
            y: 300,
            width: 50,
            height: 50,
            fill: "#10b981",
            stroke: "#047857",
            strokeWidth: 2,
            mass: 10,
            restitution: 0.2,
            friction: 0.5,
            label: "Mass Block"
        }
    ],
    constraints: [
        {
            id: "spring",
            type: "distance",
            targetA: "anchor",
            targetB: "mass_block",
            distance: 150,
            stiffness: 0.2,
            damping: 0.05,
            label: "Coiled Spring"
        }
    ],
    physics_config: {
        gravity: { x: 0, y: 9.81, z: 0 },
        timeStep: 0.016,
        solverIterations: 10
    },
    controls: {
        parameters: [
            { id: "mass_block.mass", name: "Block Mass", min: 1, max: 50, step: 1, current: 10 },
            { id: "spring.stiffness", name: "Spring Stiffness", min: 0.01, max: 1.0, step: 0.05, current: 0.2 },
            { id: "spring.damping", name: "Spring Damping", min: 0, max: 0.5, step: 0.01, current: 0.05 }
        ]
    },
    metadata: {
        zoom: 1,
        center: { x: 400, y: 300 },
        difficulty: "low"
    }
};

export default springMassModel;
