// REALIS AI Tool Registry
// Pattern adapted from Aedifex packages/editor/src/components/ai/prompt/openai-tools.ts
// Each tool declares a JSON schema so any LLM (backend passthrough, local rule parser,
// future MCP server) can emit `tool_calls` that the validator + executor can handle.

export const AI_TOOLS = [
    {
        name: 'set_physics',
        description: 'Set a physics property (mass, friction, restitution, isStatic) on a selected or targeted object.',
        parameters: {
            type: 'object',
            properties: {
                objectId: { type: 'string', description: 'Object id. Omit to use the current selection.' },
                field: { type: 'string', enum: ['mass', 'friction', 'restitution', 'isStatic', 'material'] },
                value: { oneOf: [{ type: 'number' }, { type: 'boolean' }, { type: 'string' }] }
            },
            required: ['field', 'value']
        }
    },
    {
        name: 'create_object',
        description: 'Create a 2D canvas object (rect, circle, polygon, path).',
        parameters: {
            type: 'object',
            properties: {
                type: { type: 'string', enum: ['rect', 'circle'] },
                x: { type: 'number', description: 'rect: top-left x' },
                y: { type: 'number', description: 'rect: top-left y' },
                width: { type: 'number' },
                height: { type: 'number' },
                cx: { type: 'number', description: 'circle center x' },
                cy: { type: 'number', description: 'circle center y' },
                r: { type: 'number', description: 'circle radius' },
                description: { type: 'string', description: 'natural-language note about the object' }
            },
            required: ['type']
        }
    },
    {
        name: 'create_shape3d',
        description: 'Create a native 3D shape (cube, sphere, cylinder, cone, plane).',
        parameters: {
            type: 'object',
            properties: {
                type: { type: 'string', enum: ['cube', 'sphere', 'cylinder', 'cone', 'plane', 'capsule'] },
                position: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
                params: { type: 'object', description: 'geometry params, e.g. {width,height,depth} or {radius,height}' }
            },
            required: ['type']
        }
    },
    {
        name: 'add_joint',
        description: 'Add a constraint (distance/rod, fixed anchor) between two objects or to the world.',
        parameters: {
            type: 'object',
            properties: {
                type: { type: 'string', enum: ['distance', 'fixed'] },
                targetA: { type: 'string' },
                targetB: { type: 'string', description: 'omit for world anchor' },
                distance: { type: 'number', description: 'required for distance joints' }
            },
            required: ['type', 'targetA']
        }
    },
    {
        name: 'load_model',
        description: 'Load one of the REALIS demo models.',
        parameters: {
            type: 'object',
            properties: {
                modelId: { type: 'string', enum: ['engine', 'pendulum', 'projectile', 'thermal', 'v6Engine'] }
            },
            required: ['modelId']
        }
    },
    {
        name: 'run_simulation',
        description: 'Start or stop the physics simulation playback.',
        parameters: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['start', 'stop', 'reset'] }
            },
            required: ['action']
        }
    },
    {
        name: 'apply_patch',
        description: 'Apply a list of raw object/constraint updates. Reserved for batch operations.',
        parameters: {
            type: 'object',
            properties: {
                patches: { type: 'array', items: { type: 'object' } }
            },
            required: ['patches']
        }
    },
    {
        name: 'ask_user',
        description: 'Ask the user a clarifying question when the request is ambiguous.',
        parameters: {
            type: 'object',
            properties: {
                question: { type: 'string' },
                suggestions: { type: 'array', items: { type: 'string' } }
            },
            required: ['question']
        }
    },
    {
        name: 'confirm_preview',
        description: 'Confirm the applied ghost preview and commit it to the scene.',
        parameters: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'reject_preview',
        description: 'Reject the applied ghost preview and discard changes.',
        parameters: { type: 'object', properties: {}, required: [] }
    }
];

export const TOOL_BY_NAME = Object.fromEntries(AI_TOOLS.map(t => [t.name, t]));

export function toolNames() {
    return AI_TOOLS.map(t => t.name);
}