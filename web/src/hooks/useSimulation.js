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

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export function useSimulation() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simError, setSimError]         = useState(null);

  const shapes3D           = useStore(s => s.shapes3D);
  const constraints        = useStore(s => s.constraints);
  const simulationSettings = useStore(s => s.simulationSettings);
  const setSimulationFrames = useStore(s => s.setSimulationFrames);
  const setCurrentFrameIndex = useStore(s => s.setCurrentFrameIndex);
  const setIsPlaying       = useStore(s => s.setIsPlaying);
  const setSimulationState = useStore(s => s.setSimulationState);
  const addEnergySnapshot  = useStore(s => s.addEnergySnapshot);
  const clearEnergyHistory = useStore(s => s.clearEnergyHistory);

  const runSimulation = useCallback(async ({ duration = 3.0, autoPlay = true } = {}) => {
    const activeShapes = shapes3D.filter(s => s && s.id);
    if (activeShapes.length === 0) {
      setSimError('No objects in scene to simulate.');
      return;
    }

    setIsSimulating(true);
    setSimError(null);
    clearEnergyHistory();

    // Build the simulation request from store state
    const request = {
      gravity: {
        x: simulationSettings.gravity?.x ?? 0,
        y: -(simulationSettings.gravity?.y ?? 9.81),  // negate: store = downward positive, API = negative Y = down
        z: simulationSettings.gravity?.z ?? 0
      },
      time_step: simulationSettings.timeStep ?? 0.016,
      duration: duration,
      sub_steps: Math.max(4, simulationSettings.subSteps ?? 4),
      objects: activeShapes.map(shape => ({
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
          initial_velocity: { x: 0, y: 0, z: 0 },
          initial_angular_velocity: { x: 0, y: 0, z: 0 },
        }
      })),
      constraints: (constraints || []).map(con => ({
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
        const g = Math.abs(simulationSettings.gravity?.y ?? 9.81);
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
      setSimError(err.message);
      console.error('[useSimulation] Error:', err);
    } finally {
      setIsSimulating(false);
    }
  }, [shapes3D, constraints, simulationSettings, setSimulationFrames, setCurrentFrameIndex,
      setIsPlaying, setSimulationState, addEnergySnapshot, clearEnergyHistory]);

  return { runSimulation, isSimulating, simError };
}
