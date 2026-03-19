import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Activity, Gauge, Zap, BarChart3, Settings2, Play, Square, SkipBack, Info, ChevronRight, Share2 } from 'lucide-react';
import useStore from '../store/useStore';
import SimulationEngine from '../utils/simulationEngine';

export default function AnalyzeWorkspace() {
    const objects = useStore(state => state.objects);
    const constraints = useStore(state => state.constraints);
    const analysisSettings = useStore(state => state.analysisSettings);
    const setAnalysisSettings = useStore(state => state.setAnalysisSettings);
    const energyHistory = useStore(state => state.energyHistory);
    const addEnergySnapshot = useStore(state => state.addEnergySnapshot);
    const clearEnergyHistory = useStore(state => state.clearEnergyHistory);
    
    const canvasRef = useRef(null);
    const engineRef = useRef(new SimulationEngine({ gravity: { x: 0, y: 500 } })); // Higher gravity for visual impact
    const [isPlaying, setIsPlaying] = useState(false);
    const [stats, setStats] = useState({ kinetic: 0, potential: 0, total: 0 });
    const [selectedId, setSelectedId] = useState(null);

    // Initialize Engine with current CAD objects
    useEffect(() => {
        const engine = engineRef.current;
        engine.bodies = [];
        engine.constraints = [];
        
        objects.forEach(obj => {
            if (obj.type === 'circle' || obj.type === 'rect') {
                engine.addBody({
                    id: obj.id,
                    type: obj.type,
                    position: { x: obj.cx || obj.x + (obj.width/2), y: obj.cy || obj.y + (obj.height/2) },
                    mass: obj.mass || 1.0,
                    isStatic: obj.isStatic || false,
                    radius: obj.r || Math.max(obj.width, obj.height) / 2 || 20
                });
            }
        });

        constraints.forEach(c => {
            engine.addConstraint(c);
        });

        clearEnergyHistory();
    }, [objects, constraints]);

    // Animation Loop
    useEffect(() => {
        let raf;
        const engine = engineRef.current;

        const loop = () => {
            if (isPlaying) {
                engine.update(0.016);
                const energy = engine.calculateEnergy();
                setStats(energy);
                addEnergySnapshot({ ...energy, time: Date.now() });
            }
            render();
            raf = requestAnimationFrame(loop);
        };

        const render = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const { width, height } = canvas;

            ctx.clearRect(0, 0, width, height);

            // Draw Grid
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            ctx.lineWidth = 1;
            for (let x = 0; x < width; x += 50) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
            }
            for (let y = 0; y < height; y += 50) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
            }

            // Draw Constraints
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.setLineDash([5, 5]);
            engine.constraints.forEach(c => {
                const b1 = engine.bodies.find(b => b.id === c.targetA);
                const b2 = engine.bodies.find(b => b.id === c.targetB);
                if (b1 && b2) {
                    ctx.beginPath();
                    ctx.moveTo(b1.position.x, b1.position.y);
                    ctx.lineTo(b2.position.x, b2.position.y);
                    ctx.stroke();
                }
            });
            ctx.setLineDash([]);

            // Draw Bodies
            engine.bodies.forEach(b => {
                const isSelected = selectedId === b.id;
                const speed = Math.sqrt(b.velocity.x**2 + b.velocity.y**2);
                
                // Heatmap Color Calculation
                const speedFactor = Math.min(1, speed / 500);
                const color = analysisSettings.showHeatmap 
                    ? `rgb(${Math.floor(speedFactor * 255)}, 100, ${Math.floor((1 - speedFactor) * 255)})`
                    : (b.isStatic ? '#64748b' : '#3b82f6');

                ctx.fillStyle = color;
                ctx.shadowBlur = isSelected ? 20 : 0;
                ctx.shadowColor = color;

                if (b.type === 'circle') {
                    ctx.beginPath();
                    ctx.arc(b.position.x, b.position.y, b.radius, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillRect(b.position.x - b.radius, b.position.y - b.radius, b.radius*2, b.radius*2);
                }
                
                // Highlight Selection
                if (isSelected) {
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                // Velocity Vectors
                if (analysisSettings.showVectors && !b.isStatic) {
                    const vx = b.velocity.x * 0.1 * analysisSettings.vectorScale;
                    const vy = b.velocity.y * 0.1 * analysisSettings.vectorScale;
                    if (Math.abs(vx) + Math.abs(vy) > 1) {
                        ctx.strokeStyle = '#ef4444';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(b.position.x, b.position.y);
                        ctx.lineTo(b.position.x + vx, b.position.y + vy);
                        ctx.stroke();
                        // Arrow head
                        const angle = Math.atan2(vy, vx);
                        ctx.beginPath();
                        ctx.moveTo(b.position.x + vx, b.position.y + vy);
                        ctx.lineTo(b.position.x + vx - 10 * Math.cos(angle - Math.PI/6), b.position.y + vy - 10 * Math.sin(angle - Math.PI/6));
                        ctx.lineTo(b.position.x + vx - 10 * Math.cos(angle + Math.PI/6), b.position.y + vy - 10 * Math.sin(angle + Math.PI/6));
                        ctx.closePath();
                        ctx.fillStyle = '#ef4444';
                        ctx.fill();
                    }
                }
                ctx.shadowBlur = 0;
            });
        };

        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [isPlaying, analysisSettings, selectedId]);

    const handleCanvasClick = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const clickedBody = engineRef.current.bodies.find(b => {
             const dist = Math.sqrt((b.position.x - x)**2 + (b.position.y - y)**2);
             return dist < b.radius + 5;
        });

        setSelectedId(clickedBody ? clickedBody.id : null);
    };

    const maxEnergy = useMemo(() => {
        if (energyHistory.length === 0) return 100;
        return Math.max(...energyHistory.map(h => h.total), 100);
    }, [energyHistory]);

    return (
        <div className="flex h-full bg-[#0a0f1a] overflow-hidden">
            {/* Main simulation area */}
            <div className="flex-1 relative border-r border-white/5">
                <canvas
                    ref={canvasRef}
                    width={1200}
                    height={800}
                    onClick={handleCanvasClick}
                    className="w-full h-full cursor-crosshair"
                />

                {/* HUD Overlays */}
                <div className="absolute top-8 left-8 space-y-4 pointer-events-none">
                    <div className="glass p-5 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md min-w-64">
                         <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
                            <Activity size={18} className="text-primary animate-pulse" />
                            <h3 className="text-sm font-black uppercase tracking-widest text-white">System Dynamics</h3>
                         </div>
                         <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-[10px] text-slate-500 font-black uppercase mb-1">
                                    <span>Kinetic</span>
                                    <span className="text-emerald-400 font-mono">{stats.kinetic.toFixed(2)} J</span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                     <div className="h-full bg-emerald-500 shadow-[0_0_10px_#10b981]" style={{ width: `${(stats.kinetic/maxEnergy)*100}%` }} />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-[10px] text-slate-500 font-black uppercase mb-1">
                                    <span>Potential</span>
                                    <span className="text-blue-400 font-mono">{stats.potential.toFixed(2)} J</span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                     <div className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" style={{ width: `${(stats.potential/maxEnergy)*100}%` }} />
                                </div>
                            </div>
                         </div>
                    </div>
                </div>

                {/* Playback controls */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 glass p-2 rounded-2xl border border-white/10 flex items-center gap-4 shadow-2xl">
                    <button onClick={() => setIsPlaying(false)} className="p-3 text-slate-400 hover:text-white transition-all cursor-pointer">
                        <SkipBack size={20} />
                    </button>
                    <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`size-14 rounded-xl flex items-center justify-center transition-all cursor-pointer ${isPlaying ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-primary text-white shadow-lg shadow-primary/30'}`}
                    >
                        {isPlaying ? <Square size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                    </button>
                    <button className="p-3 text-slate-400 hover:text-white transition-all cursor-pointer">
                        <Gauge size={20} />
                    </button>
                </div>
            </div>

            {/* Analysis Panel */}
            <div className="w-96 glass bg-slate-950/20 backdrop-blur-xl flex flex-col overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="size-8 bg-primary/20 rounded-lg flex items-center justify-center">
                            <BarChart3 size={18} className="text-primary" />
                        </div>
                        <h2 className="font-black text-sm uppercase tracking-tighter">Analysis Engine</h2>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {/* Visual Toggles */}
                    <section>
                         <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <Settings2 size={12} /> Visualization Layers
                         </h4>
                         <div className="space-y-3">
                             {[
                                 { key: 'showVectors', label: 'Velocity Vectors', desc: 'Real-time directional arrows' },
                                 { key: 'showHeatmap', label: 'Speed Heatmap', desc: 'Fast = Red, Slow = Blue' }
                             ].map(opt => (
                                 <div key={opt.key} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
                                    <div>
                                        <p className="text-xs font-bold text-slate-200">{opt.label}</p>
                                        <p className="text-[9px] text-slate-500">{opt.desc}</p>
                                    </div>
                                    <button
                                        onClick={() => setAnalysisSettings({ [opt.key]: !analysisSettings[opt.key] })}
                                        className={`w-10 h-5 rounded-full transition-all relative ${analysisSettings[opt.key] ? 'bg-primary' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${analysisSettings[opt.key] ? 'left-5.5' : 'left-0.5'}`} />
                                    </button>
                                 </div>
                             ))}
                         </div>
                    </section>

                    {/* Energy vs Time Graph */}
                    <section>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <Zap size={12} /> Energy Flux
                         </h4>
                         <div className="bg-black/40 rounded-2xl p-4 border border-white/5 h-48 relative overflow-hidden group">
                             {/* Energy Graph Lines */}
                             <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                <polyline
                                    fill="none"
                                    stroke="#10b981"
                                    strokeWidth="2"
                                    points={energyHistory.map((h, i) => `${(i / 200) * 350},${150 - (h.kinetic / maxEnergy) * 120}`).join(' ')}
                                />
                                <polyline
                                    fill="none"
                                    stroke="#3b82f6"
                                    strokeWidth="2"
                                    points={energyHistory.map((h, i) => `${(i / 200) * 350},${150 - (h.potential / maxEnergy) * 120}`).join(' ')}
                                />
                             </svg>
                             <div className="absolute top-2 right-2 flex flex-col gap-1">
                                 <div className="flex items-center gap-1.5 text-[8px] font-black text-emerald-400">
                                     <div className="size-1.5 rounded-full bg-emerald-500" /> KINETIC
                                 </div>
                                 <div className="flex items-center gap-1.5 text-[8px] font-black text-blue-400">
                                     <div className="size-1.5 rounded-full bg-blue-500" /> POTENTIAL
                                 </div>
                             </div>
                         </div>
                         <p className="text-[9px] text-center text-slate-600 mt-2 font-mono italic">Phase-space conservation active</p>
                    </section>

                    {/* Selected Body Inspector */}
                    {selectedId && (
                        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Object Analysis</h4>
                             <div className="glass p-4 rounded-xl border border-primary/20 bg-primary/5">
                                 <div className="flex items-center justify-between mb-3">
                                     <span className="text-[10px] font-mono text-primary font-black uppercase">INSTANCE {selectedId.substring(0,6)}</span>
                                     <span className="text-[9px] bg-primary text-white px-1.5 py-0.5 rounded font-black">LOCALIZED</span>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                     <div>
                                         <p className="text-[8px] text-slate-500 uppercase font-black tracking-tighter">Velocity</p>
                                         <p className="text-lg font-mono text-white leading-tight">
                                             {Math.sqrt(
                                                 engineRef.current.bodies.find(b => b.id === selectedId)?.velocity.x**2 + 
                                                 engineRef.current.bodies.find(b => b.id === selectedId)?.velocity.y**2 || 0
                                             ).toFixed(1)} <span className="text-[10px] text-slate-500">m/s</span>
                                         </p>
                                     </div>
                                     <div>
                                         <p className="text-[8px] text-slate-500 uppercase font-black tracking-tighter">Mass</p>
                                         <p className="text-lg font-mono text-white leading-tight">
                                             {engineRef.current.bodies.find(b => b.id === selectedId)?.mass || 0} <span className="text-[10px] text-slate-500">kg</span>
                                         </p>
                                     </div>
                                 </div>
                             </div>
                        </section>
                    )}
                </div>

                {/* Footer Analysis Summary */}
                <div className="p-6 bg-white/5 border-t border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Solver Iterations</span>
                        <span className="text-[10px] font-mono text-white">5 (Position Corrector)</span>
                    </div>
                    <button className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-center gap-2 transition-all cursor-pointer">
                        <Share2 size={12} /> Export Analysis Data
                    </button>
                </div>
            </div>
        </div>
    );
}
