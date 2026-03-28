const pendulumModel = {
    id: "pendulum_1",
    name: "Pendulum",
    description: "A simple gravity pendulum demonstrating harmonic motion.",
    category: "Classical Mechanics",
    complexity: "Low",
    objects: [
        {
            id: "pivot",
            type: "circle",
            cx: 400,
            cy: 100,
            r: 5,
            fill: "#ef4444",
            stroke: "#b91c1c",
            strokeWidth: 2,
            isStatic: true,
            label: "Pivot"
        },
        {
            id: "bob",
            type: "circle",
            cx: 600,
            cy: 100,
            r: 20,
            fill: "#3b82f6",
            stroke: "#1d4ed8",
            strokeWidth: 2,
            mass: 5,
            restitution: 0.5,
            friction: 0.1,
            label: "Bob"
        }
    ],
    constraints: [
        {
            id: "rod",
            type: "distance",
            targetA: "pivot",
            targetB: "bob",
            distance: 200,
            stiffness: 1,
            damping: 0.1,
            label: "Pendulum Rod"
        }
    ],
    physics_config: {
        gravity: { x: 0, y: 9.81, z: 0 },
        timeStep: 0.016,
        solverIterations: 10
    },
    controls: {
        parameters: [
            { id: "bob.mass", name: "Bob Mass", min: 1, max: 20, step: 1, current: 5 },
            { id: "rod.distance", name: "Rod Length", min: 50, max: 400, step: 10, current: 200 }
        ]
    },
    metadata: {
        zoom: 1,
        center: { x: 400, y: 300 }
    }
};

export default pendulumModel;
