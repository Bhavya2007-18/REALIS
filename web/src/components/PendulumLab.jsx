import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Play, Square, RefreshCw, SkipForward, Activity, Layers,
    Sliders, Sparkles, ArrowDown, ChevronDown, Wrench, BookOpen,
    Compass, Gauge
} from 'lucide-react';
import useStore from '../store/useStore';
import PendulumPhysicsSolver from '../utils/solvers/pendulumSolver';
import { PLANETARY_GRAVITY } from '../utils/solvers/freeFallSolver';

// ── Collapsible Engineering Information Bar (Accordion Section) ───────────────
function InfoBar({ icon, title, accent, summary, status, open, onToggle, children }) {
    return (
        <div className={`border-t border-white/10 transition-colors duration-200 ${open ? 'bg-slate-900/60' : 'bg-slate-950/90'}`}>
            <button
                onClick={onToggle}
                className={`w-full flex items-center gap-3 px-5 py-2.5 text-left cursor-pointer transition-colors duration-200 group ${open ? 'bg-slate-900/70' : 'hover:bg-slate-900/50'}`}
                aria-expanded={open}
            >
                <span className={`shrink-0 transition-colors ${open ? accent : 'text-slate-500 group-hover:text-slate-300'}`}>
                    {icon}
                </span>
                <span className={`text-[10px] font-bold tracking-widest uppercase shrink-0 transition-colors ${open ? 'text-slate-200' : 'text-slate-400 group-hover:text-slate-200'}`}>
                    {title}
                </span>
                <span className="flex-1 min-w-0 text-xs font-mono text-slate-400 truncate">{summary}</span>
                {status}
                <ChevronDown
                    size={13}
                    className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-slate-300' : 'text-slate-500 group-hover:text-slate-300'}`}
                />
            </button>
            <div
                className="grid"
                style={{ gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.2s ease-out' }}
            >
                <div className="overflow-hidden min-h-0">
                    {children}
                </div>
            </div>
        </div>
    );
}

// ── Compact stat tile used inside expanded sections ──────────────────────────
function Stat({ label, value, unit, color = 'text-white' }) {
    return (
        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">{label}</span>
            <div className={`text-base font-bold font-mono ${color}`}>
                {value} <span className="text-xs font-normal text-slate-500">{unit}</span>
            </div>
        </div>
    );
}

export default function PendulumLab() {
    const isPlaying = useStore(state => state.isPlaying);
    const togglePlayback = useStore(state => state.togglePlayback);
    const resetPlayback = useStore(state => state.resetPlayback);

    // Initial laboratory configuration
    const [length, setLength] = useState(2.0);       // rod length L (m)
    const [angle0, setAngle0] = useState(60.0);      // initial release angle θ₀ (deg)
    const [mass, setMass] = useState(2.0);           // bob mass (kg)
    const [damping, setDamping] = useState(0.0);     // pivot friction
    const [selectedPlanet, setSelectedPlanet] = useState('earth');
    const [gravity, setGravity] = useState(PLANETARY_GRAVITY.earth.g);
    const [timeScale, setTimeScale] = useState(1.0);

    // Canvas layer toggles (the sim stays the hero)
    const [showTrace, setShowTrace] = useState(true);
    const [showStrobeTrail, setShowStrobeTrail] = useState(true);
    const [showVelocityVector, setShowVelocityVector] = useState(true);
    const [showTensionVector, setShowTensionVector] = useState(true);
    const [showAngleArc, setShowAngleArc] = useState(true);

    // Accordion state — at most ONE engineering bar open at a time, all collapsed by default
    const [openSection, setOpenSection] = useState(null); // 'telemetry' | 'params' | 'inspector'
    const toggleSection = (key) => setOpenSection(prev => (prev === key ? null : key));

    // Physics solver instance (stable state holder, mutated externally by the loop)
    const [solver] = useState(() => new PendulumPhysicsSolver({
        length: 2.0, angle0: 60.0, gravity: PLANETARY_GRAVITY.earth.g, mass: 2.0, damping: 0.0, timeScale: 1.0
    }));

    const [snapshot, setSnapshot] = useState(solver.getSnapshot());
    const reqRef = useRef(null);
    const lastTimeRef = useRef(0);

    // Update solver when configuration changes
    useEffect(() => {
        solver.updateConfig({ length, angle0, gravity, mass, damping, timeScale });
        setSnapshot(solver.getSnapshot());
    }, [length, angle0, gravity, mass, damping, timeScale, solver]);

    // Handle Reset
    const handleReset = () => {
        resetPlayback();
        solver.reset();
        setSnapshot(solver.getSnapshot());
    };

    // Single step forward
    const handleStepForward = () => {
        if (!isPlaying) {
            setSnapshot({ ...solver.step(0.016) });
        }
    };

    // Main 60 FPS physics animation loop (frame-rate independent)
    useEffect(() => {
        if (!isPlaying) {
            cancelAnimationFrame(reqRef.current);
            return;
        }
        lastTimeRef.current = performance.now();
        const loop = (now) => {
            const elapsed = Math.min((now - lastTimeRef.current) / 1000, 0.05);
            lastTimeRef.current = now;
            setSnapshot({ ...solver.step(elapsed) });
            reqRef.current = requestAnimationFrame(loop);
        };
        reqRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(reqRef.current);
    }, [isPlaying, solver]);

    // Sync AI query window hook
    useEffect(() => {
        window.REALIS_AI_QUERY = () => ({
            simulationType: 'PendulumExperiment',
            ...snapshot
        });
        return () => { delete window.REALIS_AI_QUERY; };
    }, [snapshot]);

    // Viewport dimensions
    const containerRef = useRef(null);
    const [viewSize, setViewSize] = useState({ width: 900, height: 600 });
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setViewSize({
                    width: containerRef.current.clientWidth || 900,
                    height: containerRef.current.clientHeight || 600
                });
            }
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // ── Projection: pivot near top-center, bob swings below ──
    const pivotX = viewSize.width / 2;
    const pivotY = Math.max(64, viewSize.height * 0.16);
    const rodPx = Math.min(
        viewSize.width * 0.36,
        viewSize.height * 0.52,
        Math.max(140, pivotY * 0.5 + (viewSize.height - pivotY) * 0.62)
    );
    const bobRadiusPx = Math.max(13, Math.min(24, rodPx * 0.045));

    const thetaRad = snapshot.theta;
    const bobX = pivotX + rodPx * Math.sin(thetaRad);
    const bobY = pivotY + rodPx * Math.cos(thetaRad);

    // Velocity vector (tangential)
    const maxSpeed = snapshot.analytics.speedAtBottom || 1;
    const velFraction = Math.min(1.2, Math.abs(snapshot.omega) * snapshot.config.length / maxSpeed);
    const velArrowLen = Math.max(0, velFraction * rodPx * 0.3);
    const velSign = snapshot.omega >= 0 ? 1 : -1;
    const velDirX = Math.cos(thetaRad) * velSign;
    const velDirY = -Math.sin(thetaRad) * velSign;

    // Tension vector (along rod toward pivot)
    const tensionFraction = Math.min(2.0, snapshot.tension / (mass * (gravity || 9.81)));
    const tensionArrowLen = Math.max(0, tensionFraction * rodPx * 0.28);
    const tenDirX = -Math.sin(thetaRad);
    const tenDirY = -Math.cos(thetaRad);

    // Bob path trace from solver history
    const tracePoints = useMemo(() => {
        return (snapshot.history?.theta || []).map(th => ({
            x: pivotX + rodPx * Math.sin(th),
            y: pivotY + rodPx * Math.cos(th)
        }));
    }, [snapshot.history, pivotX, pivotY, rodPx]);

    // Angle arc polyline from vertical (θ=0) to current θ
    const angleArc = useMemo(() => {
        const R = rodPx * 0.3;
        const pts = [];
        const N = 40;
        const a0 = snapshot.theta;
        for (let i = 0; i <= N; i++) {
            const a = (i / N) * a0;
            pts.push(`${(pivotX + R * Math.sin(a)).toFixed(1)},${(pivotY + R * Math.cos(a)).toFixed(1)}`);
        }
        return pts.join(' ');
    }, [snapshot.theta, pivotX, pivotY, rodPx]);

    // Live collapsed-bar summaries
    const flightStatus = snapshot.isResting ? 'AT REST' : (isPlaying ? 'SWINGING' : 'READY');
    const telemetrySummary = `θ ${snapshot.angle}° · ω ${snapshot.omega} rad/s · v ${snapshot.speed}m/s · T ${snapshot.tension}N`;
    const paramsSummary = `L ${length}m · θ₀ ${angle0}° · m ${mass}kg · g ${gravity}m/s²`;
    const inspectorSummary = `Single pendulum · Semi-implicit Euler · Δt ${snapshot.config.dt}s`;

    const handlePlanetSelect = (pKey) => {
        setSelectedPlanet(pKey);
        setGravity(PLANETARY_GRAVITY[pKey].g);
    };

    return (
        <div ref={containerRef} className="relative w-full h-full bg-[#0a0f1a] overflow-hidden select-none font-sans flex flex-col">
            {/* ── Background Grid & Elevation Gradients ── */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(56,189,248,0.12),rgba(255,255,255,0))] pointer-events-none" />
            <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            {/* ── Top Floating Header: Preset Status & Quick Planet Selector ── */}
            <div className="absolute top-4 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-3 pointer-events-auto">
                    <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-amber-500/30 shadow-lg shadow-amber-500/10">
                        <Compass size={14} className="text-amber-400 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Simple Pendulum Laboratory</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">L={length}m</span>
                    </div>

                    {/* Planet Environment Pill Buttons */}
                    <div className="flex bg-slate-900/80 backdrop-blur-md p-0.5 rounded-xl border border-white/10">
                        {Object.entries(PLANETARY_GRAVITY).map(([pKey, pData]) => (
                            <button
                                key={pKey}
                                onClick={() => handlePlanetSelect(pKey)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                    selectedPlanet === pKey && Math.abs(gravity - pData.g) < 0.001
                                        ? 'bg-amber-500 text-white shadow-md'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                                title={`${pData.name} (g = ${pData.g} m/s²)`}
                            >
                                {pData.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Visual Layer Toggles */}
                <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-white/10 pointer-events-auto">
                    <button
                        onClick={() => setShowTrace(!showTrace)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            showTrace ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title="Toggle Bob Path Trace"
                    >
                        <Layers size={11} /> Trace
                    </button>
                    <button
                        onClick={() => setShowVelocityVector(!showVelocityVector)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            showVelocityVector ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title="Toggle Velocity Vector"
                    >
                        <ArrowDown size={11} /> Vel
                    </button>
                    <button
                        onClick={() => setShowTensionVector(!showTensionVector)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            showTensionVector ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title="Toggle Rod Tension Vector"
                    >
                        <Gauge size={11} /> Tension
                    </button>
                    <button
                        onClick={() => setShowStrobeTrail(!showStrobeTrail)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            showStrobeTrail ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title="Toggle Stroboscopic Markers"
                    >
                        <Sparkles size={11} /> Strobe
                    </button>
                    <button
                        onClick={() => setShowAngleArc(!showAngleArc)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            showAngleArc ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title="Toggle Angle Arc (θ)"
                    >
                        <Compass size={11} /> Angle θ
                    </button>
                </div>
            </div>

            {/* ── Main Physics SVG Viewport ── */}
            <div className="flex-1 relative w-full h-full">
                <svg className="absolute inset-0 w-full h-full">
                    <defs>
                        <marker id="pen-vel-arrow" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 9 3, 0 6" fill="#38bdf8" />
                        </marker>
                        <marker id="pen-ten-arrow" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 9 3, 0 6" fill="#34d399" />
                        </marker>
                        <radialGradient id="pen-bob-gradient" cx="35%" cy="35%" r="65%">
                            <stop offset="0%" stopColor="#fef3c7" />
                            <stop offset="35%" stopColor="#fbbf24" />
                            <stop offset="85%" stopColor="#d97706" />
                            <stop offset="100%" stopColor="#b45309" />
                        </radialGradient>
                    </defs>

                    {/* Equilibrium / vertical reference line */}
                    <line
                        x1={pivotX} y1={pivotY - 24}
                        x2={pivotX} y2={pivotY + rodPx + 16}
                        stroke="#334155"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        opacity="0.6"
                    />
                    <text
                        x={pivotX + 8} y={pivotY + rodPx + 14}
                        fill="#64748b"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                    >
                        VERTICAL (θ = 0°)
                    </text>

                    {/* Bob path trace (solid line) */}
                    {showTrace && tracePoints.length > 1 && (
                        <polyline
                            points={tracePoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="1.5"
                            strokeOpacity="0.45"
                        />
                    )}

                    {/* Stroboscopic markers along the arc */}
                    {showStrobeTrail && snapshot.strobeHistory.map((strobe, idx) => {
                        const sX = pivotX + rodPx * Math.sin(strobe.angle * Math.PI / 180);
                        const sY = pivotY + rodPx * Math.cos(strobe.angle * Math.PI / 180);
                        return (
                            <circle
                                key={`pen-strobe-${idx}`}
                                cx={sX}
                                cy={sY}
                                r={bobRadiusPx * 0.4}
                                fill="#a855f7"
                                fillOpacity="0.18"
                                stroke="#a855f7"
                                strokeWidth="1"
                                strokeDasharray="2 2"
                            />
                        );
                    })}

                    {/* Angle arc θ */}
                    {showAngleArc && (
                        <g>
                            <polyline points={angleArc} fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.8" />
                            <text
                                x={pivotX + rodPx * 0.38}
                                y={pivotY + rodPx * 0.28}
                                fill="#38bdf8"
                                fontSize="10"
                                fontWeight="bold"
                                fontFamily="monospace"
                            >
                                θ = {snapshot.angle.toFixed(1)}°
                            </text>
                        </g>
                    )}

                    {/* Rod */}
                    <line
                        x1={pivotX} y1={pivotY}
                        x2={bobX} y2={bobY}
                        stroke="#94a3b8"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />

                    {/* Rod Tension Vector (toward pivot) */}
                    {showTensionVector && tensionArrowLen > 3 && (
                        <g>
                            <line
                                x1={bobX} y1={bobY}
                                x2={bobX + tenDirX * tensionArrowLen}
                                y2={bobY + tenDirY * tensionArrowLen}
                                stroke="#34d399"
                                strokeWidth="2"
                                markerEnd="url(#pen-ten-arrow)"
                            />
                            <text
                                x={bobX + tenDirX * tensionArrowLen + 6}
                                y={bobY + tenDirY * tensionArrowLen}
                                fill="#34d399"
                                fontSize="9"
                                fontWeight="bold"
                                fontFamily="monospace"
                            >
                                T={snapshot.tension.toFixed(1)}N
                            </text>
                        </g>
                    )}

                    {/* Tangential Velocity Vector */}
                    {showVelocityVector && velArrowLen > 3 && (
                        <g>
                            <line
                                x1={bobX} y1={bobY}
                                x2={bobX + velDirX * velArrowLen}
                                y2={bobY + velDirY * velArrowLen}
                                stroke="#38bdf8"
                                strokeWidth="2.5"
                                markerEnd="url(#pen-vel-arrow)"
                            />
                            <g transform={`translate(${bobX + velDirX * (velArrowLen + 12)}, ${bobY + velDirY * (velArrowLen + 12)})`}>
                                <text x="0" y="0" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                                    v={snapshot.speed.toFixed(1)} m/s
                                </text>
                            </g>
                        </g>
                    )}

                    {/* Pivot anchor */}
                    <circle cx={pivotX} cy={pivotY} r="7" fill="#1e293b" stroke="#fbbf24" strokeWidth="2.5" />

                    {/* The Bob */}
                    <g transform={`translate(${bobX}, ${bobY})`}>
                        <circle cx="0" cy="0" r={bobRadiusPx + 5} fill="#fbbf24" opacity="0.15" />
                        <circle
                            cx="0" cy="0"
                            r={bobRadiusPx}
                            fill="url(#pen-bob-gradient)"
                            stroke="#fde68a"
                            strokeWidth="2"
                        />
                        <line x1="-4" y1="0" x2="4" y2="0" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
                        <line x1="0" y1="-4" x2="0" y2="4" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
                        <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold" opacity="0.9">
                            {snapshot.config.mass}kg
                        </text>
                    </g>
                </svg>
            </div>

            {/* ── Collapsible Engineering Information Bars (accordion) ── */}
            <div className="shrink-0 relative z-20">
                {/* ── LIVE TELEMETRY ── */}
                <InfoBar
                    icon={<Activity size={13} />}
                    accent="text-emerald-400"
                    title="Live Telemetry"
                    summary={telemetrySummary}
                    open={openSection === 'telemetry'}
                    onToggle={() => toggleSection('telemetry')}
                    status={
                        <span className={`shrink-0 text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                            snapshot.isResting
                                ? 'bg-slate-700 text-slate-300'
                                : (isPlaying ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' : 'bg-amber-500/20 text-amber-400')
                        }`}>
                            {flightStatus}
                        </span>
                    }
                >
                    <div className="px-5 py-4 border-t border-white/5 max-h-[40vh] overflow-y-auto space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <Stat label="Time (t)" value={snapshot.time.toFixed(2)} unit="s" />
                            <Stat label="Angle (θ)" value={snapshot.angle.toFixed(1)} unit="°" color="text-sky-400" />
                            <Stat label="Ang. Vel (ω)" value={snapshot.omega.toFixed(2)} unit="rad/s" color="text-cyan-400" />
                            <Stat label="Speed (|v|)" value={snapshot.speed.toFixed(2)} unit="m/s" color="text-emerald-400" />
                            <Stat label="Tension (T)" value={snapshot.tension.toFixed(2)} unit="N" color="text-amber-400" />
                            <Stat label="Swings" value={snapshot.swingCount} unit="" />
                        </div>

                        {/* Energy Conservation Bar: PE -> KE */}
                        <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 space-y-1.5">
                            <div className="flex justify-between text-[9px] font-mono">
                                <span className="text-amber-400">PE: {snapshot.energy.potential.toFixed(1)} J</span>
                                <span className="text-emerald-400">KE: {snapshot.energy.kinetic.toFixed(1)} J</span>
                            </div>
                            <div className="h-2 bg-slate-950 rounded-full overflow-hidden flex border border-white/10">
                                <div
                                    className="h-full bg-amber-500 transition-all duration-75"
                                    style={{ width: `${(snapshot.energy.potential / (snapshot.energy.initialTotal || 1)) * 100}%` }}
                                    title="Potential Energy (mgh)"
                                />
                                <div
                                    className="h-full bg-emerald-400 transition-all duration-75"
                                    style={{ width: `${(snapshot.energy.kinetic / (snapshot.energy.initialTotal || 1)) * 100}%` }}
                                    title="Kinetic Energy (½ m L² ω²)"
                                />
                            </div>
                            <div className="flex justify-between text-[9px] font-mono text-slate-400">
                                <span>TOTAL ENERGY (conserved)</span>
                                <span className="text-amber-400 font-bold">{snapshot.energy.total.toFixed(2)} J</span>
                            </div>
                        </div>
                    </div>
                </InfoBar>

                {/* ── EXPERIMENT PARAMETERS ── */}
                <InfoBar
                    icon={<Sliders size={13} />}
                    accent="text-amber-400"
                    title="Experiment Parameters"
                    summary={paramsSummary}
                    open={openSection === 'params'}
                    onToggle={() => toggleSection('params')}
                >
                    <div className="px-5 py-4 border-t border-white/5 max-h-[40vh] overflow-y-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-5">
                            {/* Rod Length L */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-mono">
                                    <span className="text-slate-400">ROD LENGTH (L)</span>
                                    <span className="text-amber-400 font-bold">{length} m</span>
                                </div>
                                <input type="range" min="0.5" max="5.0" step="0.1" value={length}
                                    onChange={(e) => setLength(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                            </div>

                            {/* Initial Release Angle θ0 */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-mono">
                                    <span className="text-slate-400">RELEASE ANGLE (θ₀)</span>
                                    <span className="text-sky-400 font-bold">{angle0}°</span>
                                </div>
                                <input type="range" min="5" max="175" step="1" value={angle0}
                                    onChange={(e) => setAngle0(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500" />
                                <div className="flex justify-between text-[8px] font-mono text-slate-500">
                                    <button onClick={() => setAngle0(10)} className="hover:text-white">10° (SHM)</button>
                                    <button onClick={() => setAngle0(60)} className="hover:text-white">60°</button>
                                    <button onClick={() => setAngle0(150)} className="hover:text-white">150° (nonlinear)</button>
                                </div>
                            </div>

                            {/* Bob Mass m */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-mono">
                                    <span className="text-slate-400">BOB MASS (m)</span>
                                    <span className="text-white font-bold">{mass} kg</span>
                                </div>
                                <input type="range" min="0.5" max="10" step="0.5" value={mass}
                                    onChange={(e) => setMass(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white" />
                                <div className="text-[8px] font-mono text-slate-500">Period is independent of mass (Galileo).</div>
                            </div>

                            {/* Gravity g */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-mono">
                                    <span className="text-slate-400">GRAVITY (g)</span>
                                    <span className="text-amber-400 font-bold">{gravity} m/s²</span>
                                </div>
                                <input type="range" min="0" max="25" step="0.1" value={gravity}
                                    onChange={(e) => { setGravity(parseFloat(e.target.value)); setSelectedPlanet(null); }}
                                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                            </div>

                            {/* Pivot Damping */}
                            <div className="space-y-1 lg:col-span-2">
                                <div className="flex justify-between text-[10px] font-mono">
                                    <span className="text-slate-400">PIVOT DAMPING (friction)</span>
                                    <span className="text-rose-400 font-bold">{damping.toFixed(2)} /s</span>
                                </div>
                                <input type="range" min="0" max="1.0" step="0.05" value={damping}
                                    onChange={(e) => setDamping(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500" />
                                <div className="flex justify-between text-[8px] font-mono text-slate-500">
                                    <span>0.00 (Ideal, perpetual)</span>
                                    <span>0.5 (Weak air drag)</span>
                                    <span>1.0 (Heavy damping)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </InfoBar>

                {/* ── ENGINEERING INSPECTOR ── */}
                <InfoBar
                    icon={<Wrench size={13} />}
                    accent="text-purple-400"
                    title="Engineering Inspector"
                    summary={inspectorSummary}
                    open={openSection === 'inspector'}
                    onToggle={() => toggleSection('inspector')}
                    status={
                        <span className="shrink-0 text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                            Δt {snapshot.config.dt}s
                        </span>
                    }
                >
                    <div className="px-5 py-4 border-t border-white/5 max-h-[40vh] overflow-y-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* System / Solver Info */}
                            <div className="bg-black/40 p-3 rounded-xl border border-white/5 font-mono text-[9px] text-slate-400 space-y-1">
                                <div className="text-purple-400 font-bold text-[10px]">SYSTEM</div>
                                <div>• Object: <span className="text-slate-200">Simple pendulum ({snapshot.config.mass} kg)</span></div>
                                <div>• Rod length: <span className="text-slate-200">L = {snapshot.config.length} m</span></div>
                                <div>• Damping: <span className="text-slate-200">{snapshot.config.damping.toFixed(2)} /s</span></div>
                                <div>• Solver: <span className="text-slate-200">Semi-implicit Euler (8 substeps)</span></div>
                                <div>• Timestep: <span className="text-slate-200">Δt = {snapshot.config.dt}s</span></div>
                                <div>• State: <span className="text-slate-200">{flightStatus}</span></div>
                                <div>• Swings: <span className="text-slate-200">{snapshot.swingCount}</span></div>
                            </div>

                            {/* Analytical Solution */}
                            <div className="bg-black/40 p-3 rounded-xl border border-white/5 font-mono text-[9px] text-slate-400 space-y-1">
                                <div className="text-amber-400 font-bold text-[10px]">ANALYTICAL SOLUTION</div>
                                <div>• Equation: <span className="text-slate-200">θ'' + (g/L)·sin θ = 0</span></div>
                                <div>• Small-angle period: <span className="text-white font-bold">{snapshot.analytics.smallAnglePeriod} s</span></div>
                                <div>• Exact period (elliptic): <span className="text-white font-bold">{snapshot.analytics.exactPeriod} s</span></div>
                                <div>• Max speed (bottom): <span className="text-white font-bold">{snapshot.analytics.speedAtBottom} m/s</span></div>
                                <div>• Max ω (small-angle): <span className="text-white font-bold">{snapshot.analytics.omegaMaxSmallAngle} rad/s</span></div>
                                <div className="text-slate-500">T = 2π√(L/g) · v_max = √(2gL(1−cosθ₀))</div>
                            </div>

                            {/* Numerical Validation */}
                            <div className="bg-black/40 p-3 rounded-xl border border-white/5 font-mono text-[9px] text-slate-400 space-y-1">
                                <div className="text-emerald-400 font-bold text-[10px]">NUMERICAL VALIDATION</div>
                                <div>• Engine vs reference Δθ: <span className="text-slate-200">{snapshot.validation.angleErrorDeg}°</span></div>
                                <div>• Energy drift: <span className={`font-bold ${Math.abs(snapshot.validation.energyDriftPercent) < 0.5 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {snapshot.validation.energyDriftPercent}%
                                </span></div>
                                <div>• Initial energy E₀: <span className="text-slate-200">{snapshot.energy.initialTotal} J</span></div>
                                <div className="text-slate-500">Reference runs at 0.5 ms resolution; drift ~0 confirms energy conservation.</div>
                            </div>
                        </div>

                        {/* Educational explanation */}
                        <div className="mt-4 bg-black/40 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 mb-1.5">
                                <BookOpen size={12} className="text-purple-400" />
                                <span className="text-[10px] font-bold tracking-widest text-slate-300 uppercase">Why it oscillates</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 font-mono text-[9px] text-slate-400">
                                <div className="text-amber-400 font-bold">NEWTON'S 2ND LAW (rotation)</div>
                                <div className="text-sky-400 font-bold">SMALL-ANGLE SHM</div>
                                <div>τ = I·α → -m g L·sinθ = m L²·θ''</div>
                                <div>θ ≈ θ₀·cos(√(g/L)·t) for θ₀ &lt; 10°</div>
                                <div>θ'' + (g/L)·sin θ = 0 (exact)</div>
                                <div>ω² = g/L · T = 2π/ω</div>
                            </div>
                            <div className="mt-2 text-[9px] text-slate-500 font-mono">
                                Gravity's torque pulls the bob toward the vertical; inertia carries it past, converting KE back to PE. The exact period grows with amplitude (elliptic integral) — a hallmark of nonlinear dynamics.
                            </div>
                        </div>
                    </div>
                </InfoBar>
            </div>

            {/* ── Bottom Laboratory Timeline & Playback Control Bar ── */}
            <div className="h-16 bg-slate-950/95 border-t border-white/10 backdrop-blur-3xl px-6 flex items-center justify-between z-30 shrink-0">
                {/* Primary Playback Action Cluster */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleReset}
                        className="p-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer bg-white/5 hover:bg-white/10 rounded-xl"
                        title="Reset Experiment"
                    >
                        <RefreshCw size={15} />
                    </button>

                    <button
                        onClick={togglePlayback}
                        className={`h-10 px-6 rounded-xl flex items-center justify-center font-bold tracking-wider uppercase text-xs transition-all cursor-pointer shadow-lg ${
                            isPlaying
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                                : 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/30'
                        }`}
                    >
                        {isPlaying ? (
                            <><Square size={13} fill="currentColor" className="mr-2" /> PAUSE</>
                        ) : snapshot.isResting ? (
                            <><RefreshCw size={13} className="mr-2" /> RE-SWING</>
                        ) : (
                            <><Play size={15} fill="currentColor" className="mr-2" /> RUN PENDULUM</>
                        )}
                    </button>

                    <button
                        onClick={handleStepForward}
                        disabled={isPlaying}
                        className="p-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer bg-white/5 hover:bg-white/10 rounded-xl disabled:opacity-30"
                        title="Step Forward (0.016s)"
                    >
                        <SkipForward size={15} />
                    </button>
                </div>

                {/* Simulation Speed Selector */}
                <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-white/10">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Speed</span>
                    {[0.25, 0.5, 1.0, 2.0].map(speed => (
                        <button
                            key={speed}
                            onClick={() => setTimeScale(speed)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                timeScale === speed ? 'bg-sky-500 text-white' : 'text-slate-500 hover:text-white'
                            }`}
                        >
                            {speed}x
                        </button>
                    ))}
                </div>

                {/* Oscillation Progress */}
                <div className="flex items-center gap-4 min-w-72">
                    <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-slate-400 font-bold">OSCILLATION PERIOD</span>
                            <span className="text-amber-400">
                                {snapshot.analytics.smallAnglePeriod} s
                            </span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                            <div
                                className="h-full bg-gradient-to-r from-sky-500 to-amber-400 transition-all duration-75"
                                style={{
                                    width: `${Math.min(100, Math.max(0, 50 - (snapshot.angle / 180) * 50))}%`
                                }}
                            />
                        </div>
                    </div>

                    <div className="text-right font-mono">
                        <div className="text-xs font-bold text-white">θ = {snapshot.angle.toFixed(1)}°</div>
                        <div className="text-[9px] text-slate-500">{snapshot.swingCount} Swings</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
