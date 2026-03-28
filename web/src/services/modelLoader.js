import useStore from '../store/useStore';

/**
 * Model Loader Service
 * Handles loading of pre-built simulation models into the Zustand store.
 */
const modelLoader = {
    loadModel: (model) => {
        const store = useStore.getState();

        // 1. Clear current scene
        store.clearDesign();

        // 2. Add all objects
        // We use setObjects directly to avoid multiple history snapshots during initialization
        if (model.objects) {
            store.setObjects(model.objects.map(obj => ({
                ...obj,
                // Ensure unique IDs if they aren't already (though models should have stable IDs)
                // id: obj.id || Math.random().toString(36).substring(2, 9),
                stroke: obj.stroke || '#3b82f6',
                fill: obj.fill || 'rgba(59, 130, 246, 0.2)',
                strokeWidth: obj.strokeWidth || 2,
                rotation: obj.rotation || 0
            })));
        }

        // 3. Add 3D shapes
        if (model.shapes3D) {
            store.setShapes3D(model.shapes3D.map(shape => ({
                ...shape,
                id: shape.id || `shape3d_${Math.random().toString(36).substring(2, 9)}`,
                color: shape.color || '#3b82f6',
                mass: shape.mass || 1.0,
                restitution: shape.restitution || 0.5,
                friction: shape.friction || 0.3,
                isStatic: shape.isStatic || false
            })));
        }

        // 4. Apply constraints if present
        if (model.constraints) {
            store.setConstraints(model.constraints);
        }

        // 4. Set simulation settings if provided
        if (model.simulationSettings) {
            store.setSimulationSettings(model.simulationSettings);
        }

        // 5. Reset playback state
        store.resetPlayback();

        console.log(`Model loaded: ${model.name}`);
        
        // Return a summary for the UI/AI
        return {
            success: true,
            name: model.name,
            description: model.description
        };
    }
};

export default modelLoader;
