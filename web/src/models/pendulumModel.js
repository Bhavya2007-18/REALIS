const pendulumModel = {
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
    metadata: {
        zoom: 1,
        center: { x: 400, y: 300 }
    }
};

export default pendulumModel;
