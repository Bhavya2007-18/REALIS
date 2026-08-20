// REALIS AI Tool Validators
// Pattern adapted from Aedifex packages/editor/src/components/ai/mutation/validate-*.ts
// Every validator returns { status: 'valid' | 'adjusted' | 'invalid', reason, args }

import useStore from '../store/useStore.js';

function findTarget(objectId) {
    const { objects, shapes3D, selectedIds, selected3DIds } = useStore.getState();
    const target = objects.find(o => o.id === objectId) || shapes3D.find(s => s.id === objectId);
    if (target) return { target, in3D: !!shapes3D.find(s => s.id === objectId) };

    const selection = selectedIds[0] || selected3DIds[0];
    if (!selection) return null;
    const selTarget = objects.find(o => o.id === selection) || shapes3D.find(s => s.id === selection);
    return selTarget ? { target: selTarget, in3D: !!shapes3D.find(s => s.id === selection) } : null;
}

const validators = {
    set_physics(args) {
        const { field, value } = args;
        if (!['mass', 'friction', 'restitution', 'isStatic', 'material'].includes(field)) {
            return { status: 'invalid', reason: `Unknown physics field "${field}". Use mass, friction, restitution, isStatic or material.` };
        }
        const resolved = findTarget(args.objectId);
        if (!resolved) {
            return { status: 'invalid', reason: 'No target object. Select an object first, or pass an objectId.' };
        }

        let adjusted = { ...args, objectId: resolved.target.id };
        if (field === 'mass') {
            if (typeof value !== 'number' || isNaN(value) || value <= 0) {
                return { status: 'invalid', reason: 'Mass must be a positive number.' };
            }
            adjusted.value = +value.toFixed(3);
        }
        if (field === 'friction' || field === 'restitution') {
            let v = typeof value === 'number' ? value : parseFloat(value);
            if (isNaN(v)) return { status: 'invalid', reason: `${field} needs a numeric value (0-1).` };
            adjusted.value = Math.min(1, Math.max(0, v));
            if (adjusted.value !== +value) adjusted.statusHint = 'clamped';
        }
        if (field === 'isStatic') {
            adjusted.value = !!value;
        }
        return { status: 'valid', reason: `${field}=${adjusted.value} on "${resolved.target.id}"`, args: adjusted };
    },

    create_object(args) {
        const { type } = args;
        if (type === 'rect') {
            const w = Number(args.width) || 100;
            const h = Number(args.height) || w;
            const x = args.x !== undefined ? Number(args.x) : 300;
            const y = args.y !== undefined ? Number(args.y) : 200;
            if (w <= 0 || h <= 0) return { status: 'invalid', reason: 'Rectangle width/height must be positive.' };
            return { status: 'valid', reason: `Rect ${w}x${h} at (${x},${y})`, args: { ...args, type: 'rect', x, y, width: w, height: h } };
        }
        if (type === 'circle') {
            const r = Number(args.r) || 50;
            const cx = args.cx !== undefined ? Number(args.cx) : 400;
            const cy = args.cy !== undefined ? Number(args.cy) : 300;
            if (r <= 0) return { status: 'invalid', reason: 'Circle radius must be positive.' };
            return { status: 'valid', reason: `Circle r=${r} at (${cx},${cy})`, args: { ...args, type: 'circle', cx, cy, r } };
        }
        return { status: 'invalid', reason: 'create_object supports rect and circle only (use create_shape3d for 3D).' };
    },

    create_shape3d(args) {
        const { type } = args;
        const allowed = ['cube', 'sphere', 'cylinder', 'cone', 'plane', 'capsule'];
        if (!allowed.includes(type)) {
            return { status: 'invalid', reason: `Unknown 3D shape "${type}". Use ${allowed.join(', ')}.` };
        }
        const pos = Array.isArray(args.position) && args.position.length === 3
            ? args.position.map(Number)
            : [0, 0, 0];
        const params = args.params || {};
        if (type === 'sphere' && !(params.radius > 0)) params.radius = 50;
        if (type === 'cube') {
            params.width = params.width ?? 100;
            params.height = params.height ?? 100;
            params.depth = params.depth ?? 100;
        }
        if (type === 'cylinder' || type === 'cone') {
            params.radius = params.radius ?? 50;
            params.height = params.height ?? 100;
        }
        return { status: 'valid', reason: `${type} at (${pos.join(',')})`, args: { ...args, type, position: pos, params } };
    },

    add_joint(args) {
        const { type, targetA } = args;
        if (!['distance', 'fixed'].includes(type)) {
            return { status: 'invalid', reason: 'add_joint supports type "distance" or "fixed".' };
        }
        const a = targetA || useStore.getState().selectedIds[0] || useStore.getState().selected3DIds[0];
        if (!a) return { status: 'invalid', reason: 'No target object. Select one or pass targetA.' };
        if (type === 'distance' && !(Number(args.distance) > 0)) {
            return { status: 'invalid', reason: 'distance joint needs a positive distance.' };
        }
        return { status: 'valid', reason: `${type} joint on "${a}"`, args: { ...args, targetA: a, distance: Number(args.distance) || 100 } };
    },

    load_model(args) {
        // Model registry is empty while demo models are rebuilt from scratch.
        const allowed = [];
        if (!allowed.includes(args.modelId)) {
            return { status: 'invalid', reason: `No loadable models yet. Demo models are being rebuilt.` };
        }
        return { status: 'valid', reason: `Load model ${args.modelId}`, args };
    },

    run_simulation(args) {
        if (!['start', 'stop', 'reset'].includes(args.action)) {
            return { status: 'invalid', reason: 'run_simulation action must be start, stop or reset.' };
        }
        return { status: 'valid', reason: `Simulation ${args.action}`, args };
    },

    apply_patch() {
        return { status: 'valid', reason: 'Batch patch applied', args: {} };
    },

    ask_user() {
        return { status: 'valid', reason: 'Ask user', args: {} };
    },

    confirm_preview() {
        return { status: 'valid', reason: 'Confirm preview', args: {} };
    },

    reject_preview() {
        return { status: 'valid', reason: 'Reject preview', args: {} };
    }
};

export function validateToolCall(toolName, rawArgs) {
    const fn = validators[toolName];
    if (!fn) return { status: 'invalid', reason: `Unknown tool "${toolName}".` };
    const result = fn(rawArgs || {});
    return { tool: toolName, ...result };
}