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
        store.setObjects(model.objects.map(obj => ({
            ...obj,
            // Ensure unique IDs if they aren't already (though models should have stable IDs)
            // id: obj.id || Math.random().toString(36).substring(2, 9),
            stroke: obj.stroke || '#3b82f6',
            fill: obj.fill || 'rgba(59, 130, 246, 0.2)',
            strokeWidth: obj.strokeWidth || 2,
            rotation: obj.rotation || 0
        })));

        // 3. Apply constraints if present
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
