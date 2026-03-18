/**
 * Engine Model
 * A simplified piston-crank mechanism.
 * Note: Since the backend physics might not handle complex mechanical constraints
 * perfectly for a demo, we rely on a visually convincing setup.
 */

const engineModel = {
    name: "Engine",
    description: "A 2-cylinder internal combustion engine model (Piston-Crank mechanism).",
    category: "Mechanical",
    complexity: "High",
    objects: [
        // Crankshaft (Central Rotating Hub)
        {
            id: "crank_hub",
            type: "circle",
            cx: 400,
            cy: 400,
            r: 10,
            fill: "#475569",
            stroke: "#1e293b",
            strokeWidth: 2,
            isStatic: true,
            label: "Crank Hub"
        },
        // Crank Pin 1
        {
            id: "crank_pin_1",
            type: "circle",
            cx: 400,
            cy: 350,
            r: 8,
            fill: "#94a3b8",
            stroke: "#475569",
            strokeWidth: 2,
            mass: 2,
            label: "Crank Pin 1"
        },
        // Piston 1
        {
            id: "piston_1",
            type: "circle",
            cx: 400,
            cy: 200,
            r: 30,
            fill: "#f43f5e",
            stroke: "#be123c",
            strokeWidth: 2,
            mass: 5,
            label: "Piston 1"
        },
        // Cylinder 1 (Visual only)
        {
            id: "cylinder_1",
            type: "rect",
            x: 350,
            y: 100,
            width: 100,
            height: 200,
            fill: "rgba(244, 63, 94, 0.05)",
            stroke: "rgba(244, 63, 94, 0.2)",
            strokeWidth: 1,
            isStatic: true,
            label: "Cylinder 1"
        },
        // Crank Pin 2 (180 deg offset)
        {
            id: "crank_pin_2",
            type: "circle",
            cx: 400,
            cy: 450,
            r: 8,
            fill: "#94a3b8",
            stroke: "#475569",
            strokeWidth: 2,
            mass: 2,
            label: "Crank Pin 2"
        },
        // Piston 2
        {
            id: "piston_2",
            type: "circle",
            cx: 550,
            cy: 400,
            r: 30,
            fill: "#3b82f6",
            stroke: "#1d4ed8",
            strokeWidth: 2,
            mass: 5,
            label: "Piston 2"
        },
         // Cylinder 2 (Visual only)
         {
            id: "cylinder_2",
            type: "rect",
            x: 500,
            y: 350,
            width: 200,
            height: 100,
            fill: "rgba(59, 130, 246, 0.05)",
            stroke: "rgba(59, 130, 246, 0.2)",
            strokeWidth: 1,
            isStatic: true,
            label: "Cylinder 2"
        },
    ],
    constraints: [
        // Crank 1 Rotation
        {
            id: "crank_joint_1",
            type: "revolute",
            targetA: "crank_hub",
            targetB: "crank_pin_1",
            anchorA: { x: 0, y: 0 },
            anchorB: { x: 0, y: 50 },
            motorEnabled: true,
            targetVelocity: 5,
            maxForce: 5000,
            label: "Main Crank"
        },
        // Connecting Rod 1
        {
            id: "con_rod_1",
            type: "distance",
            targetA: "crank_pin_1",
            targetB: "piston_1",
            distance: 150,
            stiffness: 1,
            label: "Con-Rod 1"
        },
        // Slider Constraint 1 (Wait, does REALIS have sliders? If not, we use vertical guide points)
        {
            id: "piston_guide_1",
            type: "prismatic", // Assuming prismatic / slider is supported
            targetA: "piston_1",
            targetB: null, // world
            axis: { x: 0, y: 1 },
            label: "Piston 1 Guide"
        },
        // Connecting Rod 2
        {
            id: "con_rod_2",
            type: "distance",
            targetA: "crank_pin_2",
            targetB: "piston_2",
            distance: 150,
            stiffness: 1,
            label: "Con-Rod 2"
        },
        // Slider Constraint 2
        {
            id: "piston_guide_2",
            type: "prismatic",
            targetA: "piston_2",
            targetB: null,
            axis: { x: 1, y: 0 },
            label: "Piston 2 Guide"
        }
    ],
    metadata: {
        zoom: 0.8,
        center: { x: 450, y: 350 }
    }
};

export default engineModel;
