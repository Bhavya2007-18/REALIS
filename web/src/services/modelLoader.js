import useStore from '../store/useStore';
import { validateModelSchema } from '../models/schema';

/**
 * Model Loader Service
 * Handles loading of pre-built simulation models into the Zustand store.
 */
const modelLoader = {
    loadModel: (modelConfig) => {
        const store = useStore.getState();

        try {
            // 0. Validate via new Schema
            const model = validateModelSchema(modelConfig);

            // 1. Clear current scene
            store.clearDesign();

            // 2. Add all 2D objects with sane defaults
            if (model.objects) {
                store.setObjects(model.objects.map(obj => ({
                    ...obj,
                    stroke: obj.stroke || '#3b82f6',
                    fill: obj.fill || 'rgba(59, 130, 246, 0.2)',
                    strokeWidth: obj.strokeWidth || 2,
                    rotation: obj.rotation || 0
                })));
            }

            // 3. Add native 3D shapes
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
                    const rhoWood = 500
                    const tagShip = s => (s.name || '').toLowerCase().includes('ship')
                    shapes.forEach(s => {
                        if (tagShip(s) && s.type === 'cube' && s.params) {
                            const w = s.params.width || 1
                            const h = s.params.height || 1
                            const d = s.params.depth || 1
                            const vol = w * h * d
                            s.mass = rhoWood * vol * 0.001
                            s.fluidInteraction = 'water'
                            s.material = 'wood'
                            s.restitution = 0.3
                            s.friction = 0.4
                            if (s.id === 'ship_hull_bottom') s.isStatic = false
                        }
                    })
                }

                store.setShapes3D(shapes);
                useStore.setState({ is3DView: true });
            }

            // 4. Apply constraints if present
            store.setConstraints(model.constraints || []);

            // 5. Set simulation settings based on schema physics_config
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

            // 6. Set active model controls if present
            const controls = model.controls?.parameters || [];
            if (store.setActiveModelControls) {
                store.setActiveModelControls(controls);
            }

            // 7. Store current active preset ID
            useStore.setState({ simulationPreset: model.id });

            // 8. Reset playback state
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
