import React, { useState, useEffect } from 'react';
import { Play, Square, SkipBack, SkipForward, Activity, Settings, Zap, Globe, Gauge, Trash2 } from 'lucide-react';
import useStore from '../store/useStore';
import Viewport3D from '../components/Viewport3D';

export default function SimulateWorkspace() {
    const objects = useStore(state => state.objects);
    const simulationSettings = useStore(state => state.simulationSettings);
    const setSimulationSettings = useStore(state => state.setSimulationSettings);

    const simulationFrames = useStore(state => state.simulationFrames);
    const setSimulationFrames = useStore(state => state.setSimulationFrames);
    const currentFrameIndex = useStore(state => state.currentFrameIndex);
    const setCurrentFrameIndex = useStore(state => state.setCurrentFrameIndex);
    const isPlaying = useStore(state => state.isPlaying);
    const togglePlayback = useStore(state => state.togglePlayback);
    const resetPlayback = useStore(state => state.resetPlayback);
    const simTime = useStore(state => state.simTime);
    const constraints = useStore(state => state.constraints);
    const removeConstraint = useStore(state => state.removeConstraint);
    const addConstraint = useStore(state => state.addConstraint);
    const selected3DIds = useStore(state => state.selected3DIds);
    const selectedIds = useStore(state => state.selectedIds);
    const selectedJointId = useStore(state => state.selectedJointId);
    const setSelectedJointId = useStore(state => state.setSelectedJointId);
    const updateConstraint = useStore(state => state.updateConstraint);
    const materials = useStore(state => state.materials);
    const applyMaterial = useStore(state => state.applyMaterial);
    const setShapes3D = useStore(state => state.setShapes3D);
    const shapes3D = useStore(state => state.shapes3D);

    const [isInspectorOpen, setIsInspectorOpen] = useState(true);
    const [isJointModalOpen, setIsJointModalOpen] = useState(false);
    const [newJoint, setNewJoint] = useState({
        type: 'hinge',
        targetA: '',
        targetB: '',
        pivotA: { x: 0, y: 0, z: 0 },
        pivotB: { x: 0, y: 0, z: 0 },
        axis: { x: 0, y: 1, z: 0 },
        motorEnabled: false,
        targetVelocity: 0,
        maxForce: 1000
    });

    useEffect(() => {
        // Auto-fill target A/B if two objects are selected
        const allSelected = [...selectedIds, ...selected3DIds];
        if (allSelected.length >= 1) {
            setNewJoint(prev => ({ ...prev, targetA: allSelected[0], targetB: allSelected[1] || '' }));
        }
    }, [selectedIds, selected3DIds]);

    const handleCreateJoint = () => {
        addConstraint(newJoint);
        setIsJointModalOpen(false);
    };

    const handleGravityChange = (axis, value) => {
        setSimulationSettings({
            gravity: { ...simulationSettings.gravity, [axis]: parseFloat(value) }
        });
    };

    // Analytics Calculation (Simplified for UI representation)
    const currentFrame = simulationFrames[currentFrameIndex];
    const energy = currentFrame ? currentFrame.states.reduce((acc, s) => acc + (s.velocity ? Math.sqrt(s.velocity.x ** 2 + s.velocity.y ** 2 + s.velocity.z ** 2) : 0), 0) : 0;

    return (
        <div className="flex flex-col h-full bg-[#0a0f1a] relative overflow-hidden">
            {/* Main 3D Viewport Area */}
            <div className="flex-1 relative">
                <Viewport3D objects={objects} isSimulating={isPlaying} />

                {/* Floating Overlays */}
                <div className="absolute top-6 left-6 z-10 pointer-events-none">
                    <div className="glass p-4 rounded-xl border border-white/10 shadow-2xl">
                        <div className="flex items-center gap-2 mb-2">
                            <Activity size={16} className="text-primary animate-pulse" />
                            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">System Status</span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between gap-8 text-[10px] font-mono">
                                <span className="text-slate-500">ENGINE STATE</span>
                                <span className="text-emerald-400">NOMINAL</span>
                            </div>
                            <div className="flex justify-between gap-8 text-[10px] font-mono">
                                <span className="text-slate-500">SOLVER FREQ</span>
                                <span className="text-blue-400">{1 / simulationSettings.timeStep} HZ</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side Physics Inspector */}
                <div className={`absolute top-6 right-6 bottom-6 z-20 transition-all duration-300 ${isInspectorOpen ? 'translate-x-0 w-80' : 'translate-x-[calc(100%+24px)] w-0'}`}>
                    <div className="h-full glass rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
                        <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-white/5">
                            <div className="flex items-center gap-2">
                                <Settings size={16} className="text-primary" />
                                <h3 className="text-sm font-bold tracking-tight">Physics Inspector</h3>
                            </div>
                            <button onClick={() => setIsInspectorOpen(false)} className="text-slate-500 hover:text-white cursor-pointer">
                                <Zap size={14} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                            {/* Global Gravity */}
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <Globe size={14} className="text-slate-400" />
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Gravity</h4>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {['x', 'y', 'z'].map(axis => (
                                        <div key={axis} className="space-y-1">
                                            <div className="text-[8px] text-slate-500 font-mono text-center uppercase">{axis}</div>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={simulationSettings.gravity[axis]}
                                                onChange={(e) => handleGravityChange(axis, e.target.value)}
                                                className="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-primary/50 text-center font-mono"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Solver Settings */}
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <Gauge size={14} className="text-slate-400" />
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Solver Properties</h4>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                                            <span>Time Step</span>
                                            <span className="font-mono text-white text-[11px]">{simulationSettings.timeStep}s</span>
                                        </div>
                                        <input
                                            type="range" min="0.001" max="0.1" step="0.001"
                                            value={simulationSettings.timeStep}
                                            onChange={(e) => setSimulationSettings({ timeStep: parseFloat(e.target.value) })}
                                            className="w-full appearance-none bg-white/5 h-1 rounded-full accent-primary outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                                            <span>Sub-steps</span>
                                            <span className="font-mono text-white text-[11px]">{simulationSettings.subSteps}</span>
                                        </div>
                                        <input
                                            type="number"
                                            value={simulationSettings.subSteps}
                                            onChange={(e) => setSimulationSettings({ subSteps: parseInt(e.target.value) })}
                                            className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-primary/50 font-mono"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Object Properties (Conditional) */}
                            {(selected3DIds.length > 0 || selectedIds.length > 0) && (
                                <section className="pt-4 border-t border-white/5 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Zap size={14} className="text-primary" />
                                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Object Properties</h4>
                                    </div>
                                    <div className="bg-white/3 rounded-xl p-4 border border-white/5 space-y-4">
                                        {/* Material Selection */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Material Preset</label>
                                            <select
                                                onChange={(e) => {
                                                    const id = selected3DIds[0] || selectedIds[0];
                                                    applyMaterial(id, e.target.value);
                                                }}
                                                className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-primary/50 cursor-pointer"
                                            >
                                                <option value="">Custom...</option>
                                                {Object.keys(materials).map(m => (
                                                    <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Physics Toggles */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-slate-400">Fixed / Static</span>
                                            <button
                                                onClick={() => {
                                                    const id = selected3DIds[0] || selectedIds[0];
                                                    setShapes3D(prev => prev.map(s => s.id === id ? { ...s, isStatic: !s.isStatic } : s));
                                                }}
                                                className={`w-8 h-4 rounded-full transition-colors relative ${shapes3D.find(s => s.id === (selected3DIds[0] || selectedIds[0]))?.isStatic ? 'bg-primary' : 'bg-slate-700'}`}
                                            >
                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${shapes3D.find(s => s.id === (selected3DIds[0] || selectedIds[0]))?.isStatic ? 'left-4.5' : 'left-0.5'}`} />
                                            </button>
                                        </div>

                                        {/* Precision Sliders */}
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[9px] text-slate-500 uppercase font-bold">
                                                    <span>Restitution</span>
                                                    <span className="text-white font-mono">{shapes3D.find(s => s.id === (selected3DIds[0] || selectedIds[0]))?.restitution?.toFixed(2) || 0.5}</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="1" step="0.01"
                                                    value={shapes3D.find(s => s.id === (selected3DIds[0] || selectedIds[0]))?.restitution || 0.5}
                                                    onChange={(e) => {
                                                        const id = selected3DIds[0] || selectedIds[0];
                                                        setShapes3D(prev => prev.map(s => s.id === id ? { ...s, restitution: parseFloat(e.target.value) } : s));
                                                    }}
                                                    className="w-full h-1 bg-white/5 rounded-full accent-primary outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[9px] text-slate-500 uppercase font-bold">
                                                    <span>Friction</span>
                                                    <span className="text-white font-mono">{shapes3D.find(s => s.id === (selected3DIds[0] || selectedIds[0]))?.friction?.toFixed(2) || 0.3}</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="1" step="0.01"
                                                    value={shapes3D.find(s => s.id === (selected3DIds[0] || selectedIds[0]))?.friction || 0.3}
                                                    onChange={(e) => {
                                                        const id = selected3DIds[0] || selectedIds[0];
                                                        setShapes3D(prev => prev.map(s => s.id === id ? { ...s, friction: parseFloat(e.target.value) } : s));
                                                    }}
                                                    className="w-full h-1 bg-white/5 rounded-full accent-primary outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Analytics Sparklines */}
                            <section className="pt-4 border-t border-white/5">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Real-time Analytics</h4>
                                <div className="bg-white/3 rounded-xl p-4 border border-white/5 space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[9px] text-slate-500 uppercase font-bold">
                                            <span>Kinetic Energy</span>
                                            <span className="text-emerald-400 font-mono">{energy.toFixed(3)} J</span>
                                        </div>
                                        <div className="h-10 w-full overflow-hidden flex items-end gap-[1px]">
                                            {[...Array(20)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-full bg-emerald-500/30 rounded-t-sm transition-all duration-300 ${isPlaying ? 'animate-pulse' : ''}`}
                                                    style={{ height: `${20 + Math.random() * 60}%` }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Joints List */}
                            <section className="pt-4 border-t border-white/5">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Joints & Constraints</h4>
                                    <button
                                        onClick={() => setIsJointModalOpen(true)}
                                        className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded border border-primary/20 hover:bg-primary/30 transition-colors cursor-pointer"
                                    >
                                        + ADD JOINT
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {constraints.length === 0 ? (
                                        <div className="text-[10px] text-slate-600 italic text-center py-4 bg-white/2 rounded-lg border border-dashed border-white/5">
                                            No joints defined
                                        </div>
                                    ) : (
                                        constraints.map(c => (
                                            <div
                                                key={c.id}
                                                onClick={() => setSelectedJointId(c.id)}
                                                className={`group glass p-3 rounded-xl border transition-all cursor-pointer ${selectedJointId === c.id ? 'border-primary bg-primary/10' : 'border-white/5 hover:border-primary/30'}`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[10px] font-bold text-white uppercase tracking-tight">{c.type} JOINT</span>
                                                        <span className="text-[9px] text-slate-500 truncate w-24 font-mono">{c.id}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {c.motorEnabled && <Zap size={10} className="text-yellow-400 fill-yellow-400" />}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); removeConstraint(c.id); if (selectedJointId === c.id) setSelectedJointId(null); }}
                                                            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Motor Controls for selected joint */}
                                                {selectedJointId === c.id && (
                                                    <div className="mt-3 pt-3 border-t border-white/5 space-y-3" onClick={e => e.stopPropagation()}>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[9px] text-slate-400 uppercase font-bold">Motor Active</span>
                                                            <button
                                                                onClick={() => updateConstraint(c.id, { motorEnabled: !c.motorEnabled })}
                                                                className={`w-8 h-4 rounded-full transition-colors relative ${c.motorEnabled ? 'bg-primary' : 'bg-slate-700'}`}
                                                            >
                                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${c.motorEnabled ? 'left-4.5' : 'left-0.5'}`} />
                                                            </button>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between text-[9px] text-slate-500 uppercase font-bold">
                                                                <span>Target Velocity</span>
                                                                <span className="text-white font-mono">{c.targetVelocity} rad/s</span>
                                                            </div>
                                                            <input
                                                                type="range" min="-10" max="10" step="0.1"
                                                                value={c.targetVelocity}
                                                                onChange={(e) => updateConstraint(c.id, { targetVelocity: parseFloat(e.target.value) })}
                                                                className="w-full h-1 bg-white/5 rounded-full accent-primary outline-none"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between text-[9px] text-slate-500 uppercase font-bold">
                                                                <span>Max Torque</span>
                                                                <span className="text-white font-mono">{c.maxForce} Nm</span>
                                                            </div>
                                                            <input
                                                                type="number"
                                                                value={c.maxForce}
                                                                onChange={(e) => updateConstraint(c.id, { maxForce: parseFloat(e.target.value) })}
                                                                className="w-full bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-xs text-white outline-none font-mono"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>

                {!isInspectorOpen && (
                    <button
                        onClick={() => setIsInspectorOpen(true)}
                        className="absolute top-6 right-6 z-20 size-10 glass rounded-full border border-white/10 flex items-center justify-center text-primary shadow-xl hover:bg-white/10 transition-all cursor-pointer"
                    >
                        <Settings size={20} />
                    </button>
                )}

                {/* Create Joint Modal */}
                {isJointModalOpen && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="w-96 glass rounded-2xl border border-white/10 shadow-2xl p-6 space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold tracking-tight">Create New Joint</h3>
                                <button onClick={() => setIsJointModalOpen(false)} className="text-slate-500 hover:text-white cursor-pointer">
                                    <Zap size={18} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Joint Type</label>
                                    <select
                                        value={newJoint.type}
                                        onChange={(e) => setNewJoint({ ...newJoint, type: e.target.value })}
                                        className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-primary/50"
                                    >
                                        <option value="hinge">Hinge (Revolute)</option>
                                        <option value="slider">Slider (Prismatic)</option>
                                        <option value="distance">Distance (Stick)</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Target A</label>
                                        <input
                                            value={newJoint.targetA}
                                            onChange={(e) => setNewJoint({ ...newJoint, targetA: e.target.value })}
                                            placeholder="Object ID"
                                            className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Target B</label>
                                        <input
                                            value={newJoint.targetB}
                                            onChange={(e) => setNewJoint({ ...newJoint, targetB: e.target.value })}
                                            placeholder="Ground (null)"
                                            className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Pivot A (X, Y, Z)</label>
                                        <div className="grid grid-cols-3 gap-1">
                                            {['x', 'y', 'z'].map(axis => (
                                                <input
                                                    key={axis}
                                                    type="number"
                                                    value={newJoint.pivotA[axis]}
                                                    onChange={(e) => setNewJoint({ ...newJoint, pivotA: { ...newJoint.pivotA, [axis]: parseFloat(e.target.value) } })}
                                                    className="bg-black/40 border border-white/5 rounded px-1 py-1 text-[10px] text-white outline-none text-center font-mono"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Pivot B (X, Y, Z)</label>
                                        <div className="grid grid-cols-3 gap-1">
                                            {['x', 'y', 'z'].map(axis => (
                                                <input
                                                    key={axis}
                                                    type="number"
                                                    value={newJoint.pivotB[axis]}
                                                    onChange={(e) => setNewJoint({ ...newJoint, pivotB: { ...newJoint.pivotB, [axis]: parseFloat(e.target.value) } })}
                                                    className="bg-black/40 border border-white/5 rounded px-1 py-1 text-[10px] text-white outline-none text-center font-mono"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Rotation Axis (X, Y, Z)</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['x', 'y', 'z'].map(axis => (
                                            <input
                                                key={axis}
                                                type="number"
                                                value={newJoint.axis[axis]}
                                                onChange={(e) => setNewJoint({ ...newJoint, axis: { ...newJoint.axis, [axis]: parseFloat(e.target.value) } })}
                                                className="bg-black/40 border border-white/5 rounded-lg px-2 py-2 text-xs text-white outline-none text-center font-mono"
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Motor Settings in Modal */}
                                <div className="pt-4 border-t border-white/5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Zap size={14} className="text-yellow-400" />
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Enable Motor</label>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={newJoint.motorEnabled}
                                            onChange={(e) => setNewJoint({ ...newJoint, motorEnabled: e.target.checked })}
                                            className="accent-primary"
                                        />
                                    </div>
                                    {newJoint.motorEnabled && (
                                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Velocity</label>
                                                <input
                                                    type="number"
                                                    value={newJoint.targetVelocity}
                                                    onChange={(e) => setNewJoint({ ...newJoint, targetVelocity: parseFloat(e.target.value) })}
                                                    className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Max Torque</label>
                                                <input
                                                    type="number"
                                                    value={newJoint.maxForce}
                                                    onChange={(e) => setNewJoint({ ...newJoint, maxForce: parseFloat(e.target.value) })}
                                                    className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleCreateJoint}
                                className="w-full bg-primary hover:bg-primary/80 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 transition-all cursor-pointer"
                            >
                                ESTABLISH CONNECTION
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Playback Timeline */}
            <div className="h-24 bg-black/40 border-t border-white/5 backdrop-blur-3xl px-8 flex items-center gap-12 z-30">
                {/* Transport Controls */}
                <div className="flex items-center gap-3">
                    <button onClick={resetPlayback} className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer">
                        <SkipBack size={18} />
                    </button>
                    <button
                        onClick={togglePlayback}
                        className="size-12 bg-primary hover:bg-primary/80 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 transition-all cursor-pointer"
                    >
                        {isPlaying ? <Square size={18} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-1" />}
                    </button>
                    <button className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer">
                        <SkipForward size={18} />
                    </button>
                </div>

                {/* Timeline Slider */}
                <div className="flex-1 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Simulation Timeline</span>
                        <span className="text-[11px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                            {simTime.toFixed(3)}s / {(simulationFrames.length * simulationSettings.timeStep).toFixed(2)}s
                        </span>
                    </div>
                    <div className="relative group p-1">
                        <input
                            type="range"
                            min="0"
                            max={Math.max(0, simulationFrames.length - 1)}
                            value={currentFrameIndex}
                            onChange={(e) => setCurrentFrameIndex(parseInt(e.target.value))}
                            className="w-full appearance-none bg-white/5 h-2 rounded-full cursor-pointer accent-primary hover:bg-white/10 transition-all"
                        />
                    </div>
                    <div className="flex justify-between text-[8px] text-slate-600 font-mono">
                        <span>FRAME 0</span>
                        <span>FRAME {simulationFrames.length}</span>
                    </div>
                </div>

                {/* Performance HUD */}
                <div className="flex items-center gap-8 pl-8 border-l border-white/5">
                    <div className="text-right">
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-tighter">Render FPS</div>
                        <div className="text-xl font-mono text-white leading-none">60.0</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-tighter">Delta Time</div>
                        <div className="text-xl font-mono text-emerald-400 leading-none">{(simulationSettings.timeStep * 1000).toFixed(1)}ms</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
