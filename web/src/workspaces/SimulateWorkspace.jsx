import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, SkipBack, SkipForward, Activity, Settings, Zap, Globe, Gauge, Trash2, Box, Flame, Droplets, ArrowRightCircle } from 'lucide-react';
import useStore from '../store/useStore';
import Viewport3D from '../components/Viewport3D';
import MechanicsSolver from '../utils/solvers/mechanicsSolver';
import ThermalSolver from '../utils/solvers/thermalSolver';
import V6PhysicsSolver, { V6_CONFIG } from '../utils/solvers/v6PhysicsSolver';
import MechanicalAssemblySolver from '../utils/solvers/mechanicalAssemblySolver';
import V6RenderAdapter from '../utils/v6RenderAdapter';
import { SIM_UNITS, clamp, isFiniteNumber, createSimulationLogger } from '../utils/simulationSafety';
import V6ControlPanel from '../components/V6ControlPanel';
import modelLoader from '../services/modelLoader';
import ModelControls from '../components/ModelControls';
import { stepWater } from '../utils/waterPhysics';

export default function SimulateWorkspace() {
    // Top-level store values
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
    
    // Local Selection State (for inspector)
    const [selectedObjectIds, setSelectedObjectIds] = useState([]);

    const [isInspectorOpen, setIsInspectorOpen] = useState(true);
    
    // ── V6 Engine State ─────────────────────────────────────────────────────
    const simulationPreset = useStore(state => state.simulationPreset);
    const isV6Active = simulationPreset === 'v6_engine_simulation';
    const isMechanicalAssemblyPreset = simulationPreset === 'shaft_ring_assembly';
    const v6SolverRef = useRef(null);
    const v6RenderAdapterRef = useRef(new V6RenderAdapter());
    const v6LogRef = useRef(createSimulationLogger('SimulateWorkspace:V6', { throttleFrames: 30 }));
    const mechanicalSolverRef = useRef(new MechanicalAssemblySolver({ dt: 0.016, substeps: 4 }));
    const [v6EngineState, setV6EngineState] = useState(null);
    const [showV6Panel, setShowV6Panel] = useState(false);
    const [isMechanicalAssemblyActive, setIsMechanicalAssemblyActive] = useState(false);

    // Initialize V6 solver when V6 model is loaded
    useEffect(() => {
        if (isV6Active) {
            v6SolverRef.current = new V6PhysicsSolver({
                crankRadius:     45,
                rodLength:       130,
                pistonMass:      0.45,
                crankInertia:    0.35,
                initialRPM:      800,
                combustionForce: 30000,
                frictionTorque:  20,
                vAngleDeg:       60,
            });
            setShowV6Panel(true);
            setV6EngineState(v6SolverRef.current.getSnapshot());
            useStore.getState().setSimulationFrames([]);
            useStore.getState().setCurrentFrameIndex(0);
        } else {
            v6SolverRef.current = null;
            setShowV6Panel(false);
            setV6EngineState(null);
        }
    }, [isV6Active]);

    useEffect(() => {
        if (isV6Active || !isMechanicalAssemblyPreset) {
            setIsMechanicalAssemblyActive(false);
            return;
        }
        const initialized = mechanicalSolverRef.current.initialize(shapes3D);
        setIsMechanicalAssemblyActive(initialized);
    }, [isV6Active, isMechanicalAssemblyPreset, shapes3D]);

    // Core Engine Refs
    const reqRef = useRef(null);
    const mechSolver = useRef(new MechanicsSolver(simulationSettings));
    const thermSolver = useRef(new ThermalSolver(simulationSettings));

    // Internal states for overlays
    const [renderBodies, setRenderBodies] = useState([...shapes3D, ...objects]);
    const [vectors, setVectors] = useState([]);
    const [colorMap, setColorMap] = useState({});

    // Sync bodies to solver whenever they change in Design mode
    useEffect(() => {
        if (!isPlaying) {
            const allBodies = [...shapes3D, ...objects];
            mechSolver.current.setBodies(allBodies);
            mechSolver.current.setConstraints(constraints);
            thermSolver.current.setBodies(allBodies);
            setRenderBodies(allBodies);
        }
    }, [objects, shapes3D, constraints, isPlaying]);

    // Apply settings changes to solvers
    useEffect(() => {
        const preset = useStore.getState().simulationPreset;
        const groundY = preset === 'ashwins_workplace' ? -1000 : simulationSettings.groundY;
        mechSolver.current.updateSettings({ ...simulationSettings, groundY, mode: simulationMode, water: useStore.getState().water });
        thermSolver.current.updateSettings(simulationSettings);
    }, [simulationSettings, simulationMode]);
    
    // Ensure design changes reflect live in simulation.
    // If objects or shapes change while playing, pause and resync bodies.
    const prevCounts = useRef({ o: objects.length, s: shapes3D.length });
    useEffect(() => {
        const changed = prevCounts.current.o !== objects.length || prevCounts.current.s !== shapes3D.length;
        if (changed) {
            prevCounts.current = { o: objects.length, s: shapes3D.length };
            if (isPlaying) {
                useStore.getState().togglePlayback();
            }
            const allBodies = [...shapes3D, ...objects];
            mechSolver.current.setBodies(allBodies);
            thermSolver.current.setBodies(allBodies);
            setRenderBodies(allBodies);
        }
    }, [objects, shapes3D, isPlaying]);
    
    // On entering Simulation workspace, force a resync to the latest design state.
    useEffect(() => {
        if (activeWorkspace === 'simulate') {
            const allBodies = [...shapes3D, ...objects];
            mechSolver.current.setBodies(allBodies);
            thermSolver.current.setBodies(allBodies);
            setRenderBodies(allBodies);
            useStore.getState().setSimulationState({ time: 0 });
        }
    }, [activeWorkspace]);

    // ── Main Simulation Loop ───────────────────────────────────────────────────
    useEffect(() => {
        if (!isPlaying) {
            cancelAnimationFrame(reqRef.current);
            return;
        }

        let lastTime = performance.now();

        const loop = (time) => {
            const elapsed = (time - lastTime) / 1000;
            const rawDt = Math.min(Math.max(elapsed, 0), SIM_UNITS.TARGET_FRAME_DT);
            lastTime = time;
            if (!isFiniteNumber(rawDt)) {
                v6LogRef.current.log(Math.floor(time), 'invalid_dt', { elapsed, rawDt, source: 'mainLoop' }, 'error');
                reqRef.current = requestAnimationFrame(loop);
                return;
            }

            if (isV6Active && v6SolverRef.current) {
                const snap = v6SolverRef.current.tick(rawDt);
                setV6EngineState(snap);
                setShapes3D(prev => {
                    v6RenderAdapterRef.current.snapshotToTransforms(snap, prev, rawDt, v6SolverRef.current.config);
                    const alpha = clamp(snap.interpolationAlpha ?? 0, 0, 1);
                    const interpolated = v6RenderAdapterRef.current.getInterpolatedTransforms(alpha);
                    return v6RenderAdapterRef.current.apply(prev, interpolated);
                });

                setSimulationState({ time: snap.time, energy: { kinetic: snap.powerOutput, potential: 0, total: snap.powerOutput } });

            } else if (isMechanicalAssemblyActive) {
                const { states, time: simTime } = mechanicalSolverRef.current.tick(rawDt);
                if (states && states.size > 0) {
                    setShapes3D(prev => mechanicalSolverRef.current.applyToShapes(prev, states));
                }
                setSimulationState({
                    time: simTime || 0,
                    energy: { kinetic: 0, potential: 0, total: 0 }
                });

            // ── Generic rigid / thermal loop ─────────────────────────────────
            } else if (simulationType === 'rigid') {
                const bodies = mechSolver.current.bodies || [];
                bodies.forEach(b => {
                    if ((b.id || '').startsWith('ship_')) {
                        b.isStatic = false;
                        b.mass = b.mass || 100;
                    }
                });
                const boatBody = bodies.find(b => b.id === 'ship_hull_bottom');
                if (boatBody) {
                    boatBody.isStatic = false;
                    boatBody.mass = boatBody.mass || 150;
                }
                stepWater(rawDt, bodies);
                if (useStore.getState().simulationPreset === 'ashwins_workplace') {
                    const ctrl = useStore.getState().boatControl;
                    if (ctrl && ctrl.enabled) {
                        const boat = bodies.find(b => b.id === 'ship_hull_bottom');
                        if (boat) {
                            const boost = Math.max(0, (ctrl.thrust || 0)) * 12;
                            boat.externalForce = {
                                x: (boat.externalForce?.x || 0) + boost,
                                y: boat.externalForce?.y || 0,
                                z: boat.externalForce?.z || 0
                            };
                            const w = boat.params?.width || 50;
                            boat.externalTorque = { z: -boost * (w / 2) * 0.2 };
                        }
                    }
                }
                const snapshot = mechSolver.current.step();
                
                // Find the main hull to sync other ship parts
                const hull = snapshot.bodies.find(b => b.id === 'ship_hull_bottom');
                const hullOffset = hull ? {
                    x: (Array.isArray(hull.position) ? hull.position[0] : hull.position.x) - (shapes3D.find(s => s.id === 'ship_hull_bottom')?.position?.[0] || 0),
                    y: (Array.isArray(hull.position) ? hull.position[1] : hull.position.y) - (shapes3D.find(s => s.id === 'ship_hull_bottom')?.position?.[1] || 0),
                    z: (Array.isArray(hull.position) ? hull.position[2] : (hull.position.z || 0)) - (shapes3D.find(s => s.id === 'ship_hull_bottom')?.position?.[2] || 0)
                } : { x: 0, y: 0, z: 0 };

                const newRenderBodies = renderBodies.map(rb => {
                    const sb = snapshot.bodies.find(b => b.id === rb.id);
                    if (sb) {
                        const pos = Array.isArray(sb.position)
                            ? sb.position
                            : [sb.position.x || 0, sb.position.y || 0, sb.position.z || 0];
                        const rot = Array.isArray(sb.rotation)
                            ? sb.rotation
                            : [sb.rotation?.x || 0, sb.rotation?.y || 0, sb.rotation?.z || 0];
                        return { ...rb, position: pos, rotation: rot };
                    }
                    return rb;
                });
                setRenderBodies(newRenderBodies);
                setVectors(snapshot.vectors || []);
                setSimulationState({ time: snapshot.time, energy: snapshot.energy });

            } else if (simulationType === 'thermal') {
                const snapshot = thermSolver.current.step();
                setColorMap(snapshot.colorMap || {});
                setSimulationState({ time: snapshot.time, thermalAnalytics: snapshot.analytics });
            }

            reqRef.current = requestAnimationFrame(loop);
        };

        reqRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(reqRef.current);
    }, [isPlaying, simulationType, isV6Active, isMechanicalAssemblyActive, renderBodies, setShapes3D, setSimulationState]);

    // Handle Reset
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

    // Handle Setting changes
    const updateSetting = (key, val) => setSimulationSettings({ [key]: val });
    const updateGravity = (axis, val) => setSimulationSettings({ gravity: { ...simulationSettings.gravity, [axis]: parseFloat(val) } });

    const handlePresetLoad = (presetFile) => {
        import(`../models/${presetFile}.js`).then(module => {
            modelLoader.loadModel(module.default);
        });
    };

    // Construct final objects for Viewport
    const finalViewportObjects = renderBodies.map((b, index) => {
        let matArgs = {};
        if (simulationType === 'thermal' && analysisSettings.showHeatmap && colorMap[b.id]) {
            matArgs = { fill: colorMap[b.id], color: colorMap[b.id] };
        }
        
        // Phase 9: Exploded View Logic (Visually offset components without altering physics)
        let renderState = { ...b };
        if (analysisSettings.isExplodedView) {
            // Apply visual offsets based on index to scatter them
            // In a real 3D setup, we'd alter Z axis. Here we slightly fan them out.
            const offsetMultiplier = 20;
            const dirX = (index % 3) - 1; // -1, 0, 1
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
            
            {/* Top Toolbar (ANSYS Style) */}
            <div className="absolute top-0 left-0 right-0 h-14 bg-slate-950/80 backdrop-blur-md border-b border-white/10 z-30 flex items-center justify-between px-6">
                
                {/* Domain Selection */}
                <div className="flex bg-black/40 p-1 rounded-xl shadow-inner border border-white/5">
                    {[{ id: 'rigid', icon: <Box size={14}/>, label: 'Mechanical' },
                      { id: 'thermal', icon: <Flame size={14}/>, label: 'Thermal' },
                      { id: 'fluid', icon: <Droplets size={14}/>, label: 'Fluid (Beta)' }].map(type => (
                        <button
                            key={type.id}
                            onClick={() => useStore.setState({ simulationType: type.id })}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${simulationType === type.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                        >
                            {type.icon} {type.label}
                        </button>
                    ))}
                </div>

                {/* Mode & Overlays */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        {useStore.getState().simulationPreset === 'ashwins_workplace' && (
                            <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/10">
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Boat Motor</span>
                                <button
                                    onClick={() => useStore.getState().setBoatControl({ enabled: !useStore.getState().boatControl.enabled })}
                                    className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${useStore.getState().boatControl.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    {useStore.getState().boatControl.enabled ? 'On' : 'Off'}
                                </button>
                                <div className="flex items-center gap-1 text-[10px]">
                                    <span>Thrust</span>
                                    <input
                                        type="range" min="0" max="200" step="5"
                                        defaultValue={useStore.getState().boatControl.thrust || 0}
                                        onChange={e => useStore.getState().setBoatControl({ thrust: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="flex items-center gap-1 text-[10px]">
                                    <span>Steer</span>
                                    <button onClick={() => useStore.getState().setBoatControl({ steer: -1 })} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded">Left</button>
                                    <button onClick={() => useStore.getState().setBoatControl({ steer: 0 })} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded">Center</button>
                                    <button onClick={() => useStore.getState().setBoatControl({ steer: 1 })} className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded">Right</button>
                                </div>
                            </div>
                        )}
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Solver Mode</span>
                        <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5">
                            <button onClick={() => useStore.setState({ simulationMode: 'preview' })} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer ${simulationMode === 'preview' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-600 hover:text-white'}`}>Preview</button>
                            <button onClick={() => useStore.setState({ simulationMode: 'accurate' })} className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer ${simulationMode === 'accurate' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-600 hover:text-white'}`}>Accurate</button>
                        </div>
                    </div>

                    <div className="h-6 w-px bg-white/10 mx-2"></div>

                    <div className="flex gap-2">
                        <button onClick={() => setAnalysisSettings({ showVectors: !analysisSettings.showVectors })} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all cursor-pointer ${analysisSettings.showVectors ? 'border-primary bg-primary/20 text-white shadow-[0_0_10px_rgba(37,106,244,0.3)]' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
                            <ArrowRightCircle size={12} /> Vectors
                        </button>
                        <button onClick={() => setAnalysisSettings({ showJoints: !analysisSettings.showJoints })} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all cursor-pointer ${analysisSettings.showJoints ? 'border-purple-500 bg-purple-500/20 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
                            <Box size={12} /> Joints
                        </button>
                        <button onClick={() => setAnalysisSettings({ showAnchors: !analysisSettings.showAnchors })} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all cursor-pointer ${analysisSettings.showAnchors ? 'border-pink-500 bg-pink-500/20 text-white shadow-[0_0_10px_rgba(236,72,153,0.3)]' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
                            <Settings size={12} /> Anchors
                        </button>
                        <button onClick={() => setAnalysisSettings({ showHeatmap: !analysisSettings.showHeatmap })} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all cursor-pointer ${analysisSettings.showHeatmap ? 'border-orange-500 bg-orange-500/20 text-white shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
                            <Flame size={12} /> Heatmap
                        </button>
                        <button onClick={() => setAnalysisSettings({ isExplodedView: !analysisSettings.isExplodedView })} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all cursor-pointer ${analysisSettings.isExplodedView ? 'border-cyan-500 bg-cyan-500/20 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}>
                            <Box size={12} /> Exploded View
                        </button>
                    </div>

                    <div className="h-6 w-px bg-white/10 mx-2"></div>

                    {/* Presets */}
                    <select 
                        className="bg-black/40 border border-white/10 text-slate-300 text-[10px] uppercase font-bold tracking-wider rounded-lg px-3 py-1.5 outline-none cursor-pointer focus:border-primary/50"
                        onChange={(e) => { if(e.target.value) handlePresetLoad(e.target.value); e.target.value = ''; }}
                    >
                        <option value="">+ Load Preset...</option>
                        <option value="engineModel">Legacy Engine Demo</option>
                        <option value="v6EngineModel">V6 Engine (Advanced)</option>
                        <option value="shaftRingAssemblyModel">Shaft Ring Assembly</option>
                        <option value="sliderCrankModel">Slider-Crank Mechanism</option>
                        <option value="springMassModel">Spring-Mass System</option>
                        <option value="leverModel">Lever System</option>
                        <option value="pulleyModel">Pulley System</option>
                        <option value="pendulumModel">Pendulum System</option>
                    </select>
                </div>
            </div>

            {/* Main Viewport Area */}
            <div className="flex-1 relative pt-14">
                {is3DView ? (
                    <Viewport3D objects={finalViewportObjects} isSimulating={isPlaying} />
                ) : (
                    <div className="absolute inset-0">
                        <svg className="absolute inset-0 w-full h-full z-10">
                            {objects.map(obj => {
                                if (obj.type === 'rect') {
                                    return <rect key={obj.id} x={obj.x} y={obj.y} width={obj.width} height={obj.height} fill={obj.fill || 'rgba(59,130,246,0.2)'} stroke={obj.stroke || '#3b82f6'} strokeWidth={obj.strokeWidth || 2} />
                                }
                                if (obj.type === 'circle') {
                                    return <circle key={obj.id} cx={obj.cx} cy={obj.cy} r={obj.r} fill={obj.fill || 'rgba(139,92,246,0.2)'} stroke={obj.stroke || '#8b5cf6'} strokeWidth={obj.strokeWidth || 2} />
                                }
                                if (obj.type === 'path' && obj.points) {
                                    const d = obj.points.reduce((acc, p, i) => acc + (i === 0 ? `M ${p.x} ${p.y} ` : `L ${p.x} ${p.y} `), '');
                                    return <path key={obj.id} d={d} fill="none" stroke={obj.stroke || '#10b981'} strokeWidth={obj.strokeWidth || 2} />
                                }
                                return null;
                            })}
                            {renderBodies.map(b => {
                                const px = Array.isArray(b.position) ? b.position[0] : (b.position?.x ?? 0);
                                const py = Array.isArray(b.position) ? b.position[1] : (b.position?.y ?? 0);
                                const r = b.params?.radius || b.params?.radiusTop || Math.max(2, (b.params?.width || b.params?.height || 4) / 4);
                                return <circle key={`sim2d_${b.id}`} cx={px} cy={py} r={r} fill={b.color || '#64748b'} opacity="0.7" />;
                            })}
                        </svg>
                    </div>
                )}

                {/* V6 Engine Control Panel Overlay */}
                {isV6Active && (
                    <V6ControlPanel
                        solver={v6SolverRef.current}
                        engineState={v6EngineState}
                        isVisible={showV6Panel}
                        onClose={() => setShowV6Panel(false)}
                    />
                )}

                {/* SVG Vector & Debug Overlay Layer */}
                {(analysisSettings.showVectors || analysisSettings.showJoints || analysisSettings.showAnchors) && simulationType === 'rigid' && (
                    <svg className="absolute inset-0 pointer-events-none w-full h-full z-10" style={{ perspective: '1000px' }}>
                        <defs>
                            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#fbbf24" />
                            </marker>
                        </defs>
                        
                        {/* Render Constraint Joints & Anchors */}
                        {constraints.map((c, i) => {
                            const bA = finalViewportObjects.find(o => o.id === c.targetA);
                            const bB = finalViewportObjects.find(o => o.id === c.targetB);
                            
                            // Approximate locations if not given (Viewport coordinates mapping fallback)
                            let pA = bA ? { x: bA.x || bA.cx, y: bA.y || bA.cy } : null;
                            let pB = bB ? { x: bB.x || bB.cx, y: bB.y || bB.cy } : null;

                            // Apply local anchors if defined
                            if (pA && c.anchorA) { pA.x += c.anchorA.x; pA.y += c.anchorA.y; }
                            if (pB && c.anchorB) { pB.x += c.anchorB.x; pB.y += c.anchorB.y; }

                            return (
                                <g key={`constraint-${i}`}>
                                    {analysisSettings.showJoints && pA && pB && (
                                        <line x1={pA.x} y1={pA.y} x2={pB.x} y2={pB.y} stroke="#a855f7" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
                                    )}
                                    {analysisSettings.showAnchors && pA && (
                                        <circle cx={pA.x} cy={pA.y} r="4" fill="#ec4899" stroke="#fff" strokeWidth="1" opacity="0.8" />
                                    )}
                                    {analysisSettings.showAnchors && pB && (
                                        <circle cx={pB.x} cy={pB.y} r="4" fill="#ec4899" stroke="#fff" strokeWidth="1" opacity="0.8" />
                                    )}
                                </g>
                            );
                        })}

                        {/* Render Vectors */}
                        {analysisSettings.showVectors && vectors.map((v, i) => {
                            // Convert 3D positions to simplified 2D screen space offsets for now (placeholder mechanism)
                            const originX = window.innerWidth / 2 + v.origin.x;
                            const originY = window.innerHeight / 2 - v.origin.y; // Y is up in 3D, down in SVG
                            const length = Math.min(100, v.magnitude * analysisSettings.vectorScale); 
                            const dirX = v.velocity.x || v.gravityForce.x || 0;
                            const dirY = -(v.velocity.y || v.gravityForce.y || 0); // invert Y
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

                {/* Real-time Analytics Overlay (Left side) */}
                <div className="absolute top-20 left-6 z-20 w-64 space-y-4 pointer-events-none">
                    
                    {simulationType === 'rigid' && (
                        <div className="glass-panel p-4 rounded-xl shadow-2xl animate-in slide-in-from-left-4 duration-500">
                            <div className="flex items-center gap-2 mb-3">
                                <Activity size={14} className="text-emerald-400" />
                                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Mechanical Energy</span>
                            </div>
                            <div className="space-y-3">
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
                                <div className="pt-2 border-t border-white/10 flex justify-between text-[10px] font-mono font-bold">
                                    <span className="text-slate-400">TOTAL</span>
                                    <span className="text-amber-400">{simulationState.energy.total.toFixed(1)} J</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {simulationType === 'thermal' && (
                        <div className="glass-panel p-4 rounded-xl shadow-2xl animate-in slide-in-from-left-4 duration-500">
                            <div className="flex items-center gap-2 mb-3">
                                <Flame size={14} className="text-orange-500" />
                                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Thermal Analytics</span>
                            </div>
                            <div className="space-y-3 font-mono text-[10px]">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Peak Temp</span>
                                    <span className="text-red-400">{simulationState.thermalAnalytics.maxTemp.toFixed(1)} °C</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Avg Temp</span>
                                    <span className="text-orange-300">{simulationState.thermalAnalytics.avgTemp.toFixed(1)} °C</span>
                                </div>
                                <div className="pt-2 border-t border-white/10 flex justify-between font-bold">
                                    <span className="text-slate-400">Risk Level</span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] border ${
                                        simulationState.thermalAnalytics.heatRisk === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/50' : 
                                        simulationState.thermalAnalytics.heatRisk === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' :
                                        'bg-green-500/20 text-green-400 border-green-500/50'
                                    }`}>
                                        {simulationState.thermalAnalytics.heatRisk}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Right Side Physics Inspector */}
                <div className={`absolute top-20 right-6 bottom-28 z-20 transition-all duration-300 ${isInspectorOpen ? 'translate-x-0 w-72' : 'translate-x-[calc(100%+24px)] w-0'}`}>
                    <div className="h-full glass-panel rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        <div className="px-5 py-3 flex items-center justify-between border-b border-white/10 bg-white/5">
                            <div className="flex items-center gap-2">
                                <Settings size={14} className="text-primary" />
                                <h3 className="text-xs font-bold tracking-widest uppercase text-slate-200">Environment</h3>
                            </div>
                            <button onClick={() => setIsInspectorOpen(false)} className="text-slate-500 hover:text-white cursor-pointer">
                                <Settings size={12} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                            
                            {/* Rigid Body Controls */}
                            {simulationType === 'rigid' && (
                                <>
                                    <section>
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Globe size={10}/> Gravity Vector</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['x', 'y', 'z'].map(axis => (
                                                <div key={axis} className="bg-black/40 border border-white/5 rounded-lg p-1.5 flex flex-col items-center">
                                                    <span className="text-[8px] text-slate-500 uppercase font-bold">{axis}</span>
                                                    <input 
                                                        type="number" step="0.1"
                                                        value={simulationSettings.gravity[axis]} 
                                                        onChange={(e) => updateGravity(axis, e.target.value)}
                                                        className="w-full bg-transparent text-center text-[10px] text-white outline-none font-mono mt-0.5"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Gauge size={10}/> Global Parameters</label>
                                        
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                                                <span>Air Resistance (Drag)</span>
                                                <span className="text-white">{simulationSettings.airResistance}</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="0.1" step="0.001"
                                                value={simulationSettings.airResistance}
                                                onChange={e => updateSetting('airResistance', parseFloat(e.target.value))}
                                                className="w-full h-1 bg-white/10 rounded-full accent-primary outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                                                <span>Friction Coefficient</span>
                                                <span className="text-white">{simulationSettings.frictionCoeff}</span>
                                            </div>
                                            <input 
                                                type="range" min="0" max="1" step="0.01"
                                                value={simulationSettings.frictionCoeff}
                                                onChange={e => updateSetting('frictionCoeff', parseFloat(e.target.value))}
                                                className="w-full h-1 bg-white/10 rounded-full accent-orange-500 outline-none"
                                            />
                                        </div>
                                    </section>
                                </>
                            )}

                            {/* Thermal Controls */}
                            {simulationType === 'thermal' && (
                                <section className="space-y-4">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Flame size={10}/> Thermal Settings</label>
                                    
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                                            <span>Ambient Temp (°C)</span>
                                            <span className="text-white">{simulationSettings.ambientTemp}</span>
                                        </div>
                                        <input 
                                            type="range" min="-100" max="1000" step="1"
                                            value={simulationSettings.ambientTemp}
                                            onChange={e => updateSetting('ambientTemp', parseFloat(e.target.value))}
                                            className="w-full h-1 bg-white/10 rounded-full accent-orange-500 outline-none"
                                        />
                                    </div>
                                    <p className="text-[9px] text-slate-500 leading-relaxed mt-2 italic">
                                        Objects will gradually normalize to ambient temperature based on conductivity.
                                    </p>
                                </section>
                            )}
                            
                            {/* Embedded Active Model Controls */}
                            <ModelControls />
                            
                            {/* General Solver */}
                            <section className="pt-4 border-t border-white/10 space-y-4">
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Solver Precision</label>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                                        <span>Time Step (s)</span>
                                        <span className="text-emerald-400">{simulationSettings.timeStep}</span>
                                    </div>
                                    <input 
                                        type="range" min="0.001" max="0.1" step="0.001"
                                        value={simulationSettings.timeStep}
                                        onChange={e => updateSetting('timeStep', parseFloat(e.target.value))}
                                        className="w-full h-1 bg-white/10 rounded-full accent-emerald-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                                        <span>Sub-steps</span>
                                        <span className="text-white">{simulationSettings.subSteps}</span>
                                    </div>
                                    <input 
                                        type="range" min="1" max="20" step="1"
                                        value={simulationSettings.subSteps}
                                        onChange={e => updateSetting('subSteps', parseInt(e.target.value))}
                                        className="w-full h-1 bg-white/10 rounded-full accent-slate-400 outline-none"
                                    />
                                </div>
                            </section>
                        </div>
                    </div>
                </div>

                {!isInspectorOpen && (
                    <button onClick={() => setIsInspectorOpen(true)} className="absolute top-20 right-6 z-20 size-8 glass-panel rounded-lg flex items-center justify-center text-primary hover:bg-white/10 transition-all cursor-pointer">
                        <Settings size={14} />
                    </button>
                )}
            </div>

            {/* Bottom Playback Timeline */}
            <div className="h-20 bg-slate-950/90 border-t border-white/10 backdrop-blur-3xl px-8 flex items-center gap-12 z-30 shrink-0">
                {/* Transport Controls */}
                <div className="flex items-center gap-3">
                    <button onClick={() => { resetPlayback(); useStore.setState({ simulationState: { ...simulationState, time: 0 }}) }} className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer bg-white/5 hover:bg-white/10 rounded-lg">
                        <SkipBack size={16} />
                    </button>
                    <button 
                        onClick={togglePlayback} 
                        className="h-10 px-6 bg-primary hover:bg-blue-500 text-white rounded-xl shadow-[0_0_15px_rgba(37,106,244,0.4)] flex items-center justify-center transition-all cursor-pointer font-bold tracking-wider uppercase text-[10px]"
                    >
                        {isPlaying ? <><Square size={12} fill="currentColor" className="mr-2"/> PAUSE</> : <><Play size={14} fill="currentColor" className="mr-2"/> SIMULATE</>}
                    </button>
                    <button className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer bg-white/5 hover:bg-white/10 rounded-lg">
                        <SkipForward size={16} />
                    </button>
                </div>

                {/* Timeline display */}
                <div className="flex-1 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest hover:text-primary transition-colors cursor-pointer font-mono">
                            Time: {simulationState.time.toFixed(3)} s
                        </span>
                        <div className="flex items-center gap-2">
                            <div className={`size-1.5 rounded-full ${isPlaying ? 'bg-primary animate-pulse' : 'bg-slate-600'}`}></div>
                            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">
                                {isPlaying ? 'RUNNING' : 'IDLE'}
                            </span>
                        </div>
                    </div>
                    <div className="relative w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
                        <div className="absolute top-0 left-0 h-full bg-primary/40 w-full animate-pulse opacity-50"></div>
                        <div className="absolute top-0 left-0 h-full bg-primary transition-all duration-75" style={{ width: `${(simulationState.time % 10) / 10 * 100}%` }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
