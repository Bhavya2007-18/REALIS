import useStore from '../store/useStore';
import { validateModelSchema } from '../models/schema';


const modelLoader = {
    loadModel: (modelConfig) => {
        const store = useStore.getState();

        try {
            
            const model = validateModelSchema(modelConfig);

            
            store.clearDesign();

            
            if (model.objects) {
                store.setObjects(model.objects.map(obj => ({
                    ...obj,
                    stroke: obj.stroke || '#3b82f6',
                    fill: obj.fill || 'rgba(59, 130, 246, 0.2)',
                    strokeWidth: obj.strokeWidth || 2,
                    rotation: obj.rotation || 0
                })));
            }

            
            if (model.shapes3D && model.shapes3D.length > 0) {
                const shapes = model.shapes3D.map(shape => ({
                    ...shape,
                    id: shape.id || `shape3d_${Math.random().toString(36).substring(2, 9)}`,
                    color: shape.color || '#3b82f6',
                    mass: shape.mass ?? 1.0,
                    restitution: shape.restitution || 0.5,
                    friction: shape.friction || 0.3,
                    isStatic: shape.isStatic ?? false
                }))

                if (model.id === 'ashwins_workplace') {
                    const rhoWood = 500;
                    shapes.forEach(s => {
                        const isShipPart = (s.id || '').startsWith('ship_') || (s.name || '').toLowerCase().includes('ship');
                        if (!isShipPart) return;
                        s.isStatic = false;
                        s.fluidInteraction = 'water';
                        s.material = 'wood';
                        s.restitution = 0.3;
                        s.friction = 0.4;

                        if (s.type === 'cube' && s.params) {
                            const w = s.params.width || 1;
                            const h = s.params.height || 1;
                            const d = s.params.depth || 1;
                            const vol = w * h * d;
                            s.mass = Math.max(10, rhoWood * vol * 0.001);
                        } else if (s.type === 'cylinder' && s.params) {
                            const r1 = s.params.radiusTop || 1;
                            const r2 = s.params.radiusBottom || r1;
                            const r = (r1 + r2) * 0.5;
                            const h = s.params.height || 1;
                            const vol = Math.PI * r * r * h;
                            s.mass = Math.max(8, rhoWood * vol * 0.0005);
                        } else {
                            s.mass = s.mass ?? 20;
                        }
                    });
                }
                if (model.id === 'test_workplace') {
                    shapes.forEach(s => {
                        if (s.id === 'lab_floor') return;
                        s.isStatic = false;
                        s.mass = s.mass ?? 1.0;
                        s.restitution = s.restitution ?? 0.4;
                        s.friction = s.friction ?? 0.3;
                    });
                }

                store.setShapes3D(shapes);
                useStore.setState({ is3DView: true });
            }

            
            store.setConstraints(model.constraints || []);

            
            if (model.physics_config) {
                store.setSimulationSettings({
                    gravity: model.physics_config.gravity,
                    timeStep: model.physics_config.timeStep,
                    solverIterations: model.physics_config.solverIterations,
                    subSteps: model.physics_config.subSteps,
                    airResistance: model.physics_config.airResistance,
                    frictionCoeff: model.physics_config.frictionCoeff
                });
            }

            
            const controls = model.controls?.parameters || [];
            if (store.setActiveModelControls) {
                store.setActiveModelControls(controls);
            }

            
            useStore.setState({ simulationPreset: model.id });

            
            store.resetPlayback();

            return {
                success: true,
                name: model.name,
                description: model.description
            };
        } catch (error) {
            console.error("Model Loading Error:", error);
            return {
                success: false,
                error: error.message
            };
        }
    }
};

export default modelLoader;