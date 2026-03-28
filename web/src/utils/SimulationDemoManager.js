export class SimulationDemoManager {
    static loadDemo(demoId, store) {
        const { clearDesign } = store;
        
        
        clearDesign();
        
        switch (demoId) {
            case 'gravity':
                this.setupGravityDemo(store);
                break;
            case 'pendulum':
                this.setupPendulumDemo(store);
                break;
            case 'collision':
                this.setupCollisionDemo(store);
                break;
            case 'dominos':
                this.setupDominoDemo(store);
                break;
            case 'orbit':
                this.setupOrbitDemo(store);
                break;
            default:
                break;
        }
    }

    static setupGravityDemo(store) {
        const { addCADObject, addShape3D, setSimulationSettings } = store;
        
        
        addCADObject({
            id: 'ground',
            type: 'rect',
            x: -200, y: 150, width: 400, height: 20,
            stroke: '#64748b', fill: 'rgba(100, 116, 139, 0.4)',
            isStatic: true, friction: 0.5, restitution: 0.4
        });

        
        for (let i = 0; i < 5; i++) {
            addShape3D({
                id: `cube_${i}`,
                type: 'cube',
                position: [0, 10 + i * 11, 0],
                params: { width: 10, height: 10, depth: 10 },
                color: '#3b82f6', mass: 1.0, restitution: 0.4, friction: 0.5
            });
        }

        
        addShape3D({
            id: 'sphere',
            type: 'sphere',
            position: [2, 100, 0],
            params: { radius: 5 },
            color: '#ef4444', mass: 2.0, restitution: 0.4, friction: 0.5
        });

        setSimulationSettings({ gravity: { x: 0, y: -9.81, z: 0 } });
        store.setDemoOverlay({
            title: "Rigid Body Simulation",
            description: "Gravity Enabled\nCollision Resolution Active"
        });
    }

    static setupPendulumDemo(store) {
        const { addCADObject, addShape3D, addConstraint, setSimulationSettings } = store;

        
        addShape3D({
            id: 'pivot',
            type: 'sphere',
            position: [0, 100, 0],
            params: { radius: 2 },
            color: '#fbbf24', isStatic: true
        });

        
        addShape3D({
            id: 'bob',
            type: 'sphere',
            position: [60, 100, 0],
            params: { radius: 6 },
            color: '#3b82f6', mass: 5.0
        });

        
        addConstraint({
            type: 'distance',
            targetA: 'pivot',
            targetB: 'bob',
            distance: 60,
            pivotA: { x: 0, y: 0, z: 0 },
            pivotB: { x: 0, y: 0, z: 0 }
        });

        setSimulationSettings({ gravity: { x: 0, y: -9.81, z: 0 } });
        store.setDemoOverlay({
            title: "Pendulum Constraint",
            description: "Constraint Type: Distance Constraint\nEnergy Transfer: Potential ↔ Kinetic"
        });
    }

    static setupCollisionDemo(store) {
        const { addShape3D, setSimulationSettings } = store;

        addShape3D({
            id: 'sphereA',
            type: 'sphere',
            position: [-50, 0, 0],
            params: { radius: 10 },
            color: '#ef4444', mass: 1.0, restitution: 1.0, friction: 0.0,
            initialVelocity: { x: 30, y: 0, z: 0 }
        });

        addShape3D({
            id: 'sphereB',
            type: 'sphere',
            position: [50, 0, 0],
            params: { radius: 10 },
            color: '#3b82f6', mass: 1.0, restitution: 1.0, friction: 0.0,
            initialVelocity: { x: -30, y: 0, z: 0 }
        });

        setSimulationSettings({ gravity: { x: 0, y: 0, z: 0 } });
        store.setDemoOverlay({
            title: "Elastic Collision",
            description: "Impulse Collision Model\nSwap Velocities on Impact\nEnergy Conserved"
        });
    }

    static setupDominoDemo(store) {
        const { addCADObject, setSimulationSettings } = store;

        
        addCADObject({
            id: 'ground',
            type: 'rect',
            x: -200, y: 10, width: 400, height: 10,
            stroke: '#475569', fill: 'rgba(71, 85, 105, 0.4)',
            isStatic: true, friction: 0.8
        });

        
        for (let i = 0; i < 10; i++) {
            addCADObject({
                id: `domino_${i}`,
                type: 'rect',
                x: -150 + i * 30, y: -20, width: 6, height: 30,
                stroke: '#cbd5e1', fill: '#f8fafc',
                mass: 0.5, restitution: 0.2, friction: 0.5,
                rotation: i === 0 ? 15 : 0 
            });
        }

        setSimulationSettings({ gravity: { x: 0, y: -9.81, z: 0 } });
        store.setDemoOverlay({
            title: "Domino Chain",
            description: "Stability\nChain Reaction Dynamics"
        });
    }

    static setupOrbitDemo(store) {
        const { addShape3D, setSimulationSettings } = store;

        
        addShape3D({
            id: 'sun',
            type: 'sphere',
            position: [0, 0, 0],
            params: { radius: 15 },
            color: '#fbbf24', mass: 1000, isStatic: true
        });

        
        addShape3D({
            id: 'planet',
            type: 'sphere',
            position: [120, 0, 0],
            params: { radius: 4 },
            color: '#3b82f6', mass: 1.0,
            initialVelocity: { x: 0, y: 0, z: 65 } 
        });

        setSimulationSettings({ gravity: { x: 0, y: 0, z: 0 } }); 
        store.setSimulationSettings({ 
            pointGravity: { center: { x: 0, y: 0, z: 0 }, strength: 5000000 } 
        });

        store.setDemoOverlay({
            title: "Orbital Mechanics Simulation",
            description: "Inverse Square Law\nEnergy Conserved\nStable Integration"
        });
    }
}