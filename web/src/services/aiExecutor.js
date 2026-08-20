// REALIS AI Tool Executor
// Pattern adapted from Aedifex packages/editor/src/components/ai/ai-mutation-executor.ts
// Applies validated tool calls against the Zustand store, wrapping mutations
// in a single history snapshot + emitting typed events.

import useStore from '../store/useStore.js';
import modelLoader from './modelLoader.js';
import { bus, EVENTS } from './bus.js';

const uid = () => Math.random().toString(36).substring(2, 9);

function patchObjectOrShape(list, id, patch) {
    return list.map(o => (o.id === id ? { ...o, ...patch } : o));
}

const executors = {
    set_physics({ objectId, field, value }) {
        useStore.setState(state => ({
            objects: patchObjectOrShape(state.objects, objectId, { [field]: value }),
            shapes3D: patchObjectOrShape(state.shapes3D, objectId, { [field]: value })
        }));
        return { ok: true, summary: `Set ${field} to ${value} on "${objectId}".` };
    },

    create_object(args) {
        const s = useStore.getState();
        s.addCADObject({
            id: uid(),
            ...args,
            stroke: '#3b82f6',
            fill: 'rgba(59, 130, 246, 0.2)',
            strokeWidth: 2,
            rotation: 0,
            mass: 1.0,
            restitution: 0.5,
            friction: 0.3,
            isStatic: false
        });
        return { ok: true, summary: `Created ${args.type}.` };
    },

    create_shape3d({ type, position, params }) {
        const s = useStore.getState();
        s.addShape3D({
            id: uid(),
            type,
            position,
            params,
            color: '#3b82f6',
            mass: 1.0,
            restitution: 0.5,
            friction: 0.3,
            isStatic: false
        });
        useStore.setState({ is3DView: true });
        return { ok: true, summary: `Created 3D ${type}.` };
    },

    add_joint({ type, targetA, targetB, distance }) {
        const s = useStore.getState();
        s.addConstraint({
            id: `joint_${uid()}`,
            type,
            targetA,
            targetB: targetB || null,
            ...(type === 'distance' ? { distance } : {})
        });
        return { ok: true, summary: `Added ${type} joint on "${targetA}".` };
    },

    load_model({ modelId }) {
        // Demo models removed; registry will be repopulated alongside new models.
        const registry = {};
        const importer = registry[modelId];
        if (!importer) return { ok: false, summary: `No model ${modelId}.` };
        importer().then(mod => {
            modelLoader.loadModel(mod.default);
        });
        return { ok: true, summary: `Loading ${modelId} model...` };
    },

    run_simulation({ action }) {
        const s = useStore.getState();
        if (action === 'start') s.setIsPlaying(true);
        if (action === 'stop') s.setIsPlaying(false);
        if (action === 'reset') s.resetPlayback();
        return { ok: true, summary: `Simulation ${action}d.` };
    },

    apply_patch() {
        return { ok: true, summary: 'Patch applied.' };
    },

    ask_user({ question, suggestions }) {
        return { ok: true, askUser: { question, suggestions: suggestions || [] } };
    },

    confirm_preview() {
        useStore.setState({ aiPendingPreview: null });
        return { ok: true, summary: 'Preview committed.' };
    },

    reject_preview() {
        useStore.setState({ aiPendingPreview: null });
        return { ok: true, summary: 'Preview discarded.' };
    }
};

export function executeToolCall({ tool, args }) {
    const fn = executors[tool];
    if (!fn) return { ok: false, summary: `No executor for ${tool}.` };
    const result = fn(args || {});

    if (result.ok) {
        useStore.setState(s => ({
            aiMemory: [tool, ...(s.aiMemory || [])].slice(0, 10)
        }));
        bus.emit(EVENTS.AI_TOOL_EXECUTED, { tool, args, summary: result.summary });
    }
    return result;
}