/**
 * useSimulation — centralized hook for triggering physics simulations.
 * Reads shapes3D, constraints, and simulationSettings from the Zustand store,
 * POSTs to /simulate, stores frames, and auto-plays on completion.
 *
 * Usage:
 *   const { runSimulation, isSimulating } = useSimulation();
 *   await runSimulation(); // optional: pass { duration, autoPlay }
 */
import { useState, useCallback } from 'react';
import useStore from '../store/useStore';

import { normalizeDraftToSimObject } from '../utils/draftEntityAdapter.js';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export function useSimulation() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simError, setSimError]         = useState(null);

  const objects            = useStore(s => s.objects);
  const shapes3D           = useStore(s => s.shapes3D);
  const constraints        = useStore(s => s.constraints);
  const simulationSettings = useStore(s => s.simulationSettings);
  const setSimulationFrames = useStore(s => s.setSimulationFrames);
  const setCurrentFrameIndex = useStore(s => s.setCurrentFrameIndex);
  const setIsPlaying       = useStore(s => s.setIsPlaying);
  const setSimulationState = useStore(s => s.setSimulationState);
  const addEnergySnapshot  = useStore(s => s.addEnergySnapshot);
  const clearEnergyHistory = useStore(s => s.clearEnergyHistory);

  const runSimulation = useCallback(async ({ duration = 3.0, autoPlay = true, injectShapes, injectConstraints } = {}) => {
    // Always read from store at call-time to avoid stale closure values.
    // This is critical for SketchImport: addShapes3D() commits to the store synchronously,
    // so getState() immediately reflects the injected shapes.
    const state = useStore.getState();
    const liveShapes3D      = injectShapes      ?? state.shapes3D      ?? [];
    const liveObjects       = state.objects      ?? [];
    const liveConstraints   = injectConstraints ?? state.constraints   ?? [];
    const liveSettings      = state.simulationSettings;

    const activeShapes = liveShapes3D.filter(s => s && s.id);
    const converted2DObjects = liveObjects
      .map(o => normalizeDraftToSimObject(o))
      .filter(Boolean);

    if (activeShapes.length === 0 && converted2DObjects.length === 0) {
      setSimError('No objects in scene to simulate.');
      return;
    }

    setIsSimulating(true);
    setSimError(null);
    clearEnergyHistory();

    const formatted3DObjects = activeShapes.map(shape => ({
      id: shape.id,
      geometry: {
        type: shape.type === 'sphere' ? 'sphere' : shape.type === 'cylinder' ? 'cylinder' : 'box',
        position: {
          x: Array.isArray(shape.position) ? shape.position[0] : (shape.position?.x ?? 0),
          y: Array.isArray(shape.position) ? shape.position[1] : (shape.position?.y ?? 0),
          z: Array.isArray(shape.position) ? shape.position[2] : (shape.position?.z ?? 0),
        },
        rotation: { x: 0, y: 0, z: 0 },
        dimensions: {
          x: Array.isArray(shape.dimensions) ? (shape.dimensions[0] ?? 1) : (shape.scale?.[0] ?? 1),
          y: Array.isArray(shape.dimensions) ? (shape.dimensions[1] ?? 1) : (shape.scale?.[1] ?? 1),
          z: Array.isArray(shape.dimensions) ? (shape.dimensions[2] ?? 1) : (shape.scale?.[2] ?? 1),
        }
      },
      physics: {
        mass: shape.physics?.mass ?? shape.mass ?? 1.0,
        restitution: shape.physics?.restitution ?? shape.restitution ?? 0.5,
        friction: shape.physics?.friction ?? shape.friction ?? 0.3,
        is_static: shape.physics?.isStatic ?? shape.isStatic ?? false,
        initial_velocity: shape.initialVelocity || shape.velocity || { x: 0, y: 0, z: 0 },
        initial_angular_velocity: { x: 0, y: 0, z: 0 },
      }
    }));

    const formatted2DObjects = converted2DObjects.map(obj => ({
      id: obj.id,
      geometry: {
        type: obj.type === 'circle' ? 'sphere' : 'box',
        position: obj.position,
        rotation: obj.rotation,
        dimensions: obj.dimensions
      },
      physics: {
        mass: obj.physics.mass,
        restitution: obj.physics.restitution,
        friction: obj.physics.friction,
        is_static: obj.physics.isStatic,
        initial_velocity: obj.physics.velocity,
        initial_angular_velocity: { x: 0, y: 0, z: 0 },
      }
    }));

    // Build the simulation request from live store state
    const request = {
      gravity: {
        x: liveSettings.gravity?.x ?? 0,
        y: -(liveSettings.gravity?.y ?? 9.81),  // negate: store = downward positive, API = negative Y = down
        z: liveSettings.gravity?.z ?? 0
      },
      time_step: liveSettings.timeStep ?? 0.016,
      duration: duration,
      sub_steps: Math.max(4, liveSettings.subSteps ?? 4),
      objects: [...formatted3DObjects, ...formatted2DObjects],
      constraints: liveConstraints.map(con => ({
        type: con.type ?? 'distance',
        target_a: con.targetA,
        target_b: con.targetB,
        distance: con.distance ?? 2.0,
        pivot_a: con.pivotA ?? { x: 0, y: 0, z: 0 },
        pivot_b: con.pivotB ?? { x: 0, y: 0, z: 0 },
        axis: con.axis ?? { x: 0, y: 0, z: 1 },
        motor_enabled: con.motorEnabled ?? false,
        target_velocity: con.targetVelocity ?? 0,
        max_force: con.maxForce ?? 100,
      })),
    };

    try {
      const res = await fetch(`${API_BASE}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Simulation failed: ${res.status}`);
      }

      const data = await res.json();
      const frames = data.frames ?? [];

      setSimulationFrames(frames);
      setCurrentFrameIndex(0);

      // Build energy history from frames
      if (frames.length > 0) {
        const g = Math.abs(liveSettings.gravity?.y ?? 9.81);
        frames.forEach((frame, idx) => {
          if (idx % 3 !== 0) return; // sample every 3rd frame for perf
          let ke = 0, pe = 0;
          frame.states.forEach(st => {
            const shape = activeShapes.find(s => s.id === st.id);
            const mass = shape?.physics?.mass ?? shape?.mass ?? 1.0;
            const v2 = (st.linear_velocity?.x ?? 0) ** 2 +
                       (st.linear_velocity?.y ?? 0) ** 2 +
                       (st.linear_velocity?.z ?? 0) ** 2;
            ke += 0.5 * mass * v2;
            pe += mass * g * Math.max(0, st.position?.y ?? 0);
          });
          addEnergySnapshot({ time: frame.time, ke, pe, total: ke + pe });
        });
      }

      // Update simulation state summary
      const lastFrame = frames[frames.length - 1];
      if (lastFrame) {
        setSimulationState({
          time: lastFrame.time,
          energy: { kinetic: 0, potential: 0, total: 0 },
        });
      }

      if (autoPlay && frames.length > 0) {
        setIsPlaying(true);
      }

    } catch (err) {
      // ── Zero-crash offline fallback: run client-side MechanicsSolver ──
      console.warn('[useSimulation] Backend unreachable, falling back to client-side solver:', err.message);
      try {
        const MechanicsSolver = (await import('../utils/solvers/mechanicsSolver.js')).default;
        const solver = new MechanicsSolver({
          gravity: request.gravity ? { x: request.gravity.x, y: -request.gravity.y, z: request.gravity.z } : liveSettings.gravity,
          timeStep: liveSettings.timeStep ?? 0.016,
          subSteps: Math.max(4, liveSettings.subSteps ?? 4),
          mode: 'accurate',
          groundY: 600
        });
        const allBodies = [...activeShapes, ...converted2DObjects.map(o => ({
          ...o, position: o.position, velocity: o.physics?.velocity ?? { x: 0, y: 0, z: 0 },
          mass: o.physics?.mass ?? 1, restitution: o.physics?.restitution ?? 0.5,
          friction: o.physics?.friction ?? 0.3, isStatic: o.physics?.isStatic ?? false
        }))];
        solver.setBodies(allBodies);
        solver.setConstraints(liveConstraints);
        const frames = [];
        const totalSteps = Math.ceil(duration / (liveSettings.timeStep ?? 0.016));
        for (let i = 0; i < totalSteps; i++) {
          const snap = solver.step();
          if (i % 3 === 0) {
            frames.push({ time: snap.time, states: snap.bodies.map(b => ({ id: b.id, position: b.position, linear_velocity: b.velocity })) });
          }
        }
        setSimulationFrames(frames);
        setCurrentFrameIndex(0);
        if (autoPlay && frames.length > 0) setIsPlaying(true);
        setSimError(null); // Clear error since fallback succeeded
      } catch (fallbackErr) {
        setSimError(`Backend offline & local fallback failed: ${fallbackErr.message}`);
        console.error('[useSimulation] Fallback error:', fallbackErr);
      }
    } finally {
      setIsSimulating(false);
    }
  }, [setSimulationFrames, setCurrentFrameIndex, setIsPlaying, setSimulationState,
      addEnergySnapshot, clearEnergyHistory]);

  return { runSimulation, isSimulating, simError };
}
