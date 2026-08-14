// REALIS scene serializer
// Pattern adapted from Aedifex packages/editor/src/components/ai/ai-scene-serializer.ts
// Produces a compact, structured snapshot of the scene that the agent loop
// (or a remote LLM) can act on.

import useStore from '../store/useStore.js';

const summarizeHitbox = (o) => {
    if (o.type === 'rect') return `x:${o.x},y:${o.y},w:${o.width},h:${o.height}`;
    if (o.type === 'circle') return `cx:${o.cx},cy:${o.cy},r:${o.r}`;
    if (o.params) return JSON.stringify(o.params);
    if (o.position) return `at ${JSON.stringify(o.position)}`;
    return '';
};

export function serializeScene() {
    const s = useStore.getState();
    return {
        activeWorkspace: s.activeWorkspace,
        is3DView: s.is3DView,
        simulationType: s.simulationType,
        isPlaying: s.isPlaying,
        simTime: s.simTime ?? s.simulationState?.time ?? 0,
        objects: s.objects.map(o => ({
            id: o.id,
            type: o.type ?? 'unknown',
            hitbox: summarizeHitbox(o),
            mass: o.mass,
            restitution: o.restitution,
            friction: o.friction,
            isStatic: o.isStatic ?? false,
            description: o.description || ''
        })),
        shapes3D: s.shapes3D.map(sh => ({
            id: sh.id,
            type: sh.type ?? 'unknown',
            params: sh.params,
            position: sh.position,
            mass: sh.mass,
            isStatic: sh.isStatic ?? false
        })),
        constraints: (s.constraints || []).map(c => ({
            id: c.id,
            type: c.type,
            targetA: c.targetA,
            targetB: c.targetB || null,
            distance: c.distance
        })),
        selection: {
            objects: s.selectedIds,
            shapes3D: s.selected3DIds,
            joint: s.selectedJointId
        },
        simulationSettings: {
            gravity: s.simulationSettings?.gravity,
            timeStep: s.simulationSettings?.timeStep,
            airResistance: s.simulationSettings?.airResistance,
            frictionCoeff: s.simulationSettings?.frictionCoeff
        },
        energy: s.simulationState?.energy
    };
}

// Compact prompt-friendly string form when sending context to a remote LLM.
export function serializeSceneForPrompt() {
    const sc = serializeScene();
    const lines = [];
    lines.push(`Workspace: ${sc.activeWorkspace} | ${sc.is3DView ? '3D' : '2D'} | simType=${sc.simulationType} | isPlaying=${sc.isPlaying}`);
    if (sc.objects.length) {
        lines.push("2D objects:");
        sc.objects.forEach(o => lines.push(` - ${o.id} (${o.type}, ${o.hitbox}, m=${o.mass}, static=${o.isStatic}${o.description ? `, "${o.description}"` : ''})`));
    }
    if (sc.shapes3D.length) {
        lines.push("3D shapes:");
        sc.shapes3D.forEach(sh => lines.push(` - ${sh.id} (${sh.type}, ${JSON.stringify(sh.params)}, m=${sh.mass}, static=${sh.isStatic})`));
    }
    if (sc.constraints.length) {
        lines.push("Constraints:");
        sc.constraints.forEach(c => lines.push(` - ${c.id} ${c.type} ${c.targetA}${c.targetB ? '->' + c.targetB : ''}${c.distance ? ` d=${c.distance}` : ''}`));
    }
    lines.push(`Selection: ${JSON.stringify(sc.selection)}`);
    lines.push(`Settings: ${JSON.stringify(sc.simulationSettings)}`);
    return lines.join('\n');
}