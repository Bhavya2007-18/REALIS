const pulleyModel = {
    id: "pulley_1",
    name: "Pulley System",
    description: "Rope constraint approximation for load balancing (Atwood Machine).",
    category: "Classical Mechanics",
    complexity: "Medium",
    objects: [
        {
            id: "pulley_wheel",
            type: "circle",
            cx: 400,
            cy: 150,
            r: 30,
            fill: "#94a3b8",
            stroke: "#475569",
            strokeWidth: 2,
            isStatic: true,
            label: "Pulley"
        },
        {
            id: "mass_left",
            type: "rect",
            x: 350,
            y: 300,
            width: 40,
            height: 40,
            fill: "#ef4444",
            stroke: "#991b1b",
            strokeWidth: 2,
            mass: 10,
            label: "Load (Left)"
        },
        {
            id: "mass_right",
            type: "rect",
            x: 410,
            y: 200,
            width: 40,
            height: 40,
            fill: "#3b82f6",
            stroke: "#1d4ed8",
            strokeWidth: 2,
            mass: 8,
            label: "Counterweight"
        }
    ],
    constraints: [
        
        
        {
            id: "rope",
            type: "pulley", 
            targetA: "mass_left",
            targetB: "mass_right",
            anchorA: { x: 0, y: -20 },
            anchorB: { x: 0, y: -20 },
            groundAnchorA: { x: 370, y: 150 }, 
            groundAnchorB: { x: 430, y: 150 }, 
            ratio: 1.0,
            length: 400,
            label: "Rope"
        }
    ],
    physics_config: {
        gravity: { x: 0, y: 9.81, z: 0 },
        timeStep: 0.016,
        solverIterations: 15
    },
    controls: {
        parameters: [
            { id: "mass_left.mass", name: "Left Mass", min: 1, max: 50, step: 1, current: 10 },
            { id: "mass_right.mass", name: "Right Mass", min: 1, max: 50, step: 1, current: 8 }
        ]
    },
    metadata: {
        zoom: 0.9,
        center: { x: 400, y: 300 },
        difficulty: "medium"
    }
};

export default pulleyModel;