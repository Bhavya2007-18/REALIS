import { useEffect, useRef, useCallback, useState } from 'react';
import { useSimulationState, type SimSnapshot } from './simulationState';
import useStore from '../store/useStore';

export interface LabSolver {
  step(dt: number): any;
  reset(): void;
  getSnapshot(): any;
  updateConfig?(config: any): void;
}

export interface LabSimulationOptions {
  solver: LabSolver;
  labType: string;
  labTitle: string;
  config: Record<string, any>;
  onSnapshot?: (snapshot: any) => void;
}

export function useLabSimulation(options: LabSimulationOptions) {
  const { solver, labType, labTitle, config, onSnapshot } = options;
  const isPlaying = useStore(state => state.isPlaying);
  const togglePlayback = useStore(state => state.togglePlayback);
  const resetPlayback = useStore(state => state.resetPlayback);
  const setLabData = useStore(state => state.setLabData);
  const clearLabData = useStore(state => state.clearLabData);

  const solverRef = useRef(solver);
  const reqRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  const [snapshot, setSnapshot] = useState(() => solverRef.current.getSnapshot());

  // Sync solver config when it changes
  useEffect(() => {
    if (solverRef.current.updateConfig) {
      solverRef.current.updateConfig(config);
    }
  }, [JSON.stringify(config)]);

  // Push lab data to store for Properties panel
  useEffect(() => {
    setLabData({
      type: labType,
      title: labTitle,
      snapshot,
      config,
    });
    return () => clearLabData();
  }, [snapshot, config, labType, labTitle]);

  // Main simulation loop
  useEffect(() => {
    if (!isPlaying) {
      if (reqRef.current !== null) cancelAnimationFrame(reqRef.current);
      return;
    }

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const elapsed = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      const nextSnap = solverRef.current.step(elapsed);
      setSnapshot({ ...nextSnap });
      onSnapshot?.(nextSnap);

      reqRef.current = requestAnimationFrame(loop);
    };

    reqRef.current = requestAnimationFrame(loop);
    return () => {
      if (reqRef.current !== null) cancelAnimationFrame(reqRef.current);
    };
  }, [isPlaying, onSnapshot]);

  // Listen for config changes from Properties panel
  useEffect(() => {
    const handler = (event: CustomEvent) => {
      const { type, key, value } = event.detail;
      if (type !== labType) return;
      // Dispatch to parent component via event
      window.dispatchEvent(new CustomEvent('lab-local-config', { detail: { key, value } }));
    };
    window.addEventListener('lab-config-change', handler as EventListener);
    return () => window.removeEventListener('lab-config-change', handler as EventListener);
  }, [labType]);

  const handleReset = useCallback(() => {
    resetPlayback();
    solverRef.current.reset();
    setSnapshot(solverRef.current.getSnapshot());
  }, [resetPlayback]);

  const handleStepForward = useCallback((dt?: number) => {
    if (!isPlaying) {
      const nextSnap = solverRef.current.step(dt ?? 0.016);
      setSnapshot({ ...nextSnap });
      onSnapshot?.(nextSnap);
    }
  }, [isPlaying, onSnapshot]);

  return {
    snapshot,
    isPlaying,
    togglePlayback,
    resetPlayback: handleReset,
    handleStepForward,
    setLabData,
    clearLabData,
    solver: solverRef,
  };
}
