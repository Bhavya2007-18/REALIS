

export const validateModelSchema = (model) => {
    if (!model.id || !model.name) {
        throw new Error("Model must have an 'id' and 'name'.");
    }

    
    if (model.objects !== undefined && !Array.isArray(model.objects)) {
        throw new Error("Model 'objects' must be an array if provided.");
    }

    
    const validatedModel = {
        id:          model.id,
        name:        model.name,
        description: model.description || "",
        category:    model.category    || "General",
        complexity:  model.complexity  || "Low",

        objects: (model.objects || []).map(obj => {
            if (!obj.id || !obj.type) throw new Error(`Object missing id or type: ${JSON.stringify(obj)}`);
            return {
                ...obj,
                stroke:      obj.stroke      || '#3b82f6',
                fill:        obj.fill        || 'rgba(59, 130, 246, 0.2)',
                strokeWidth: obj.strokeWidth || 2,
                rotation:    obj.rotation    || 0,
                isStatic:    obj.isStatic    || false,
                mass:        obj.mass        || (obj.isStatic ? 0 : 1.0)
            };
        }),

        
        shapes3D: Array.isArray(model.shapes3D) ? model.shapes3D : [],

        constraints: Array.isArray(model.constraints) ? model.constraints.map(c => {
            if (!c.id || !c.type || !c.targetA) throw new Error(`Constraint missing required fields: ${JSON.stringify(c)}`);
            return c;
        }) : [],

        physics_config: {
            gravity:          { x: 0, y: 9.81, z: 0, ...(model.physics_config?.gravity) },
            timeStep:         model.physics_config?.timeStep         || 0.016,
            solverIterations: model.physics_config?.solverIterations || 10,
            subSteps:         model.physics_config?.subSteps         || 1,
            airResistance:    model.physics_config?.airResistance    || 0.01,
            frictionCoeff:    model.physics_config?.frictionCoeff    || 0.3,
        },

        controls: {
            parameters: Array.isArray(model.controls?.parameters) ? model.controls.parameters : []
        },

        
        v6Config: model.v6Config || null,

        metadata: {
            difficulty:        model.metadata?.difficulty        || "low",
            tags:              Array.isArray(model.metadata?.tags) ? model.metadata.tags : [],
            simplifyShapes:    model.metadata?.simplifyShapes    || false,
            zoom:              model.metadata?.zoom              || 1,
            center:            model.metadata?.center            || { x: typeof window !== 'undefined' ? window.innerWidth / 2 : 500, y: typeof window !== 'undefined' ? window.innerHeight / 2 : 400 },
            
            isV6Simulation:    model.metadata?.isV6Simulation    || false,
            engineType:        model.metadata?.engineType        || null,
        }
    };

    return validatedModel;
};