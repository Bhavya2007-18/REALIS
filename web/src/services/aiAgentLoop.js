// REALIS AI Agent Loop
// Pattern adapted from Aedifex packages/editor/src/components/ai/ai-agent-loop.ts
// Pipeline: user input -> intent -> tool_calls -> validate -> execute -> reply.
// A local rule parser produces structured tool calls; anything unparseable
// falls back to the remote backend /api/chat, whose tool_calls are validated
// the same way.

import { validateToolCall } from './aiValidators.js';
import { executeToolCall } from './aiExecutor.js';
import { bus, EVENTS } from './bus.js';

export const MAX_ITERATIONS = 5;
export const MAX_CONSECUTIVE_FAILURES = 3;

// ---------- Local intent parser (rule-based, structured tool_calls) ----------

const num = (msg) => {
    const m = msg.match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : null;
};

function parseIntent(raw) {
    const msg = raw.toLowerCase();
    const calls = [];

    // physics
    const physFields = [
        ['mass', 'mass'], ['friction', 'friction'], ['restitution', 'restitution'],
        ['bounciness', 'restitution'], ['bounce', 'restitution']
    ];
    for (const [kw, field] of physFields) {
        if (msg.includes(kw) && num(msg) !== null) {
            calls.push({ tool: 'set_physics', args: { field, value: num(msg) } });
            return calls;
        }
    }

    if (/(make it static|make static|floor|ground|fix it in place|solid|don'?t move)/.test(msg)) {
        calls.push({ tool: 'set_physics', args: { field: 'isStatic', value: true } });
        return calls;
    }
    if (/(make it dynamic|make dynamic|unfix|let it move)/.test(msg)) {
        calls.push({ tool: 'set_physics', args: { field: 'isStatic', value: false } });
        return calls;
    }
    if (/(make it (steel|rubber|wood|plastic)|apply (steel|rubber|wood|plastic))/.test(msg)) {
        const m = msg.match(/(steel|rubber|wood|plastic)/);
        calls.push({ tool: 'set_physics', args: { field: 'material', value: m[1] } });
        return calls;
    }

    // joints
    if (/(pin to world|pin it|anchor|fixed joint|pin to ground)/.test(msg)) {
        calls.push({ tool: 'add_joint', args: { type: 'fixed' } });
        return calls;
    }
    if (/(link|distance joint|rod|connect|joint between)/.test(msg)) {
        calls.push({ tool: 'add_joint', args: { type: 'distance', distance: num(msg) ?? 100 } });
        return calls;
    }

    // create geometry
    if (/cube|3d box/.test(msg)) {
        const d = num(msg) ?? 100;
        calls.push({ tool: 'create_shape3d', args: { type: 'cube', params: { width: d, height: d, depth: d } } });
        return calls;
    }
    if (/sphere/.test(msg)) {
        calls.push({ tool: 'create_shape3d', args: { type: 'sphere', params: { radius: num(msg) ?? 50 } } });
        return calls;
    }
    if (/(draw|create|make|add).*(rect|rectangle|box)/.test(msg)) {
        const w = num(msg) ?? 100;
        calls.push({ tool: 'create_object', args: { type: 'rect', width: w, height: w } });
        return calls;
    }
    if (/(draw|create|make|add).*(circle|disc|ball)/.test(msg)) {
        calls.push({ tool: 'create_object', args: { type: 'circle', r: num(msg) ?? 50 } });
        return calls;
    }

    // simulation
    if (/(run|start|play).*(sim|simulation)/.test(msg)) {
        calls.push({ tool: 'run_simulation', args: { action: 'start' } });
        return calls;
    }
    if (/(stop|pause).*(sim|simulation)/.test(msg)) {
        calls.push({ tool: 'run_simulation', args: { action: 'stop' } });
        return calls;
    }
    if (/reset/.test(msg)) {
        calls.push({ tool: 'run_simulation', args: { action: 'reset' } });
        return calls;
    }

    return null; // unparseable -> fall through to backend
}

// ---------- Agent loop ----------

export async function runAgent(userInput, { backendFetch } = {}) {
    bus.emit(EVENTS.AI_AGENT_RUNNING, { input: userInput });
    const results = [];
    let consecutiveFailures = 0;

    let toolCalls = parseIntent(userInput);

    // Remote fallback: ask backend for tool_calls
    if (!toolCalls && backendFetch) {
        try {
            const res = await backendFetch(userInput);
            toolCalls = res?.tool_calls || null;
        } catch (err) {
            results.push({ ok: false, summary: `Backend unavailable: ${err.message}` });
        }
    }

    if (!toolCalls || toolCalls.length === 0) {
        bus.emit(EVENTS.AI_AGENT_DONE, { results, input: userInput });
        return {
            results,
            needHelp: true,
            reply: "I didn't catch a concrete action there. Try: 'set mass to 5', 'make it static', 'pin it to world', 'draw a 100x100 box', or 'run simulation'."
        };
    }

    const toolCallsToRun = toolCalls.slice(0, MAX_ITERATIONS);

    for (const tc of toolCallsToRun) {
        const validated = validateToolCall(tc.tool, tc.args);
        if (validated.status === 'invalid') {
            consecutiveFailures++;
            results.push({ ok: false, summary: validated.reason });
            continue;
        }
        const exec = executeToolCall({ tool: tc.tool, args: validated.args });
        if (exec.ok) consecutiveFailures = 0;
        else consecutiveFailures++;
        results.push({ ...exec, tool: tc.tool, reason: validated.reason });

        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            results.push({ ok: false, summary: 'Stopping: too many failed operations in a row.' });
            break;
        }
        if (exec.askUser) {
            bus.emit(EVENTS.AI_ASK_USER, exec.askUser);
        }
    }

    const done = results.filter(r => r.ok);
    const summaryText = done.length
        ? done.map(r => r.summary || r.reason).join('\n')
        : 'Nothing was changed. ' + results.map(r => r.summary).filter(Boolean).join(' ');

    bus.emit(EVENTS.AI_AGENT_DONE, { results, input: userInput });
    return { results, needHelp: false, reply: summaryText, toolCalls: toolCallsToRun };
}