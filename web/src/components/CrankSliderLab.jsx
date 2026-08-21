import React, { useState, useEffect, useRef } from 'react';
import {
    Play, Square, RefreshCw, SkipForward, ZoomIn, ZoomOut, Maximize,
    RotateCcw, Sliders, Activity, Gauge, TrendingUp, BarChart3, Move
} from 'lucide-react';
import useStore from '../store/useStore';
import CrankSliderPhysicsSolver from '../utils/solvers/crankSliderSolver';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v, digits = 3) {
    if (v === null || v === undefined) return '—';
    if (!Number.isFinite(v)) return '∞';
    const abs = Math.abs(v);
    if (abs === 0) return '0';
    if (abs >= 1e6 || abs < 1e-4) return v.toExponential(digits - 1);
    return v.toPrecision(digits).replace(/(\.\d*?)0+$/, '$1');
}

function formatSimTime(sec) {
    if (!Number.isFinite(sec)) return '0.00 s';
    return `${sec.toFixed(2)} s`;
}

const DEG = Math.PI / 180;

const CRANK_PRESETS = [
    { id: 'constant_rpm', name: 'Standard (10 rad/s)', config: { crankRadius: 0.1, rodLength: 0.3, omega: 10.0, alpha: 0, guideOffset: 0 } },
    { id: 'high_speed', name: 'High Speed (25 rad/s)', config: { crankRadius: 0.1, rodLength: 0.3, omega: 25.0, alpha: 0, guideOffset: 0 } },
    { id: 'accelerating', name: 'Accelerating (α=2 rad/s²)', config: { crankRadius: 0.1, rodLength: 0.3, omega: 2.0, alpha: 2.0, guideOffset: 0 } },
    { id: 'long_rod', name: 'Long Rod (L=0.5m)', config: { crankRadius: 0.1, rodLength: 0.5, omega: 10.0, alpha: 0, guideOffset: 0 } },
    { id: 'short_rod', name: 'Short Rod (L=0.15m)', config: { crankRadius: 0.1, rodLength: 0.15, omega: 10.0, alpha: 0, guideOffset: 0 } },
    { id: 'offset_guide', name: 'Offset Guide (y=0.04m)', config: { crankRadius: 0.1, rodLength: 0.3, omega: 10.0, alpha: 0, guideOffset: 0.04 } },
];

export default function CrankSliderLab() {
    const isPlaying = useStore(state => state.isPlaying);
    const togglePlayback = useStore(state => state.togglePlayback);
    const resetPlayback = useStore(state => state.resetPlayback);
    const setLabData = useStore(state => state.setLabData);
    const clearLabData = useStore(state => state.clearLabData);

    // ── Physical Configuration (SI units) ───────────────────────────────────
    const [crankRadius, setCrankRadius] = useState(0.1);     // r (m)
    const [rodLength, setRodLength] = useState(0.3);         // L (m)
    const [theta0, setTheta0] = useState(0);                 // initial crank angle (deg)
    const [omega, setOmega] = useState(10.0);                // angular velocity (rad/s)
    const [alpha, setAlpha] = useState(0.0);                 // angular acceleration (rad/s²)
    const [guideOffset, setGuideOffset] = useState(0.0);     // y-offset (m)
    const [dt, setDt] = useState(0.005);                     // physics timestep (s)
    const [timeScale, setTimeScale] = useState(1.0);         // speed multiplier

    // ── Visual Overlay Toggles ──────────────────────────────────────────────
    const [showTrail, setShowTrail] = useState(true);
    const [showVelocity, setShowVelocity] = useState(true);
    const [showAngleArc, setShowAngleArc] = useState(true);
    const [showGrid, setShowGrid] = useState(true);

    // ── Camera Viewport ──────────────────────────────────────────────────────
    const [camera, setCamera] = useState({ cx: 0.15, cy: 0, zoom: 750 }); // 750 px per meter
    const containerRef = useRef(null);
    const [viewSize, setViewSize] = useState({ width: 900, height: 600 });

    // ── Solver Ref ───────────────────────────────────────────────────────────
    const solverRef = useRef(null);
    if (!solverRef.current) {
        solverRef.current = new CrankSliderPhysicsSolver({
            crankRadius: 0.1, rodLength: 0.3, theta0: 0, omega: 10.0, alpha: 0.0,
            guideOffset: 0.0, dt: 0.005, timeScale: 1.0
        });
    }

    const [snapshot, setSnapshot] = useState(() => solverRef.current.getSnapshot());

    // ── Window Resize Listener ──────────────────────────────────────────────
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setViewSize({
                    width: containerRef.current.clientWidth || 900,
                    height: containerRef.current.clientHeight || 600,
                });
            }
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // ── Push Telemetry to Store for Properties Panel ─────────────────────────
    useEffect(() => {
        setLabData({
            type: 'crank_slider',
            title: 'Crank-Slider Mechanism Laboratory',
            snapshot: snapshot,
            config: { crankRadius, rodLength, theta0, omega, alpha, guideOffset, dt, timeScale },
        });
        return () => clearLabData();
    }, [snapshot, crankRadius, rodLength, theta0, omega, alpha, guideOffset, dt, timeScale, setLabData, clearLabData]);

    // ── Listen to Properties Panel Config Events ────────────────────────────
    useEffect(() => {
        const handleConfigChange = (event) => {
            const { type, key, value } = event.detail;
            if (type !== 'crank_slider') return;
            if (key === 'crankRadius') setCrankRadius(value);
            else if (key === 'rodLength') setRodLength(value);
            else if (key === 'theta0') setTheta0(value);
            else if (key === 'omega') setOmega(value);
            else if (key === 'alpha') setAlpha(value);
            else if (key === 'guideOffset') setGuideOffset(value);
            else if (key === 'dt') setDt(value);
            else if (key === 'timeScale') setTimeScale(value);
        };
        window.addEventListener('lab-config-change', handleConfigChange);
        return () => window.removeEventListener('lab-config-change', handleConfigChange);
    }, []);

    // ── Sync Solver Config ───────────────────────────────────────────────────
    useEffect(() => {
        if (solverRef.current) {
            solverRef.current.updateConfig({
                crankRadius, rodLength, theta0, omega, alpha, guideOffset, dt, timeScale
            });
            setSnapshot(solverRef.current.getSnapshot());
        }
    }, [crankRadius, rodLength, theta0, omega, alpha, guideOffset, dt, timeScale]);

    // ── 60 FPS Physics Simulation Step ───────────────────────────────────────
    useEffect(() => {
        let animId;
        let lastTime = performance.now();

        const loop = (now) => {
            const deltaSec = (now - lastTime) / 1000;
            lastTime = now;

            if (isPlaying && solverRef.current) {
                solverRef.current.step(deltaSec);
                setSnapshot(solverRef.current.getSnapshot());
            }
            animId = requestAnimationFrame(loop);
        };

        animId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animId);
    }, [isPlaying]);

    // ── Reset Handler ───────────────────────────────────────────────────────
    const handleReset = () => {
        if (solverRef.current) {
            solverRef.current.reset();
            setSnapshot(solverRef.current.getSnapshot());
        }
        if (resetPlayback) resetPlayback();
    };

    // ── Step Single Frame ───────────────────────────────────────────────────
    const handleStepForward = () => {
        if (solverRef.current) {
            solverRef.current.step(dt);
            setSnapshot(solverRef.current.getSnapshot());
        }
    };

    // ── Apply Preset ────────────────────────────────────────────────────────
    const applyPreset = (preset) => {
        setCrankRadius(preset.config.crankRadius);
        setRodLength(preset.config.rodLength);
        setOmega(preset.config.omega);
        setAlpha(preset.config.alpha);
        setGuideOffset(preset.config.guideOffset);
        if (solverRef.current) {
            solverRef.current.updateConfig(preset.config);
            solverRef.current.reset();
            setSnapshot(solverRef.current.getSnapshot());
        }
    };

    // ── World to Screen Transformation ───────────────────────────────────────
    const W = viewSize.width;
    const H = viewSize.height;
    const w2s = (wx, wy) => ({
        x: W / 2 + (wx - camera.cx) * camera.zoom,
        y: H / 2 - (wy - camera.cy) * camera.zoom,
    });

    // Positions in meters
    const pivotW = { x: 0, y: 0 };
    const pinW = { x: snapshot.crankPinX, y: snapshot.crankPinY };
    const sliderW = { x: snapshot.x, y: snapshot.y };

    // Positions in pixels
    const pivotP = w2s(pivotW.x, pivotW.y);
    const pinP = w2s(pinW.x, pinW.y);
    const sliderP = w2s(sliderW.x, sliderW.y);

    const crankPx = crankRadius * camera.zoom;
    const rodPx = rodLength * camera.zoom;
    const sliderWidthPx = 0.08 * camera.zoom;
    const sliderHeightPx = 0.04 * camera.zoom;

    // Velocity arrow calculations
    const vArrowLenPx = snapshot.v * camera.zoom * 0.1;

    return (
        <div ref={containerRef} className="relative w-full h-full bg-slate-950 flex flex-col overflow-hidden select-none">
            {/* ── Top Preset Bar & Camera Controls ─────────────────────────────── */}
            <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
                {/* Presets */}
                <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-1.5 rounded-xl pointer-events-auto shadow-2xl">
                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase px-2 flex items-center gap-1">
                        <Gauge size={12} /> Presets:
                    </span>
                    {CRANK_PRESETS.map(p => (
                        <button
                            key={p.id}
                            onClick={() => applyPreset(p)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5"
                        >
                            {p.name}
                        </button>
                    ))}
                </div>

                {/* Camera View Controls */}
                <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-1.5 rounded-xl pointer-events-auto shadow-2xl">
                    <button
                        onClick={() => setCamera(c => ({ ...c, zoom: Math.min(2000, c.zoom * 1.2) }))}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Zoom In"
                    >
                        <ZoomIn size={14} />
                    </button>
                    <button
                        onClick={() => setCamera(c => ({ ...c, zoom: Math.max(200, c.zoom / 1.2) }))}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Zoom Out"
                    >
                        <ZoomOut size={14} />
                    </button>
                    <button
                        onClick={() => setCamera({ cx: 0.15, cy: 0, zoom: 750 })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Reset Camera"
                    >
                        <Maximize size={14} />
                    </button>
                </div>
            </div>

            {/* ── Visual Overlays Bar (Left Float) ───────────────────────────── */}
            <div className="absolute top-16 left-4 z-20 flex flex-col gap-1 bg-slate-900/80 backdrop-blur-xl border border-white/10 p-1.5 rounded-xl pointer-events-auto">
                <span className="text-[9px] font-mono font-bold text-slate-400 px-2 py-0.5 uppercase">Overlays</span>
                <button
                    onClick={() => setShowVelocity(v => !v)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${showVelocity ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Activity size={11} /> Velocity Vector
                </button>
                <button
                    onClick={() => setShowTrail(t => !t)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${showTrail ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <TrendingUp size={11} /> Strobe Trail
                </button>
                <button
                    onClick={() => setShowAngleArc(a => !a)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${showAngleArc ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/40' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <RotateCcw size={11} /> Angle Arc
                </button>
            </div>

            {/* ── 2D Canvas Viewport ───────────────────────────────────────────── */}
            <div className="flex-1 relative w-full h-full">
                <svg className="w-full h-full absolute inset-0">
                    <defs>
                        <marker id="v-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                        </marker>
                        <linearGradient id="crank-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fbbf24" />
                            <stop offset="100%" stopColor="#d97706" />
                        </linearGradient>
                        <linearGradient id="rod-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="100%" stopColor="#0284c7" />
                        </linearGradient>
                        <linearGradient id="slider-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#34d399" />
                            <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                    </defs>

                    {/* Grid Background */}
                    {showGrid && (
                        <g opacity="0.15">
                            {Array.from({ length: 40 }).map((_, i) => {
                                const wx = (i - 20) * 0.1;
                                const sp = w2s(wx, 0);
                                return <line key={`vgrid-${i}`} x1={sp.x} y1={0} x2={sp.x} y2={H} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />;
                            })}
                            {Array.from({ length: 30 }).map((_, i) => {
                                const wy = (i - 15) * 0.1;
                                const sp = w2s(0, wy);
                                return <line key={`hgrid-${i}`} x1={0} y1={sp.y} x2={W} y2={sp.y} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />;
                            })}
                        </g>
                    )}

                    {/* Strobe Trail */}
                    {showTrail && snapshot.strobeHistory && snapshot.strobeHistory.length > 0 && (
                        <g opacity="0.4">
                            {/* Crank pin circular path */}
                            <circle cx={pivotP.x} cy={pivotP.y} r={crankPx} fill="none" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 4" />

                            {/* Piston position trail */}
                            {snapshot.strobeHistory.map((pt, idx) => {
                                const sp = w2s(pt.x, pt.y);
                                return (
                                    <circle
                                        key={`strobe-${idx}`}
                                        cx={sp.x}
                                        cy={sp.y}
                                        r="2"
                                        fill="#34d399"
                                    />
                                );
                            })}
                        </g>
                    )}

                    {/* Linear Slider Guide Rail */}
                    {(() => {
                        const railY = w2s(0, guideOffset).y;
                        const minX = w2s(-crankRadius * 1.5, 0).x;
                        const maxX = w2s((crankRadius + rodLength) * 1.3, 0).x;
                        return (
                            <g>
                                <line x1={minX} y1={railY} x2={maxX} y2={railY} stroke="#475569" strokeWidth="3" strokeDasharray="6 4" />
                                <line x1={minX} y1={railY + sliderHeightPx / 2 + 4} x2={maxX} y2={railY + sliderHeightPx / 2 + 4} stroke="#334155" strokeWidth="2" />
                                <line x1={minX} y1={railY - sliderHeightPx / 2 - 4} x2={maxX} y2={railY - sliderHeightPx / 2 - 4} stroke="#334155" strokeWidth="2" />
                                {/* Ticks */}
                                {Array.from({ length: 15 }).map((_, i) => {
                                    const tx = (i - 2) * 0.05;
                                    const tp = w2s(tx, guideOffset);
                                    return (
                                        <g key={`tick-${i}`}>
                                            <line x1={tp.x} y1={railY + sliderHeightPx / 2 + 4} x2={tp.x} y2={railY + sliderHeightPx / 2 + 10} stroke="#64748b" strokeWidth="1" />
                                            <text x={tp.x} y={railY + sliderHeightPx / 2 + 20} textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">
                                                {tx.toFixed(2)}m
                                            </text>
                                        </g>
                                    );
                                })}
                            </g>
                        );
                    })()}

                    {/* Crank Angle Arc */}
                    {showAngleArc && (
                        <g>
                            <path
                                d={`M ${pivotP.x + 35} ${pivotP.y} A 35 35 0 ${snapshot.thetaDeg > 180 ? 1 : 0} 0 ${pivotP.x + 35 * Math.cos(-snapshot.theta)} ${pivotP.y + 35 * Math.sin(-snapshot.theta)}`}
                                fill="none"
                                stroke="#f472b6"
                                strokeWidth="2"
                                strokeDasharray="3 2"
                            />
                            <text
                                x={pivotP.x + 45 * Math.cos(-snapshot.theta / 2)}
                                y={pivotP.y + 45 * Math.sin(-snapshot.theta / 2)}
                                fill="#f472b6"
                                fontSize="11"
                                fontWeight="bold"
                                fontFamily="monospace"
                            >
                                θ={snapshot.thetaDeg.toFixed(1)}°
                            </text>
                        </g>
                    )}

                    {/* Crank Arm (Pivot O -> Pin A) */}
                    <line x1={pivotP.x} y1={pivotP.y} x2={pinP.x} y2={pinP.y} stroke="url(#crank-grad)" strokeWidth="8" strokeLinecap="round" />

                    {/* Connecting Rod (Pin A -> Slider B) */}
                    <line x1={pinP.x} y1={pinP.y} x2={sliderP.x} y2={sliderP.y} stroke="url(#rod-grad)" strokeWidth="6" strokeLinecap="round" />

                    {/* Pivot Bearing O */}
                    <circle cx={pivotP.x} cy={pivotP.y} r="10" fill="#0f172a" stroke="#fbbf24" strokeWidth="3" />
                    <circle cx={pivotP.x} cy={pivotP.y} r="3" fill="#fbbf24" />

                    {/* Crank Pin A */}
                    <circle cx={pinP.x} cy={pinP.y} r="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                    <circle cx={pinP.x} cy={pinP.y} r="2" fill="#38bdf8" />

                    {/* Slider / Piston Block */}
                    <rect
                        x={sliderP.x - sliderWidthPx / 2}
                        y={sliderP.y - sliderHeightPx / 2}
                        width={sliderWidthPx}
                        height={sliderHeightPx}
                        rx="4"
                        fill="url(#slider-grad)"
                        stroke="#10b981"
                        strokeWidth="2"
                        opacity="0.9"
                    />

                    {/* Wrist Pin B */}
                    <circle cx={sliderP.x} cy={sliderP.y} r="5" fill="#0f172a" stroke="#34d399" strokeWidth="2" />
                    <circle cx={sliderP.x} cy={sliderP.y} r="1.5" fill="#34d399" />

                    {/* Velocity Vector Arrow on Piston */}
                    {showVelocity && Math.abs(snapshot.v) > 0.001 && (
                        <g>
                            <line
                                x1={sliderP.x}
                                y1={sliderP.y}
                                x2={sliderP.x + vArrowLenPx}
                                y2={sliderP.y}
                                stroke="#38bdf8"
                                strokeWidth="2.5"
                                markerEnd="url(#v-arrow)"
                            />
                            <text
                                x={sliderP.x + vArrowLenPx / 2}
                                y={sliderP.y - 12}
                                fill="#38bdf8"
                                fontSize="10"
                                fontWeight="bold"
                                fontFamily="monospace"
                                textAnchor="middle"
                            >
                                v = {snapshot.v.toFixed(2)} m/s
                            </text>
                        </g>
                    )}
                </svg>
            </div>

            {/* ── Bottom Playback & Control Bar ───────────────────────────────── */}
            <div className="h-16 bg-slate-950/95 border-t border-white/10 backdrop-blur-3xl px-6 flex items-center justify-between z-30 shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={togglePlayback}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg ${isPlaying ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'}`}
                    >
                        {isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                        {isPlaying ? 'PAUSE' : 'PLAY'}
                    </button>
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white border border-white/10 hover:bg-white/5 transition-all text-xs font-mono cursor-pointer"
                        title="Reset simulation to initial state"
                    >
                        <RefreshCw size={13} /> RESET
                    </button>
                    <button
                        onClick={handleStepForward}
                        disabled={isPlaying}
                        className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-mono transition-all border ${isPlaying ? 'opacity-40 cursor-not-allowed border-white/5 text-slate-600' : 'text-slate-300 border-white/10 hover:bg-white/5 cursor-pointer'}`}
                    >
                        <SkipForward size={13} /> STEP
                    </button>
                </div>

                {/* Telemetry Summary */}
                <div className="flex items-center gap-6 font-mono text-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500 uppercase text-[10px]">Sim Time:</span>
                        <span className="text-white font-bold">{formatSimTime(snapshot.time)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500 uppercase text-[10px]">Angle θ:</span>
                        <span className="text-fuchsia-400 font-bold">{snapshot.thetaDeg.toFixed(1)}°</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500 uppercase text-[10px]">Position x:</span>
                        <span className="text-emerald-400 font-bold">{snapshot.x.toFixed(3)} m</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500 uppercase text-[10px]">Velocity v:</span>
                        <span className="text-sky-400 font-bold">{snapshot.v.toFixed(3)} m/s</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
