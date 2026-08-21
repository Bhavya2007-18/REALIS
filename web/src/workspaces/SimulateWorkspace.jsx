import React, { useState, useEffect, useRef } from 'react';
import { 
    Play, Square, SkipBack, SkipForward, Activity, Settings, Zap, Globe, Gauge, Trash2, Box, Flame, 
    Droplets, ArrowRightCircle, Download, Upload, RotateCcw, RotateCw, PlusCircle, MousePointer, 
    Circle as CircleIcon, Eye, EyeOff, Link2, Sliders, Layers, RefreshCw
} from 'lucide-react';
import useStore from '../store/useStore';
import Viewport3D from '../components/Viewport3D';
import FreeFallLab from '../components/FreeFallLab';
import ProjectileLab from '../components/ProjectileLab';
import PendulumLab from '../components/PendulumLab';
import DoublePendulumLab from '../components/DoublePendulumLab';
import SpringOscillatorLab from '../components/SpringOscillatorLab';
import OrbitalLab from '../components/OrbitalLab';
import InclinedRampLab from '../components/InclinedRampLab';
import CrankSliderLab from '../components/CrankSliderLab';
import MechanicsSolver from '../utils/solvers/mechanicsSolver';
import ThermalSolver from '../utils/solvers/thermalSolver';
import V6PhysicsSolver, { V6_CONFIG } from '../utils/solvers/v6PhysicsSolver';
import MechanicalAssemblySolver from '../utils/solvers/mechanicalAssemblySolver';
import V6RenderAdapter from '../utils/v6RenderAdapter';
import { SIM_UNITS, FIXED_STEP, clamp, isFiniteNumber, createSimulationLogger } from '../utils/simulationSafety';
import ModelControls from '../components/ModelControls';
import { stepWater } from '../utils/waterPhysics';
import { SimulationDemoManager, PRESET_CATALOG } from '../utils/SimulationDemoManager';

// Centralized routing map: simulation preset -> dedicated laboratory screen.
// Add new lab demos here; avoid scattering string comparisons elsewhere.
const LAB_SCREENS = {
    free_fall: FreeFallLab,
    projectile_motion: ProjectileLab,
    single_pendulum: PendulumLab,
    double_pendulum: DoublePendulumLab,
    spring_oscillator: SpringOscillatorLab,
    orbital_mechanics: OrbitalLab,
    inclined_friction_ramp: InclinedRampLab,
    revolute_crank_slider: CrankSliderLab,
    crank_slider: CrankSliderLab,
};

class LabErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("Lab Runtime Error caught by boundary:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-4 p-6 z-50">
                    <div className="text-xl font-bold tracking-widest text-rose-400 font-mono">LAB INITIALIZATION ERROR</div>
                    <div className="text-xs text-slate-400 font-mono max-w-lg text-center bg-black/60 p-4 rounded-xl border border-rose-500/20">
                        {this.state.error?.toString() || 'An error occurred while loading this simulation laboratory.'}
                    </div>
                    <button
                        onClick={() => {
                            this.setState({ hasError: false, error: null });
                            useStore.getState().resetPlayback();
                        }}
                        className="px-4 py-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold uppercase tracking-wider hover:bg-rose-500/30 transition-all cursor-pointer font-mono"
                    >
                        Reset & Reload Lab
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function SimulateWorkspace() {
    
    const objects = useStore(state => state.objects);
    const shapes3D = useStore(state => state.shapes3D);
    const setShapes3D = useStore(state => state.setShapes3D);
    const is3DView = useStore(state => state.is3DView);
    const activeWorkspace = useStore(state => state.activeWorkspace);
    const constraints = useStore(state => state.constraints);
    const materials = useStore(state => state.materials);
    const applyMaterial = useStore(state => state.applyMaterial);

    const simulationType = useStore(state => state.simulationType);
    const simulationMode = useStore(state => state.simulationMode);
    const simulationSettings = useStore(state => state.simulationSettings);
    const setSimulationSettings = useStore(state => state.setSimulationSettings);
    const simulationState = useStore(state => state.simulationState);
    const setSimulationState = useStore(state => state.setSimulationState);
    const analysisSettings = useStore(state => state.analysisSettings);
    const setAnalysisSettings = useStore(state => state.setAnalysisSettings);

    const isPlaying = useStore(state => state.isPlaying);
    const togglePlayback = useStore(state => state.togglePlayback);
    const resetPlayback = useStore(state => state.resetPlayback);

    const activeLayerId = useStore(state => state.activeLayerId);
    
    // Build Mode & Debug Physics & Persistence Hooks
    const activeBuildTool = useStore(state => state.activeBuildTool);
    const setActiveBuildTool = useStore(state => state.setActiveBuildTool);
    const jointWireSource = useStore(state => state.jointWireSource);
    const setJointWireSource = useStore(state => state.setJointWireSource);
    const debugPhysics = useStore(state => state.debugPhysics);
    const setDebugPhysics = useStore(state => state.setDebugPhysics);
    const toggleDebugPhysics = useStore(state => state.toggleDebugPhysics);
    const exportSceneJSON = useStore(state => state.exportSceneJSON);
    const importSceneJSON = useStore(state => state.importSceneJSON);
    const addShape3D = useStore(state => state.addShape3D);
    const addConstraint = useStore(state => state.addConstraint);
    const deleteObject = useStore(state => state.deleteObject);

    const [selectedObjectIds, setSelectedObjectIds] = useState([]);

    // AI Read Path Bridge (Section 3.4 & Stage 1 Exit Criteria)
    useEffect(() => {
        window.REALIS_AI_QUERY = () => {
            if (mechSolver.current) {
                return mechSolver.current.getLiveTelemetry();
            }
            return { error: 'Solver not initialized' };
        };
        return () => {
            delete window.REALIS_AI_QUERY;
        };
    }, []);
    
    
    const simulationPreset = useStore(state => state.simulationPreset);
    const ActiveLab = LAB_SCREENS[simulationPreset] || null;
    const isV6Active = simulationPreset === 'v6_engine_simulation';
    const isFreeFallActive = simulationPreset === 'free_fall';
    const isProjectileActive = simulationPreset === 'projectile_motion';
    const isPendulumActive = simulationPreset === 'single_pendulum';
    const isDoublePendulumActive = simulationPreset === 'double_pendulum';
    const isSpringOscillatorActive = simulationPreset === 'spring_oscillator';
    const isOrbitalActive = simulationPreset === 'orbital_mechanics';
    const isInclinedRampActive = simulationPreset === 'inclined_friction_ramp';
    const isLabActive = isFreeFallActive || isProjectileActive || isPendulumActive || isDoublePendulumActive || isSpringOscillatorActive || isOrbitalActive || isInclinedRampActive;
    const isMechanicalAssemblyPreset = simulationPreset === 'shaft_ring_assembly';
    const v6SolverRef = useRef(null);
    const v6RenderAdapterRef = useRef(new V6RenderAdapter());
    const v6LogRef = useRef(createSimulationLogger('SimulateWorkspace:V6', { throttleFrames: 30 }));
    const mechanicalSolverRef = useRef(new MechanicalAssemblySolver({ dt: 0.016, substeps: 4 }));
    const [v6EngineState, setV6EngineState] = useState(null);
    const [isMechanicalAssemblyActive, setIsMechanicalAssemblyActive] = useState(false);

    
    useEffect(() => {
        if (isV6Active) {
            // Ensure scene is hydrated (Sidebar may have already called loadDemo, but guard for direct preset changes)
            const store = useStore.getState();
            if (!store.shapes3D || store.shapes3D.length === 0) {
                SimulationDemoManager.loadDemo('v6_engine_simulation', store);
            }
            v6SolverRef.current = new V6PhysicsSolver({
                bore:            86,
                stroke:          86,
                crankRadius:     43,
                rodLength:       130,
                pistonMass:      0.45,
                crankInertia:    0.35,
                initialRPM:      800,
                combustionForce: 30000,
                frictionTorque:  20,
                loadTorque:      0,
                throttle:        1.0,
                vAngleDeg:       60,
            });
            setV6EngineState(v6SolverRef.current.getSnapshot());
            useStore.getState().setSimulationFrames([]);
            useStore.getState().setCurrentFrameIndex(0);
        } else {
            v6SolverRef.current = null;
            setV6EngineState(null);
        }
    }, [isV6Active]);

    useEffect(() => {
        const handleConfigChange = (event) => {
            const { type, key, value } = (event && event.detail) || {};
            if (type !== 'v6_engine' || !v6SolverRef.current) return;
            v6SolverRef.current.updateConfig({ [key]: value });
        };
        window.addEventListener('lab-config-change', handleConfigChange);
        return () => window.removeEventListener('lab-config-change', handleConfigChange);
    }, []);

    useEffect(() => {
        if (isV6Active || !isMechanicalAssemblyPreset) {
            setIsMechanicalAssemblyActive(false);
            return;
        }
        const initialized = mechanicalSolverRef.current.initialize(shapes3D);
        setIsMechanicalAssemblyActive(initialized);
    }, [isV6Active, isMechanicalAssemblyPreset, shapes3D]);

    
    const reqRef = useRef(null);
    const mechSolver = useRef(new MechanicsSolver(simulationSettings));
    const thermSolver = useRef(new ThermalSolver(simulationSettings));
    const accumulatorRef = useRef(0);
    const prevRigidSnapshotRef = useRef(null);

    
    const [renderBodies, setRenderBodies] = useState([...shapes3D, ...objects]);
    const [vectors, setVectors] = useState([]);
    const [colorMap, setColorMap] = useState({});

    
    useEffect(() => {
        if (!isPlaying) {
            const allBodies = [...shapes3D, ...objects];
            mechSolver.current.setBodies(allBodies);
            mechSolver.current.setConstraints(constraints);
            thermSolver.current.setBodies(allBodies);
            setRenderBodies(allBodies);
        }
    }, [objects, shapes3D, constraints, isPlaying]);

    
    useEffect(() => {
        const groundY = simulationSettings.groundY;
        mechSolver.current.updateSettings({ ...simulationSettings, groundY, mode: simulationMode, water: useStore.getState().water });
        thermSolver.current.updateSettings(simulationSettings);
    }, [simulationSettings, simulationMode]);
    
    
    
    const prevCounts = useRef({ o: objects.length, s: shapes3D.length });
    useEffect(() => {
        const changed = prevCounts.current.o !== objects.length || prevCounts.current.s !== shapes3D.length;
        if (changed) {
            prevCounts.current = { o: objects.length, s: shapes3D.length };
            const allBodies = [...shapes3D, ...objects];
            mechSolver.current.setBodies(allBodies);
            thermSolver.current.setBodies(allBodies);
            setRenderBodies(allBodies);
        }
    }, [objects, shapes3D]);
    
    
    useEffect(() => {
        if (activeWorkspace === 'simulate') {
            const allBodies = [...shapes3D, ...objects];
            mechSolver.current.setBodies(allBodies);
            thermSolver.current.setBodies(allBodies);
            setRenderBodies(allBodies);
            useStore.getState().setSimulationState({ time: 0 });
        }
    }, [activeWorkspace]);

    
    const renderBodiesRef = useRef(renderBodies);
    useEffect(() => {
        renderBodiesRef.current = renderBodies;
    }, [renderBodies]);

    const lastTelemetryTimeRef = useRef(0);

    useEffect(() => {
        if (!isPlaying || isLabActive) {
            cancelAnimationFrame(reqRef.current);
            accumulatorRef.current = 0;
            return;
        }

        let lastTime = performance.now();
        lastTelemetryTimeRef.current = performance.now();

        const loop = (time) => {
            const elapsed = (time - lastTime) / 1000;
            lastTime = time;
            if (!isFiniteNumber(elapsed)) {
                v6LogRef.current.log(Math.floor(time), 'invalid_dt', { elapsed, source: 'mainLoop' }, 'error');
                reqRef.current = requestAnimationFrame(loop);
                return;
            }

            // Fixed-step accumulator (Gaffer on Games / R3F-Rapier pattern).
            const clampedDelta = Math.min(Math.max(elapsed, 0), FIXED_STEP.MAX_FRAME_DT);
            accumulatorRef.current += clampedDelta;
            const fixedDt = mechSolver.current.settings?.timeStep ?? SIM_UNITS.TARGET_FRAME_DT;

            const shouldUpdateTelemetry = (time - lastTelemetryTimeRef.current) >= 45; // ~22 FPS for UI telemetry

            if (isV6Active && v6SolverRef.current) {
                const snap = v6SolverRef.current.tick(clampedDelta);
                if (shouldUpdateTelemetry) {
                    lastTelemetryTimeRef.current = time;
                    setV6EngineState(snap);
                    setSimulationState({ time: snap.time, energy: { kinetic: snap.powerOutputkW || 0, potential: 0, total: snap.powerOutputkW || 0 } });
                    useStore.getState().setLabData({
                        title: 'V6 Engine',
                        type: 'v6_engine',
                        snapshot: snap,
                        config: v6SolverRef.current.config
                    });
                }
                // Compute transforms and apply to BOTH shapes3D (store) and renderBodies (Viewport3D source)
                const currentShapes = useStore.getState().shapes3D;
                v6RenderAdapterRef.current.snapshotToTransforms(snap, currentShapes, clampedDelta, v6SolverRef.current.config);
                const alpha = clamp(snap.interpolationAlpha ?? 0, 0, 1);
                const interpolated = v6RenderAdapterRef.current.getInterpolatedTransforms(alpha);
                const updatedShapes = v6RenderAdapterRef.current.apply(currentShapes, interpolated);
                setShapes3D(updatedShapes);
                setRenderBodies(updatedShapes);

            } else if (isMechanicalAssemblyActive && mechanicalSolverRef.current) {
                const { states, time: simTime } = mechanicalSolverRef.current.tick(clampedDelta);
                if (states && states.size > 0) {
                    setShapes3D(prev => mechanicalSolverRef.current.applyToShapes(prev, states));
                }
                if (shouldUpdateTelemetry) {
                    lastTelemetryTimeRef.current = time;
                    setSimulationState({
                        time: simTime || 0,
                        energy: { kinetic: 0, potential: 0, total: 0 }
                    });
                }

            } else if (simulationType === 'rigid') {
                const prevSnapshot = mechSolver.current.getSnapshot();
                prevRigidSnapshotRef.current = prevSnapshot;

                let steps = 0;
                while (accumulatorRef.current >= fixedDt && steps < FIXED_STEP.MAX_STEPS_PER_FRAME) {
                    stepWater(fixedDt);
                    mechSolver.current.step();
                    accumulatorRef.current -= fixedDt;
                    steps++;
                }

                const snapshot = mechSolver.current.getSnapshot();
                const alpha = clamp(accumulatorRef.current / fixedDt, 0, 1);
                const prev = prevRigidSnapshotRef.current;

                const currentBodies = renderBodiesRef.current;
                const newRenderBodies = currentBodies.map(rb => {
                    const sb = snapshot.bodies.find(b => b.id === rb.id);
                    if (!sb) return rb;
                    const toPos = Array.isArray(sb.position)
                        ? sb.position
                        : [sb.position.x || 0, sb.position.y || 0, sb.position.z || 0];
                    let pos = toPos;
                    if (prev && steps > 0 && alpha > 0 && alpha < 1) {
                        const pb = prev.bodies.find(b => b.id === rb.id);
                        if (pb) {
                            const fromPos = Array.isArray(pb.position)
                                ? pb.position
                                : [pb.position.x || 0, pb.position.y || 0, pb.position.z || 0];
                            pos = [
                                fromPos[0] + (toPos[0] - fromPos[0]) * alpha,
                                fromPos[1] + (toPos[1] - fromPos[1]) * alpha,
                                fromPos[2] + (toPos[2] - fromPos[2]) * alpha,
                            ];
                        }
                    }
                    const rot = Array.isArray(sb.rotation)
                        ? sb.rotation
                        : [sb.rotation?.x || 0, sb.rotation?.y || 0, sb.rotation?.z || 0];
                    return { ...rb, position: pos, rotation: rot };
                });

                renderBodiesRef.current = newRenderBodies;
                setRenderBodies(newRenderBodies);

                if (shouldUpdateTelemetry) {
                    lastTelemetryTimeRef.current = time;
                    setVectors(snapshot.vectors || []);
                    setSimulationState({ time: snapshot.time, energy: snapshot.energy });
                }

            } else if (simulationType === 'thermal') {
                let steps = 0;
                while (accumulatorRef.current >= fixedDt && steps < FIXED_STEP.MAX_STEPS_PER_FRAME) {
                    thermSolver.current.step();
                    accumulatorRef.current -= fixedDt;
                    steps++;
                }
                const snapshot = thermSolver.current.getSnapshot();
                if (shouldUpdateTelemetry) {
                    lastTelemetryTimeRef.current = time;
                    setColorMap(snapshot.colorMap || {});
                    setSimulationState({ time: snapshot.time, energy: snapshot.energy });
                }
            }

            reqRef.current = requestAnimationFrame(loop);
        };

        reqRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(reqRef.current);
    }, [isPlaying, simulationType, isV6Active, isMechanicalAssemblyActive, isLabActive, setShapes3D, setSimulationState, setRenderBodies]);

    
    useEffect(() => {
        if (!isPlaying && simulationState.time === 0) {
            mechSolver.current.reset();
            thermSolver.current.reset();
            if (isV6Active && v6SolverRef.current) {
                v6SolverRef.current.reset();
                setV6EngineState(v6SolverRef.current.getSnapshot());
            }
            setRenderBodies([...shapes3D, ...objects]);
            setVectors([]);
            setColorMap({});
        }
    }, [isPlaying, simulationState.time, shapes3D, objects, isV6Active]);

    
    const updateSetting = (key, val) => setSimulationSettings({ [key]: val });
    const updateGravity = (axis, val) => setSimulationSettings({ gravity: { ...simulationSettings.gravity, [axis]: parseFloat(val) } });

    
    const finalViewportObjects = renderBodies.map((b, index) => {
        let matArgs = {};
        if (simulationType === 'thermal' && analysisSettings.showHeatmap && colorMap[b.id]) {
            matArgs = { fill: colorMap[b.id], color: colorMap[b.id] };
        }
        
        
        let renderState = { ...b };
        if (analysisSettings.isExplodedView) {
            
            
            const offsetMultiplier = 20;
            const dirX = (index % 3) - 1; 
            const dirY = Math.floor(index / 3) % 2 === 0 ? 1 : -1;
            
            if (renderState.x !== undefined) renderState.x += dirX * offsetMultiplier;
            if (renderState.cx !== undefined) renderState.cx += dirX * offsetMultiplier;
            if (renderState.y !== undefined) renderState.y += dirY * offsetMultiplier;
            if (renderState.cy !== undefined) renderState.cy += dirY * offsetMultiplier;
        }

        return { ...renderState, ...matArgs };
    });

    return (
        <div className="flex flex-col h-full bg-[#0a0f1a] relative overflow-hidden font-sans">
            
            {}
            <div className="absolute top-0 left-0 right-0 h-14 bg-slate-950/80 backdrop-blur-md border-b border-white/10 z-30 flex items-center justify-between px-6">
                
                {}
                {/* Presets & Controls Header Toolbar */}
                <div className="flex bg-black/40 p-1 rounded-xl shadow-inner border border-white/5 items-center gap-1">
                    {[{ id: 'rigid', icon: <Box size={14}/>, label: 'Mechanical' },
                      { id: 'thermal', icon: <Flame size={14}/>, label: 'Thermal' },
                      { id: 'fluid', icon: <Droplets size={14}/>, label: 'Fluid (Beta)' }].map(type => (
                        <button
                            key={type.id}
                            onClick={() => useStore.setState({ simulationType: type.id })}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${simulationType === type.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                        >
                            {type.icon} {type.label}
                        </button>
                    ))}

                    <div className="h-4 w-px bg-white/10 mx-1"></div>

                    {/* Presets Dropdown */}
                    <select
                        onChange={(e) => {
                            if (e.target.value) {
                                SimulationDemoManager.loadDemo(e.target.value, useStore.getState());
                            }
                        }}
                        defaultValue=""
                        className="bg-black/60 border border-white/10 text-white text-[10px] font-mono font-bold rounded-lg px-2 py-1 outline-none cursor-pointer hover:border-primary/50 transition-colors"
                    >
                        <option value="" disabled>Load Preset (12 Stage 1 Scenarios)...</option>
                        {PRESET_CATALOG.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                {/* Center / Right Control Cluster */}
                <div className="flex items-center gap-3">
                    {/* Undo / Redo */}
                    <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5">
                        <button 
                            onClick={() => useStore.temporal?.getState()?.undo()}
                            className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer rounded hover:bg-white/10"
                            title="Undo (Ctrl+Z)"
                        >
                            <RotateCcw size={12} />
                        </button>
                        <button 
                            onClick={() => useStore.temporal?.getState()?.redo()}
                            className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer rounded hover:bg-white/10"
                            title="Redo (Ctrl+Shift+Z)"
                        >
                            <RotateCw size={12} />
                        </button>
                    </div>

                    {/* Save / Load Scene JSON */}
                    <div className="flex gap-1">
                        <button
                            onClick={() => {
                                const json = exportSceneJSON();
                                const blob = new Blob([json], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `realis_scene_${Date.now()}.json`;
                                a.click();
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-black/40 border border-white/10 text-slate-300 hover:text-white hover:border-primary/50 transition-all cursor-pointer"
                            title="Export Scene JSON"
                        >
                            <Download size={12} /> Save JSON
                        </button>

                        <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-black/40 border border-white/10 text-slate-300 hover:text-white hover:border-primary/50 transition-all cursor-pointer">
                            <Upload size={12} /> Load JSON
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (evt) => importSceneJSON(evt.target.result);
                                        reader.readAsText(file);
                                    }
                                }}
                            />
                        </label>
                    </div>

                    <div className="h-6 w-px bg-white/10 mx-1"></div>

                    {/* Debug Physics Toggle */}
                    <button
                        onClick={toggleDebugPhysics}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all cursor-pointer ${
                            debugPhysics.enabled
                                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                : 'border-white/10 text-slate-400 hover:bg-white/5'
                        }`}
                    >
                        {debugPhysics.enabled ? <Eye size={12} /> : <EyeOff size={12} />} Debug Physics
                    </button>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Solver</span>
                        <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5">
                            <button onClick={() => useStore.setState({ simulationMode: 'preview' })} className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer ${simulationMode === 'preview' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-600 hover:text-white'}`}>Preview</button>
                            <button onClick={() => useStore.setState({ simulationMode: 'accurate' })} className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer ${simulationMode === 'accurate' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-600 hover:text-white'}`}>Accurate</button>
                        </div>
                    </div>
                </div>
            </div>

            {}
            <div className="flex-1 relative pt-14">
                {ActiveLab ? (
                    <LabErrorBoundary key={simulationPreset}>
                        <ActiveLab />
                    </LabErrorBoundary>
                ) : simulationPreset && renderBodies.length === 0 && !is3DView ? (
                    <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-4">
                        <div className="text-2xl font-bold tracking-widest text-red-400/80">SIMULATION UNAVAILABLE</div>
                        <div className="text-xs text-slate-500 font-mono max-w-md text-center">
                            No renderer exists for simulation preset "{simulationPreset}". Return to the design workspace to load a valid scene or preset.
                        </div>
                        <button
                            onClick={() => useStore.getState().setActiveWorkspace('design')}
                            className="px-4 py-2 rounded-lg bg-primary/20 border border-primary/40 text-primary text-xs font-bold uppercase tracking-wider hover:bg-primary/30 transition-all cursor-pointer"
                        >
                            Return to Design
                        </button>
                    </div>
                ) : is3DView ? (
                    <Viewport3D objects={finalViewportObjects} renderBodies={renderBodies} isSimulating={isPlaying} />
                ) : (
                    <div className="absolute inset-0 bg-slate-950/80">
                        <svg className="absolute inset-0 w-full h-full z-10">
                            {renderBodies.map(b => {
                                let px = b.cx ?? b.x ?? 0;
                                let py = b.cy ?? b.y ?? 0;

                                if (b.position) {
                                    if (Array.isArray(b.position)) {
                                        px = b.position[0];
                                        py = b.position[1] ?? py;
                                    } else {
                                        px = b.position.x ?? px;
                                        py = b.position.y ?? py;
                                    }
                                }

                                let rotDeg = 0;
                                if (b.rotation) {
                                    if (typeof b.rotation === 'number') rotDeg = b.rotation;
                                    else if (Array.isArray(b.rotation)) rotDeg = -b.rotation[1] * 180 / Math.PI;
                                    else if (b.rotation.y !== undefined) rotDeg = -b.rotation.y * 180 / Math.PI;
                                }

                                if (b.type === 'rect' || (b.width && b.height)) {
                                    const w = b.width || b.dimensions?.x || 20;
                                    const h = b.height || b.dimensions?.z || 20;
                                    const rectX = px - w / 2;
                                    const rectY = py - h / 2;
                                    return (
                                        <rect
                                            key={b.id}
                                            x={rectX}
                                            y={rectY}
                                            width={w}
                                            height={h}
                                            fill={b.fill || 'rgba(59,130,246,0.2)'}
                                            stroke={b.stroke || '#3b82f6'}
                                            strokeWidth={b.strokeWidth || 2}
                                            transform={rotDeg ? `rotate(${rotDeg}, ${px}, ${py})` : undefined}
                                        />
                                    );
                                }

                                if (b.type === 'circle' || b.r || b.radius) {
                                    const r = b.r || b.radius || (b.dimensions?.x ? b.dimensions.x / 2 : 20);
                                    return (
                                        <circle
                                            key={b.id}
                                            cx={px}
                                            cy={py}
                                            r={r}
                                            fill={b.fill || 'rgba(139,92,246,0.2)'}
                                            stroke={b.stroke || '#8b5cf6'}
                                            strokeWidth={b.strokeWidth || 2}
                                        />
                                    );
                                }

                                if (b.type === 'polygon' && b.sides) {
                                    const r = b.r || b.radius || 20;
                                    const pts = [];
                                    for (let i = 0; i < b.sides; i++) {
                                        const angle = (Math.PI * 2 * i) / b.sides - Math.PI / 2 + (rotDeg * Math.PI / 180);
                                        pts.push(`${px + r * Math.cos(angle)},${py + r * Math.sin(angle)}`);
                                    }
                                    return (
                                        <polygon
                                            key={b.id}
                                            points={pts.join(' ')}
                                            fill={b.fill || 'rgba(236,72,153,0.2)'}
                                            stroke={b.stroke || '#ec4899'}
                                            strokeWidth={b.strokeWidth || 2}
                                        />
                                    );
                                }

                                if (b.type === 'path' && b.points) {
                                    const initialX = b._initialPosition?.x ?? (b.points[0]?.x || 0);
                                    const initialY = b._initialPosition?.z ?? b._initialPosition?.y ?? (b.points[0]?.y || 0);
                                    const dx = px - initialX;
                                    const dy = py - initialY;
                                    const d = b.points.reduce((acc, p, i) => acc + (i === 0 ? `M ${p.x + dx} ${p.y + dy} ` : `L ${p.x + dx} ${p.y + dy} `), '');
                                    return (
                                        <path
                                            key={b.id}
                                            d={d}
                                            fill={b.fill || 'none'}
                                            stroke={b.stroke || '#10b981'}
                                            strokeWidth={b.strokeWidth || 2}
                                        />
                                    );
                                }

                                const r = b.radius || (b.dimensions?.x ? b.dimensions.x / 2 : 15);
                                return (
                                    <circle
                                        key={`shape3d_${b.id}`}
                                        cx={px}
                                        cy={py}
                                        r={r}
                                        fill={b.color || '#3b82f6'}
                                        stroke="#ffffff"
                                        strokeWidth={1.5}
                                        opacity="0.85"
                                    />
                                );
                            })}
                        </svg>
                    </div>
                )}

                {/* ── Build Mode Floating Toolbar (LEGO Construction) ─────────────────────────── */}
                <div className="absolute top-20 left-6 z-20 flex flex-col gap-1 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-2xl">
                    <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest text-center mb-0.5">BUILD</span>

                    <button
                        onClick={() => { setActiveBuildTool('select'); setJointWireSource(null); }}
                        className={`p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                            activeBuildTool === 'select' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                        title="Select Tool"
                    >
                        <MousePointer size={14} />
                    </button>

                    <button
                        onClick={() => {
                            addShape3D({
                                type: 'sphere',
                                position: [0, 50, 0],
                                params: { radius: 10 },
                                color: '#3b82f6',
                                mass: 1.0,
                                restitution: 0.5,
                                friction: 0.3
                            });
                        }}
                        className="p-2 rounded-lg flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                        title="Create Circle / Sphere Body"
                    >
                        <CircleIcon size={14} className="text-blue-400" />
                    </button>

                    <button
                        onClick={() => {
                            addShape3D({
                                type: 'rect',
                                position: [0, 50, 0],
                                params: { width: 30, height: 30, depth: 30 },
                                color: '#10b981',
                                mass: 2.0,
                                restitution: 0.3,
                                friction: 0.4
                            });
                        }}
                        className="p-2 rounded-lg flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                        title="Create Box Body"
                    >
                        <Box size={14} className="text-emerald-400" />
                    </button>

                    <button
                        onClick={() => {
                            addShape3D({
                                type: 'rect',
                                position: [0, 120, 0],
                                params: { width: 160, height: 12, depth: 30 },
                                rotation: -20,
                                isStatic: true,
                                color: '#64748b',
                                friction: 0.4
                            });
                        }}
                        className="p-2 rounded-lg flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                        title="Create Static Ramp"
                    >
                        <Layers size={14} className="text-slate-400" />
                    </button>

                    <button
                        onClick={() => {
                            setActiveBuildTool(activeBuildTool === 'wire_joint' ? 'select' : 'wire_joint');
                            setJointWireSource(null);
                        }}
                        className={`p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                            activeBuildTool === 'wire_joint'
                                ? 'bg-purple-600 text-white shadow-lg animate-pulse'
                                : 'text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                        title="Wire Joint (Click Body 1 then Body 2)"
                    >
                        <Link2 size={14} className="text-purple-400" />
                    </button>
                    {activeBuildTool === 'wire_joint' && (
                        <div className="text-[8px] font-mono text-purple-300 px-1 py-0.5 text-center">
                            {jointWireSource ? 'Click Target B' : 'Click Body A'}
                        </div>
                    )}
                </div>

                {/* ── Debug Physics Mode Overlay ─────────────────────────────────────────────────── */}
                {(debugPhysics.enabled || analysisSettings.showVectors || analysisSettings.showJoints || analysisSettings.showAnchors) && simulationType === 'rigid' && (
                    <svg className="absolute inset-0 pointer-events-none w-full h-full z-10">
                        <defs>
                            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#fbbf24" />
                            </marker>
                            <marker id="normalarrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
                            </marker>
                        </defs>
                        
                        {/* Constraints Overlay */}
                        {constraints.map((c, i) => {
                            const allBodies = [...(renderBodies || []), ...(objects || []), ...(shapes3D || [])];
                            const bA = allBodies.find(o => String(o.id) === String(c.targetA));
                            const bB = allBodies.find(o => String(o.id) === String(c.targetB));

                            const extract2DPos = (obj) => {
                                if (!obj) return null;
                                let x = obj.cx ?? obj.x ?? 0;
                                let y = obj.cy ?? obj.y ?? 0;
                                if (obj.position) {
                                    if (Array.isArray(obj.position)) {
                                        x = obj.position[0];
                                        y = obj.position[1] ?? y;
                                    } else {
                                        x = obj.position.x ?? x;
                                        y = obj.position.y ?? y;
                                    }
                                }
                                return { x: Number(x) || 0, y: Number(y) || 0 };
                            };

                            let pA = extract2DPos(bA);
                            let pB = extract2DPos(bB);

                            if (pA && c.anchorA) { pA.x += Number(c.anchorA.x || 0); pA.y += Number(c.anchorA.y || 0); }
                            if (pB && c.anchorB) { pB.x += Number(c.anchorB.x || 0); pB.y += Number(c.anchorB.y || 0); }

                            return (
                                <g key={`constraint-${c.id || i}`}>
                                    {pA && pB && (
                                        <line x1={pA.x} y1={pA.y} x2={pB.x} y2={pB.y} stroke="#a855f7" strokeWidth="2" strokeDasharray="4 4" opacity="0.8" />
                                    )}
                                    {pA && (
                                        <circle cx={pA.x} cy={pA.y} r="5" fill="#ec4899" stroke="#fff" strokeWidth="1.5" opacity="0.9" />
                                    )}
                                    {pB && (
                                        <circle cx={pB.x} cy={pB.y} r="5" fill="#ec4899" stroke="#fff" strokeWidth="1.5" opacity="0.9" />
                                    )}
                                </g>
                            );
                        })}

                        {/* Debug Physics Specific Overlays (Bounding Boxes, Contact Points, Normals, Sleeping) */}
                        {debugPhysics.enabled && renderBodies.map(b => {
                            const px = b.position?.x ?? b.cx ?? b.x ?? 0;
                            const py = b.position?.y ?? b.cy ?? b.y ?? 0;
                            const r = b.radius ?? b.r ?? 15;
                            const w = b.width ?? b.dimensions?.x ?? (r * 2);
                            const h = b.height ?? b.dimensions?.y ?? (r * 2);

                            return (
                                <g key={`debug_body_${b.id}`}>
                                    {/* Bounding Box */}
                                    <rect x={px - w/2} y={py - h/2} width={w} height={h} fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="2 2" opacity="0.7" />
                                    {/* Center of Mass Crosshair */}
                                    <line x1={px - 6} y1={py} x2={px + 6} y2={py} stroke="#ef4444" strokeWidth="1.5" />
                                    <line x1={px} y1={py - 6} x2={px} y2={py + 6} stroke="#ef4444" strokeWidth="1.5" />
                                    {/* Sleeping Badge */}
                                    {b.sleeping && (
                                        <text x={px} y={py - h/2 - 4} fill="#94a3b8" fontSize="9" textAnchor="middle" fontWeight="bold">zzz</text>
                                    )}
                                </g>
                            );
                        })}

                        {/* Velocity Vectors Overlay */}
                        {analysisSettings.showVectors && vectors.map((v, i) => {
                            const originX = v.origin.x;
                            const originY = v.origin.y;
                            const length = Math.min(100, v.magnitude * (analysisSettings.vectorScale || 1));
                            const dirX = v.velocity.x || v.gravityForce.x || 0;
                            const dirY = v.velocity.y || v.gravityForce.y || 0;
                            const lenOrig = Math.sqrt(dirX*dirX + dirY*dirY) || 1;

                            return length > 1 ? (
                                <line
                                    key={`vector-${i}`}
                                    x1={originX} y1={originY}
                                    x2={originX + (dirX/lenOrig)*length}
                                    y2={originY + (dirY/lenOrig)*length}
                                    stroke="#fbbf24" strokeWidth="2"
                                    markerEnd="url(#arrowhead)"
                                    opacity="0.8"
                                />
                            ) : null;
                        })}
                    </svg>
                )}

                {/* ── Mechanical Analytics Card ──────────────────────────────────────────────────── */}
                <div className="absolute top-20 left-20 z-20 w-56 space-y-4 pointer-events-none">
                    {simulationType === 'rigid' && (
                        <div className="glass-panel p-3.5 rounded-xl shadow-2xl animate-in slide-in-from-left-4 duration-500">
                            <div className="flex items-center gap-2 mb-2">
                                <Activity size={14} className="text-emerald-400" />
                                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Telemetry & Energy</span>
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <div className="flex justify-between text-[9px] text-slate-500 font-mono mb-1">
                                        <span>KINETIC</span>
                                        <span className="text-emerald-400">{simulationState.energy.kinetic.toFixed(1)} J</span>
                                    </div>
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${Math.min(100, simulationState.energy.kinetic / 100)}%` }}/>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-[9px] text-slate-500 font-mono mb-1">
                                        <span>POTENTIAL</span>
                                        <span className="text-blue-400">{simulationState.energy.potential.toFixed(1)} J</span>
                                    </div>
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-400 transition-all duration-300" style={{ width: `${Math.min(100, simulationState.energy.potential / 100)}%` }}/>
                                    </div>
                                </div>
                                <div className="pt-1.5 border-t border-white/10 flex justify-between text-[10px] font-mono font-bold">
                                    <span className="text-slate-400">TOTAL ENERGY</span>
                                    <span className="text-amber-400">{simulationState.energy.total.toFixed(1)} J</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Timeline & Engine Inspector Control Bar ────────────────────────────────────────── */}
            {/* Hidden inside dedicated labs so the physics canvas gets their full viewport height. */}
            {!isLabActive && (
            <div className="h-16 bg-slate-950/90 border-t border-white/10 backdrop-blur-3xl px-6 flex items-center gap-8 z-30 shrink-0">
                {/* Playback Controls */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => { resetPlayback(); useStore.setState({ simulationState: { ...simulationState, time: 0 }}) }} 
                        className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer bg-white/5 hover:bg-white/10 rounded-lg"
                        title="Reset Simulation"
                    >
                        <RefreshCw size={14} />
                    </button>

                    <button 
                        onClick={togglePlayback} 
                        className="h-9 px-5 bg-primary hover:bg-blue-500 text-white rounded-xl shadow-[0_0_15px_rgba(37,106,244,0.4)] flex items-center justify-center transition-all cursor-pointer font-bold tracking-wider uppercase text-[10px]"
                    >
                        {isPlaying ? <><Square size={12} fill="currentColor" className="mr-1.5"/> PAUSE</> : <><Play size={14} fill="currentColor" className="mr-1.5"/> RUN</>}
                    </button>

                    <button 
                        onClick={() => {
                            if (!isPlaying && mechSolver.current) {
                                mechSolver.current.step();
                                setSimulationState({ time: mechSolver.current.time, energy: mechSolver.current.getSnapshot().energy });
                            }
                        }}
                        className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer bg-white/5 hover:bg-white/10 rounded-lg"
                        title="Single Step Forward"
                    >
                        <SkipForward size={14} />
                    </button>
                </div>

                {/* Time-Scale Speed Slider */}
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                    <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">Speed</span>
                    <input
                        type="range" min="0.1" max="5.0" step="0.1"
                        value={simulationSettings.timeScale || 1.0}
                        onChange={(e) => updateSetting('timeScale', parseFloat(e.target.value))}
                        className="w-20 h-1 bg-white/10 rounded-full accent-primary outline-none cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-primary font-bold">{simulationSettings.timeScale || 1.0}x</span>
                </div>

                {/* Progress Bar & Telemetry */}
                <div className="flex-1 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                            Elapsed Time: {simulationState.time.toFixed(3)} s
                        </span>
                        <div className="flex items-center gap-2">
                            <div className={`size-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></div>
                            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">
                                {isPlaying ? 'SIMULATING' : 'PAUSED'}
                            </span>
                        </div>
                    </div>
                    <div className="relative w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
                        <div className="absolute top-0 left-0 h-full bg-primary transition-all duration-75" style={{ width: `${(simulationState.time % 10) / 10 * 100}%` }}></div>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
}