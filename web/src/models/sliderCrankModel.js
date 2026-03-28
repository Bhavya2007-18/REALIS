const sliderCrankModel = {
    id: "slider_crank_1",
    name: "Slider-Crank Mechanism",
    description: "High-quality piston mechanism converting rotational to linear motion.",
    category: "Kinematics",
    complexity: "High",
    objects: [
        {
            id: "crank_hub",
            type: "circle",
            cx: 400,
            cy: 300,
            r: 10,
            fill: "#475569",
            stroke: "#1e293b",
            strokeWidth: 2,
            isStatic: true,
            label: "Crank Hub"
        },
        {
            id: "crank_pin",
            type: "circle",
            cx: 400,
            cy: 250,
            r: 8,
            fill: "#94a3b8",
            stroke: "#475569",
            strokeWidth: 2,
            mass: 2,
            label: "Crank Pin"
        },
        {
            id: "piston",
            type: "rect",
            x: 370,
            y: 100,
            width: 60,
            height: 40,
            fill: "#f43f5e",
            stroke: "#be123c",
            strokeWidth: 2,
            mass: 5,
            label: "Piston"
        },
        {
            id: "cylinder_guide",
            type: "rect",
            x: 360,
            y: 50,
            width: 80,
            height: 120,
            fill: "rgba(244, 63, 94, 0.05)",
            stroke: "rgba(244, 63, 94, 0.2)",
            strokeWidth: 1,
            isStatic: true,
            label: "Cylinder"
        }
    ],
    constraints: [
        {
            id: "crank_joint",
            type: "revolute",
            targetA: "crank_hub",
            targetB: "crank_pin",
            anchorA: { x: 0, y: 0 },
            anchorB: { x: 0, y: 50 },
            motorEnabled: true,
            targetVelocity: 10,
            maxForce: 5000,
            label: "Crankshaft Motor"
        },
        {
            id: "con_rod",
            type: "distance",
            targetA: "crank_pin",
            targetB: "piston",
            distance: 150,
            stiffness: 1,
            label: "Connecting Rod"
        },
        {
            id: "piston_prismatic",
            type: "prismatic",
            targetA: "piston",
            targetB: null, 
            axis: { x: 0, y: 1 },
            label: "Piston Guide"
        }
    ],
    physics_config: {
        gravity: { x: 0, y: 0, z: 0 }, 
        timeStep: 0.016,
        solverIterations: 20
    },
    controls: {
        parameters: [
            { id: "crank_joint.targetVelocity", name: "Motor Speed", min: 0, max: 50, step: 1, current: 10 },
            { id: "piston.mass", name: "Piston Mass", min: 1, max: 20, step: 1, current: 5 }
        ]
    },
    metadata: {
        zoom: 1,
        center: { x: 400, y: 250 }
    }
};

export default sliderCrankModel;