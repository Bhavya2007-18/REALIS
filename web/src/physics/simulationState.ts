import { create } from 'zustand';
import type { PhysicsBody, PhysicsJoint, PhysicsWorldState, PhysicsDiagnostics } from './PhysicsWorld';

export interface SimSnapshot {
  time: number;
  stepCount: number;
  bodies: Array<{
    id: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
    linearVelocity: { x: number; y: number; z: number };
    angularVelocity: { x: number; y: number; z: number };
    sleeping: boolean;
  }>;
  joints: Array<{
    id: string;
    type: string;
    bodyA: string;
    bodyB: string | null;
  }>;
  contacts: Array<{
    bodyAId: string;
    bodyBId: string;
    point: { x: number; y: number; z: number };
    normal: { x: number; y: number; z: number };
    penetration: number;
  }>;
}

interface SimulationState {
  running: boolean;
  paused: boolean;
  time: number;
  stepCount: number;
  timeScale: number;
  snapshot: SimSnapshot | null;
  worldState: PhysicsWorldState | null;
  diagnostics: PhysicsDiagnostics | null;

  setRunning: (running: boolean) => void;
  setPaused: (paused: boolean) => void;
  setTime: (time: number) => void;
  setStepCount: (count: number) => void;
  setTimeScale: (scale: number) => void;
  setSnapshot: (snapshot: SimSnapshot | null) => void;
  setWorldState: (state: PhysicsWorldState | null) => void;
  setDiagnostics: (diag: PhysicsDiagnostics | null) => void;
  reset: () => void;
}

const initialState = {
  running: false,
  paused: false,
  time: 0,
  stepCount: 0,
  timeScale: 1,
  snapshot: null,
  worldState: null,
  diagnostics: null,
};

export const useSimulationState = create<SimulationState>((set) => ({
  ...initialState,
  setRunning: (running) => set({ running }),
  setPaused: (paused) => set({ paused }),
  setTime: (time) => set({ time }),
  setStepCount: (stepCount) => set({ stepCount }),
  setTimeScale: (timeScale) => set({ timeScale }),
  setSnapshot: (snapshot) => set({ snapshot }),
  setWorldState: (worldState) => set({ worldState }),
  setDiagnostics: (diagnostics) => set({ diagnostics }),
  reset: () => set(initialState),
}));

export function updateSimFromWorld(
  worldState: PhysicsWorldState,
  bodies: Array<{
    id: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
    linearVelocity: { x: number; y: number; z: number };
    angularVelocity: { x: number; y: number; z: number };
    sleeping: boolean;
  }>,
  contacts: Array<{
    bodyAId: string;
    bodyBId: string;
    point: { x: number; y: number; z: number };
    normal: { x: number; y: number; z: number };
    penetration: number;
  }>,
  joints: Array<{
    id: string;
    type: string;
    bodyA: string;
    bodyB: string | null;
  }>
): void {
  const snapshot: SimSnapshot = {
    time: worldState.time,
    stepCount: worldState.stepCount,
    bodies,
    joints,
    contacts,
  };
  useSimulationState.getState().setWorldState(worldState);
  useSimulationState.getState().setSnapshot(snapshot);
  useSimulationState.getState().setTime(worldState.time);
  useSimulationState.getState().setStepCount(worldState.stepCount);
}
