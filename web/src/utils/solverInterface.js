/**
 * solverInterface.js — the ONE canonical solver contract for REALIS (Phase 2, step 1).
 *
 * The audit found 13 solvers split across THREE incompatible interface families and NO shared
 * base, NO single sim clock, and NO pause/resume/step primitive on any solver. This module
 * introduces a single handle that wraps any solver from any family behind one contract —
 * WITHOUT rewriting the solvers' (good) math — and seeds the single simulation clock plus
 * pause/resume. It is additive: importing it changes nothing until a loop opts in. Loops are
 * meant to migrate onto `createSolverHandle` one at a time.
 *
 * The three legacy families (see docs/architecture/REALIS_ARCHITECTURE_MAP.md §5.2):
 *   WORLD        setBodies() → step()      [no dt; one fixed internal step] → getSnapshot()
 *   LAB          updateConfig() → step(dtSeconds) [advances by dt, internal substeps] → getSnapshot()
 *   ACCUMULATOR  tick(realDt) [OWN internal fixed-step accumulator] → getSnapshot()
 *
 * Canonical handle contract (family-agnostic):
 *   step(dtSeconds) → snapshot | null   advance one tick (no-op while paused)
 *   getSnapshot()   → snapshot | null
 *   reset()                              reset solver + clock
 *   updateConfig(cfg)                    forwards to updateConfig()/updateSettings() if present
 *   setBodies(bodies)                    forwards to setBodies() if present (WORLD)
 *   pause() / resume() / isPaused()      handle-level, since no solver implements it
 *   getTime() / getFrame()               the single monotonic sim clock
 *   family                               the resolved SOLVER_FAMILY
 *
 * @typedef {Object} SolverHandle
 */

import { clamp, isFiniteNumber, FIXED_STEP, createSimulationLogger } from './simulationSafety.js';

export const SOLVER_FAMILY = Object.freeze({
    WORLD: 'world',
    LAB: 'lab',
    ACCUMULATOR: 'accumulator',
});

/**
 * Infer a solver's family from the methods it exposes. Explicit `opts.family` always wins.
 * Detection order matters: ACCUMULATOR solvers own a `tick(realDt)` entry point (some also
 * expose `step`), so `tick` is checked first. WORLD `step()` takes no dt (arity 0) while
 * LAB `step(dt)` takes one — arity disambiguates the two `step` families.
 * @param {any} solver
 * @returns {(SOLVER_FAMILY[keyof SOLVER_FAMILY])|null}
 */
export function detectSolverFamily(solver) {
    if (!solver || typeof solver !== 'object') return null;
    if (typeof solver.tick === 'function') return SOLVER_FAMILY.ACCUMULATOR;
    if (typeof solver.step === 'function') {
        return solver.step.length >= 1 ? SOLVER_FAMILY.LAB : SOLVER_FAMILY.WORLD;
    }
    return null;
}

/**
 * Wrap a solver of any family in the canonical handle.
 *
 * @param {any} solver a solver instance from utils/solvers/*
 * @param {Object} [opts]
 * @param {(SOLVER_FAMILY[keyof SOLVER_FAMILY])} [opts.family] force the family (skip detection)
 * @param {number} [opts.worldDt] clock increment per WORLD `step()` call (WORLD `step()` takes no dt).
 *                                 Defaults to solver.dt ?? solver.timeStep ?? 0.016.
 * @param {number} [opts.maxFrameDt] hard cap on a single dt (defaults to FIXED_STEP.MAX_FRAME_DT)
 * @param {{log:Function}} [opts.logger] throttled logger (defaults to a 'solver' logger)
 * @returns {SolverHandle}
 */
export function createSolverHandle(solver, opts = {}) {
    const family = opts.family || detectSolverFamily(solver);
    const logger = opts.logger || createSimulationLogger('solver');
    if (!family) {
        throw new Error('[solverInterface] Could not determine solver family (no step/tick). Pass opts.family.');
    }

    const maxFrameDt = isFiniteNumber(opts.maxFrameDt) ? opts.maxFrameDt : FIXED_STEP.MAX_FRAME_DT;
    // WORLD solvers advance by their own internal step regardless of the dt we pass, so the shared
    // clock advances by that step instead. Resolve it from the solver's own config where possible
    // (mechanicsSolver/thermalSolver keep it at settings.timeStep) before falling back to 0.016.
    // WORLD determinism relies on the caller driving it from a fixed-step loop (as SimulateWorkspace does).
    const worldDt = isFiniteNumber(opts.worldDt) ? opts.worldDt
        : isFiniteNumber(solver.dt) ? solver.dt
        : isFiniteNumber(solver.timeStep) ? solver.timeStep
        : isFiniteNumber(solver.settings?.timeStep) ? solver.settings.timeStep
        : 0.016;

    let paused = false;
    let time = 0;
    let frame = 0;

    const snapshot = () => (typeof solver.getSnapshot === 'function' ? solver.getSnapshot() : null);

    return {
        family,

        step(dtSeconds) {
            if (paused) return snapshot();

            // No silent failures (rule 3.4): reject a non-finite / non-positive dt with a diagnostic
            // instead of feeding NaN into the integrator.
            if (!isFiniteNumber(dtSeconds) || dtSeconds <= 0) {
                logger.log(frame, 'bad-dt', { dtSeconds, family }, 'error');
                return snapshot();
            }

            // Clamp a pathological frame delta (stalled tab) so the sim can't spiral.
            const dt = clamp(dtSeconds, 0, maxFrameDt);

            switch (family) {
                case SOLVER_FAMILY.WORLD:
                    solver.step();                 // no-arg: one internal fixed step
                    time += worldDt;
                    break;
                case SOLVER_FAMILY.LAB:
                    solver.step(dt);               // advances by dt (internal substeps)
                    time += dt;
                    break;
                case SOLVER_FAMILY.ACCUMULATOR:
                    solver.tick(dt);               // owns its internal fixed-step accumulator
                    time += dt;
                    break;
                default:
                    logger.log(frame, 'unknown-family', { family }, 'error');
                    return snapshot();
            }

            frame += 1;
            return snapshot();
        },

        getSnapshot: snapshot,

        reset() {
            if (typeof solver.reset === 'function') solver.reset();
            time = 0;
            frame = 0;
            paused = false;
        },

        updateConfig(cfg) {
            // LAB uses updateConfig(); WORLD uses updateSettings(); tolerate either.
            if (typeof solver.updateConfig === 'function') solver.updateConfig(cfg);
            else if (typeof solver.updateSettings === 'function') solver.updateSettings(cfg);
        },

        setBodies(bodies) {
            if (typeof solver.setBodies === 'function') solver.setBodies(bodies);
        },

        pause() { paused = true; },
        resume() { paused = false; },
        isPaused() { return paused; },

        getTime() { return time; },
        getFrame() { return frame; },
    };
}
