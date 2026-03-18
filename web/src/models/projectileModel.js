const projectileModel = {
    name: "Projectile",
    description: "Demonstrating parabolic trajectory with initial velocity.",
    category: "Kinematics",
    complexity: "Low",
    objects: [
        {
            id: "ground",
            type: "rect",
            x: 0,
            y: 500,
            width: 1000,
            height: 50,
            fill: "#34d399",
            stroke: "#059669",
            strokeWidth: 2,
            isStatic: true,
            label: "Ground"
        },
        {
            id: "ball",
            type: "circle",
            cx: 50,
            cy: 470,
            r: 15,
            fill: "#f59e0b",
            stroke: "#d97706",
            strokeWidth: 2,
            mass: 1,
            velocity: { x: 15, y: -25 },
            restitution: 0.6,
            friction: 0.2,
            label: "Projectile"
        }
    ],
    constraints: [],
    metadata: {
        zoom: 0.8,
        center: { x: 500, y: 300 }
    }
};

export default projectileModel;
