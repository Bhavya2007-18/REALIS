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

            // 2. Add all 2D objects
            store.setObjects(model.objects || []);

            // 2b. Add native 3D shapes (V6 engine and similar prebuilts use this)
            if (model.shapes3D && model.shapes3D.length > 0) {
                store.setShapes3D(model.shapes3D);
                // Switch to 3D mode automatically
                const { setActive3DTool } = store;
                useStore.setState({ is3DMode: true });
            }

            // 3. Apply constraints if present
            store.setConstraints(model.constraints || []);

            // 4. Set simulation settings based on schema physics_config
            store.setSimulationSettings({
                gravity: model.physics_config.gravity,
                timeStep: model.physics_config.timeStep,
                solverIterations: model.physics_config.solverIterations,
                subSteps: model.physics_config.subSteps,
                airResistance: model.physics_config.airResistance,
                frictionCoeff: model.physics_config.frictionCoeff
            });

            // 5. Check and set any active model controls from schema
            const controls = model.controls?.parameters || [];
            if (store.setActiveModelControls) {
                store.setActiveModelControls(controls);
            }

            // 6. Store current active preset ID
            useStore.setState({ simulationPreset: model.id });

            // 7. Reset playback state
            store.resetPlayback();

            console.log(`Model successfully loaded: ${model.name}`);
            
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
