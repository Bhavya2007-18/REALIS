/**
 * solverInterface.test.mjs — zero-dependency tests for the canonical solver handle.
 * Run (owner, with a JS runtime):  cd web && node --test src/utils/solverInterface.test.mjs
 *
 * Uses only node:test + node:assert/strict. No test runner is configured in this repo yet
 * (Phase-7/§22 task), but the project is "type":"module" so this .mjs imports the .js as ESM.
 *
 * NOTE: this imports solverInterface.js, which imports simulationSafety.js. Both are pure and
 * dependency-free, so the import graph resolves without a bundler.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    SOLVER_FAMILY,
    detectSolverFamily,
    createSolverHandle,
} from './solverInterface.js';

/* ------------------------------------------------------------------ fakes */

// WORLD: step() takes no dt, one internal fixed step; setBodies/updateSettings/getSnapshot/reset.
function makeWorldFake() {
    return {
        dt: 0.02,
        steps: 0,
        bodiesSet: null,
        settings: null,
        wasReset: false,
        setBodies(b) { this.bodiesSet = b; },
        step() { this.steps += 1; },              // arity 0
        updateSettings(s) { this.settings = s; },
        getSnapshot() { return { steps: this.steps }; },
        reset() { this.wasReset = true; this.steps = 0; },
    };
}

// LAB: step(dtSeconds) advances by dt; updateConfig/getSnapshot/reset.
function makeLabFake() {
    return {
        steps: 0,
        simTime: 0,
        config: null,
        step(dt) { this.steps += 1; this.simTime += dt; },   // arity 1
        updateConfig(c) { this.config = c; },
        getSnapshot() { return { steps: this.steps, simTime: this.simTime }; },
        reset() { this.steps = 0; this.simTime = 0; },
    };
}

// ACCUMULATOR: tick(realDt) owns internal accumulation; updateConfig/getSnapshot/reset.
function makeAccumFake() {
    return {
        ticks: 0,
        consumed: 0,
        config: null,
        tick(realDt) { this.ticks += 1; this.consumed += realDt; },  // has tick → ACCUM
        updateConfig(c) { this.config = c; },
        getSnapshot() { return { ticks: this.ticks, consumed: this.consumed }; },
        reset() { this.ticks = 0; this.consumed = 0; },
    };
}

/* ------------------------------------------------------------- detection */

test('detectSolverFamily: tick wins even when step also present', () => {
    const both = { tick() {}, step(dt) {} };
    assert.equal(detectSolverFamily(both), SOLVER_FAMILY.ACCUMULATOR);
});

test('detectSolverFamily: arity disambiguates WORLD (0) vs LAB (1)', () => {
    assert.equal(detectSolverFamily({ step() {} }), SOLVER_FAMILY.WORLD);
    assert.equal(detectSolverFamily({ step(dt) {} }), SOLVER_FAMILY.LAB);
});

test('detectSolverFamily: null for non-solvers', () => {
    assert.equal(detectSolverFamily(null), null);
    assert.equal(detectSolverFamily({}), null);
    assert.equal(detectSolverFamily(42), null);
});

test('createSolverHandle: throws when family is indeterminate and not forced', () => {
    assert.throws(() => createSolverHandle({}), /solver family/);
    // ...but an explicit family override lets an odd object through.
    assert.doesNotThrow(() => createSolverHandle({ step() {} }, { family: SOLVER_FAMILY.WORLD }));
});

/* ---------------------------------------------------------- dispatch/clock */

test('WORLD: step() called no-arg; clock advances by worldDt, not the passed dt', () => {
    const w = makeWorldFake();
    const h = createSolverHandle(w);            // worldDt defaults to w.dt = 0.02
    assert.equal(h.family, SOLVER_FAMILY.WORLD);
    h.step(0.5);                                 // passed dt ignored for WORLD advance
    h.step(0.5);
    assert.equal(w.steps, 2);
    assert.equal(h.getFrame(), 2);
    assert.ok(Math.abs(h.getTime() - 0.04) < 1e-12, `clock=${h.getTime()}`);
});

test('WORLD: worldDt falls back to settings.timeStep (real mechanicsSolver/thermalSolver shape)', () => {
    // Real WORLD solvers hold their step at this.settings.timeStep, with no top-level dt.
    const w = {
        settings: { timeStep: 0.01 },
        steps: 0,
        step() { this.steps += 1; },             // arity 0 → WORLD
        getSnapshot() { return { steps: this.steps }; },
    };
    const h = createSolverHandle(w);
    h.step(1);
    h.step(1);
    assert.equal(w.steps, 2);
    assert.ok(Math.abs(h.getTime() - 0.02) < 1e-12, `clock=${h.getTime()}`);
});

test('LAB: step(dt) receives clamped dt; clock tracks the same dt', () => {
    const l = makeLabFake();
    const h = createSolverHandle(l);
    assert.equal(h.family, SOLVER_FAMILY.LAB);
    h.step(0.016);
    h.step(0.016);
    assert.equal(l.steps, 2);
    assert.ok(Math.abs(l.simTime - 0.032) < 1e-12);
    assert.ok(Math.abs(h.getTime() - 0.032) < 1e-12);
});

test('ACCUMULATOR: tick(realDt) receives dt; clock tracks realDt consumed', () => {
    const a = makeAccumFake();
    const h = createSolverHandle(a);
    assert.equal(h.family, SOLVER_FAMILY.ACCUMULATOR);
    h.step(0.016);
    h.step(0.010);
    assert.equal(a.ticks, 2);
    assert.ok(Math.abs(a.consumed - 0.026) < 1e-12);
    assert.ok(Math.abs(h.getTime() - 0.026) < 1e-12);
});

/* ------------------------------------------------------------- dt guards */

test('bad dt (NaN / <=0) is a no-op with no clock/solver advance', () => {
    const l = makeLabFake();
    const h = createSolverHandle(l);
    h.step(NaN);
    h.step(0);
    h.step(-1);
    assert.equal(l.steps, 0);
    assert.equal(h.getFrame(), 0);
    assert.equal(h.getTime(), 0);
});

test('pathological dt is clamped to maxFrameDt', () => {
    const l = makeLabFake();
    const h = createSolverHandle(l, { maxFrameDt: 0.25 });
    h.step(999);                                 // stalled-tab delta
    assert.ok(Math.abs(l.simTime - 0.25) < 1e-12);
    assert.ok(Math.abs(h.getTime() - 0.25) < 1e-12);
});

/* --------------------------------------------------------- pause / resume */

test('pause() freezes stepping; resume() continues; snapshot still readable while paused', () => {
    const l = makeLabFake();
    const h = createSolverHandle(l);
    h.step(0.016);
    h.pause();
    assert.equal(h.isPaused(), true);
    const snapWhilePaused = h.step(0.016);       // no-op advance, returns current snapshot
    assert.equal(l.steps, 1);                    // unchanged
    assert.deepEqual(snapWhilePaused, { steps: 1, simTime: 0.016 });
    h.resume();
    h.step(0.016);
    assert.equal(l.steps, 2);
});

/* -------------------------------------------------- forwarding + reset */

test('updateConfig forwards to updateConfig (LAB) or updateSettings (WORLD)', () => {
    const l = makeLabFake();
    const hl = createSolverHandle(l);
    hl.updateConfig({ mass: 2 });
    assert.deepEqual(l.config, { mass: 2 });

    const w = makeWorldFake();
    const hw = createSolverHandle(w);
    hw.updateConfig({ gravity: 9.81 });
    assert.deepEqual(w.settings, { gravity: 9.81 });
});

test('setBodies forwards only to WORLD; harmless no-op elsewhere', () => {
    const w = makeWorldFake();
    const hw = createSolverHandle(w);
    hw.setBodies([{ id: 'a' }]);
    assert.deepEqual(w.bodiesSet, [{ id: 'a' }]);

    const l = makeLabFake();
    const hl = createSolverHandle(l);
    assert.doesNotThrow(() => hl.setBodies([{ id: 'b' }]));   // no setBodies → silent no-op
});

test('reset() resets solver and zeroes the clock and pause flag', () => {
    const l = makeLabFake();
    const h = createSolverHandle(l);
    h.step(0.016);
    h.pause();
    h.reset();
    assert.equal(l.steps, 0);
    assert.equal(h.getTime(), 0);
    assert.equal(h.getFrame(), 0);
    assert.equal(h.isPaused(), false);
});
