const leverModel = {
    id: "lever_1",
    name: "Lever System",
    description: "Pivot constraint and force multiplier demonstration.",
    category: "Classical Mechanics",
    complexity: "Medium",
    objects: [
        {
            id: "fulcrum",
            type: "polygon",
            points: [{x:380, y:400}, {x:420, y:400}, {x:400, y:350}],
            fill: "#f59e0b",
            stroke: "#b45309",
            strokeWidth: 2,
            isStatic: true,
            label: "Fulcrum"
        },
        {
            id: "lever",
            type: "rect",
            x: 200,
            y: 340,
            width: 400,
            height: 10,
            fill: "#8b5cf6",
            stroke: "#4c1d95",
            strokeWidth: 2,
            mass: 5,
            restitution: 0.1,
            friction: 0.8,
            label: "Lever Board"
        },
        {
            id: "weight_heavy",
            type: "rect",
            x: 220,
            y: 290,
            width: 50,
            height: 50,
            fill: "#ef4444",
            stroke: "#991b1b",
            strokeWidth: 2,
            mass: 20,
            label: "Heavy Load"
        },
        {
            id: "weight_light",
            type: "rect",
            x: 520,
            y: 290,
            width: 50,
            height: 50,
            fill: "#14b8a6",
            stroke: "#0f766e",
            strokeWidth: 2,
            mass: 5,
            label: "Light Load"
        }
    ],
    constraints: [
        {
            id: "pivot_joint",
            type: "revolute",
            targetA: "fulcrum",
            targetB: "lever",
            anchorA: { x: 0, y: -25 }, // Top of fulcrum
            anchorB: { x: 0, y: 5 },   // Middle of lever
            motorEnabled: false,
            label: "Pivot Hinge"
        }
    ],
    physics_config: {
        gravity: { x: 0, y: 9.81, z: 0 },
        timeStep: 0.016,
        solverIterations: 15
    },
    controls: {
        parameters: [
            { id: "weight_heavy.mass", name: "Left Mass (kg)", min: 1, max: 100, step: 1, current: 20 },
            { id: "weight_light.mass", name: "Right Mass (kg)", min: 1, max: 100, step: 1, current: 5 },
            { id: "lever.x", name: "Lever X shift", min: 100, max: 300, step: 10, current: 200 }
        ]
    },
    metadata: {
        zoom: 0.9,
        center: { x: 400, y: 350 },
        difficulty: "medium"
    }
};

export default leverModel;
