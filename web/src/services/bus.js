// REALIS typed event bus
// Pattern adapted from Pascal packages/core/src/events/bus.ts — small mitt bus
// with a centralized event-name registry so components never typo event strings.

import mitt from 'mitt';

export const EVENTS = {
    AI_TOOL_EXECUTED: 'ai:tool-executed',
    AI_AGENT_RUNNING: 'ai:agent-running',
    AI_AGENT_DONE: 'ai:agent-done',
    AI_ASK_USER: 'ai:ask-user',
    SCENE_LOADED: 'scene:loaded',
    SCENE_CHANGED: 'scene:changed',
    SELECTION_CHANGED: 'selection:changed',
    SIMULATION_STARTED: 'sim:started',
    SIMULATION_STOPPED: 'sim:stopped',
    UNDO: 'history:undo',
    REDO: 'history:redo'
};

export const bus = mitt();

export function on(event, handler) {
    bus.on(event, handler);
    return () => bus.off(event, handler);
}