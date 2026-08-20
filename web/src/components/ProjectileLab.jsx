import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Play, Square, RefreshCw, SkipForward, Gauge,
    Sparkles, ArrowDown, ChevronDown, Crosshair,
    Compass, TrendingUp, Layers
} from 'lucide-react';
import useStore from '../store/useStore';
import ProjectilePhysicsSolver from '../utils/solvers/projectileSolver';

export default function ProjectileLab() {
    const isPlaying = useStore(state => state.isPlaying);
    const togglePlayback = useStore(state => state.togglePlayback);
    const resetPlayback = useStore(state => state.resetPlayback);
    const setLabData = useStore(state => state.setLabData);
    const clearLabData = useStore(state => state.clearLabData);

    // Initial laboratory configuration (Section 25 defaults)
    const [v0, setV0] = useState(20.0);          // initial velocity m/s
    const [angle, setAngle] = useState(45.0);    // launch angle degrees
    const [y0, setY0] = useState(0.0);           // launch height m
    const [gravity, setGravity] = useState(9.81);
    const [timeScale, setTimeScale] = useState(1.0);

    // Visual overlay toggles (canvas layers only — the sim stays the hero)
    const [showTrajectory, setShowTrajectory] = useState(true);
    const [showPredicted, setShowPredicted] = useState(true);
    const [showVelocityVector, setShowVelocityVector] = useState(true);
    const [showComponents, setShowComponents] = useState(true);
    const [showGravityVector, setShowGravityVector] = useState(true);
    const [cameraMode, setCameraMode] = useState('fit'); // 'fit' | 'follow'

    // Physics solver instance (stable state holder, mutated externally by the loop)
    const [solver] = useState(() => new ProjectilePhysicsSolver({
        v0: 20.0, angle: 45.0, y0: 0.0, gravity: 9.81, timeScale: 1.0
    }));

    // Always-on engineering measurements (height / range / max-height markers)
    const showHeightIndicator = true;
    const showRangeIndicator = true;
    const showMaxHeightMarker = true;

    const [snapshot, setSnapshot] = useState(solver.getSnapshot());

    // Push lab data to store for Properties panel
    useEffect(() => {
        setLabData({
            type: 'projectile_motion',
            title: 'Projectile Motion Laboratory',
            snapshot: snapshot,
            config: { v0, angle, y0, gravity, timeScale }
        });
        return () => clearLabData();
    }, [snapshot, v0, angle, y0, gravity, timeScale]);

    const reqRef = useRef(null);
    const lastTimeRef = useRef(0);

    // Listen for config changes from Properties panel
    useEffect(() => {
        const handleConfigChange = (event) => {
            const { type, key, value } = event.detail
            if (type !== 'projectile_motion') return
            if (key === 'v0') setV0(value)
            else if (key === 'angle') setAngle(value)
            else if (key === 'y0') setY0(value)
            else if (key === 'gravity') setGravity(value)
            else if (key === 'timeScale') setTimeScale(value)
        }
        window.addEventListener('lab-config-change', handleConfigChange)
        return () => window.removeEventListener('lab-config-change', handleConfigChange)
    }, [])

    // Update solver when configuration changes
    useEffect(() => {
        solver.updateConfig({ v0, angle, y0, gravity, timeScale });
        setSnapshot(solver.getSnapshot());
    }, [v0, angle, y0, gravity, timeScale, solver]);

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
            simulationType: 'ProjectileMotionExperiment',
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

    // ── Camera: auto-frame the full experiment (Section 31) ──
    // Compute world-space bounding box of the entire trajectory
    const cameraView = useMemo(() => {
        const { x0, y0, yGround } = snapshot.config;
        const a = snapshot.analytics;
        const T = Math.min(
            Number.isFinite(a.timeOfFlight) ? a.timeOfFlight : 5.0,
            5.0
        );
        const v0x = a.v0x;
        const xMax = x0 + v0x * T;
        const yMax = Number.isFinite(a.maxHeight) ? Math.max(a.maxHeight, y0, yGround + 1) : (y0 + 5);

        const worldMinX = Math.min(x0, xMax);
        const worldMaxX = Math.max(x0, xMax);
        const worldMinY = Math.min(y0, yGround);
        const worldMaxY = Math.max(yMax, y0, yGround);

        // Padding
        const spanX = Math.max(1, worldMaxX - worldMinX);
        const spanY = Math.max(1, worldMaxY - worldMinY);
        const padX = spanX * 0.15;
        const padY = spanY * 0.25;
        const left = worldMinX - padX;
        const right = worldMaxX + padX;
        const top = worldMaxY + padY;
        const bottom = Math.min(worldMinY, yGround) - padY;

        const availW = Math.max(200, viewSize.width - 40);
        const availH = Math.max(150, viewSize.height - 60);
        const scale = Math.min(availW / (right - left), availH / (top - bottom));

        const px = (wx) => (wx - left) * scale + 20;
        const py = (wy) => (top - wy) * scale + 10;

        return { px, py, scale, left, right, top, bottom, worldMinX, worldMaxX, worldMinY, worldMaxY, spanX, spanY };
    }, [viewSize, snapshot]);

    const { px, py } = cameraView;

    // Ground pixel coordinate
    const groundPY = py(snapshot.groundY);
    const launchP = { x: px(snapshot.config.x0), y: py(snapshot.config.y0) };

    // Projectile current position
    const proj = { x: px(snapshot.x), y: py(snapshot.y) };

    // Launch velocity vector pixel length (uniform scale so direction is never distorted)
    const v0Mag = Math.hypot(snapshot.analytics.v0x, snapshot.analytics.v0y) || 1;
    const velScale = Math.min(6.5, Math.max(2.5, 120 / v0Mag)); // px per (m/s)
    const v0Len = v0Mag * velScale;
    const thetaRad = snapshot.config.angle * Math.PI / 180;

    // Velocity vector (tangent, rotates with flight) — uniform component scale
    const vxLen = snapshot.vx * velScale;
    const vyLen = snapshot.vy * velScale;
    const velLen = Math.hypot(vxLen, vyLen);

    // Gravity vector (constant, always downward)
    const gLen = Math.max(0.5, Math.min(snapshot.config.gravity * velScale, 90));

    // Range / landing markers
    const landingP = snapshot.isLanded && snapshot.landingInfo
        ? { x: px(snapshot.config.x0 + snapshot.landingInfo.range), y: groundPY }
        : null;

    // Max height marker
    const apexP = snapshot.apexPoint ? { x: px(snapshot.apexPoint.x), y: py(snapshot.apexPoint.y) } : null;

    // Predicted trajectory polyline
    const predictedPoly = snapshot.predictedPath
        .filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.y))
        .map(p => `${px(p.x)},${py(p.y)}`).join(' ');
    const actualPoly = snapshot.actualPath
        .filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.y))
        .map(p => `${px(p.x)},${py(p.y)}`).join(' ');

    // Strobe markers
    const strobes = snapshot.strobeHistory.map(s => ({ x: px(s.x), y: py(s.y), t: s.time }));

    // Height indicator (projectile to ground)
    const heightY = Math.max(proj.y, groundPY);

    // Ball radius in px
    const ballR = Math.max(7, Math.min(16, viewSize.width * 0.012));

    // Camera follow mode
    let camOffsetX = 0, camOffsetY = 0;
    if (cameraMode === 'follow') {
        camOffsetX = (proj.x - viewSize.width / 2);
        camOffsetY = (proj.y - viewSize.height / 2.5);
    }

    const wrap = (x, y) => ({ x: x - camOffsetX, y: y - camOffsetY });

    return (
        <div ref={containerRef} className="relative w-full h-full bg-[#0a0f1a] overflow-hidden select-none font-sans flex flex-col">
            {/* ── Background Grid & Atmosphere ── */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(56,189,248,0.12),rgba(255,255,255,0))] pointer-events-none" />
            <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            {/* ── Top Floating Header: Status & Layer Toggles ── */}
            <div className="absolute top-4 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-3 pointer-events-auto">
                    <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-amber-500/30 shadow-lg shadow-amber-500/10">
                        <Compass size={14} className="text-amber-400 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Projectile Motion Laboratory</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                            {snapshot.config.angle.toFixed(0)}° / {snapshot.config.v0.toFixed(0)} m/s
                        </span>
                    </div>

                    {/* Camera Mode Selector */}
                    <div className="flex bg-slate-900/80 backdrop-blur-md p-0.5 rounded-xl border border-white/10">
                        <button
                            onClick={() => setCameraMode('fit')}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                                cameraMode === 'fit' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                            title="Fit entire trajectory"
                        >
                            <Layers /> Fit View
                        </button>
                        <button
                            onClick={() => setCameraMode('follow')}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1 ${
                                cameraMode === 'follow' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                            title="Follow projectile"
                        >
                            <Crosshair size={11} /> Follow
                        </button>
                    </div>
                </div>

                {/* Visual Layer Toggles */}
                <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-white/10 pointer-events-auto">
                    <button onClick={() => setShowTrajectory(!showTrajectory)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${showTrajectory ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'}`}>
                        <TrendingUp size={11} /> Trajectory
                    </button>
                    <button onClick={() => setShowPredicted(!showPredicted)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${showPredicted ? 'bg-white/20 text-slate-200 border border-white/30' : 'text-slate-500 hover:text-slate-300'}`}>
                        <Sparkles size={11} /> Predicted
                    </button>
                    <button onClick={() => setShowVelocityVector(!showVelocityVector)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${showVelocityVector ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'}`}>
                        <Gauge size={11} /> Vel
                    </button>
                    <button onClick={() => setShowComponents(!showComponents)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${showComponents ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300'}`}>
                        <Compass size={11} /> Vx/Vy
                    </button>
                    <button onClick={() => setShowGravityVector(!showGravityVector)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${showGravityVector ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'}`}>
                        <ArrowDown size={11} /> g
                    </button>
                </div>
            </div>

            {/* ── Main High-Precision Physics SVG Viewport (the hero — no overlay cards) ── */}
            <div className="flex-1 relative w-full h-full overflow-hidden">
                <svg className="absolute inset-0 w-full h-full" style={{ width: viewSize.width, height: viewSize.height }}>
                    <defs>
                        <marker id="vel-arrow" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 9 3, 0 6" fill="#38bdf8" />
                        </marker>
                        <marker id="grav-arrow" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 9 3, 0 6" fill="#f59e0b" />
                        </marker>
                        <marker id="vx-arrow" markerWidth="8" markerHeight="5" refX="7" refY="2.5" orient="auto">
                            <polygon points="0 0, 8 2.5, 0 5" fill="#34d399" />
                        </marker>
                        <marker id="vy-arrow" markerWidth="8" markerHeight="5" refX="7" refY="2.5" orient="auto">
                            <polygon points="0 0, 8 2.5, 0 5" fill="#fb7185" />
                        </marker>
                        <radialGradient id="proj-gradient" cx="35%" cy="35%" r="65%">
                            <stop offset="0%" stopColor="#fde68a" />
                            <stop offset="40%" stopColor="#f59e0b" />
                            <stop offset="85%" stopColor="#d97706" />
                            <stop offset="100%" stopColor="#b45309" />
                        </radialGradient>
                        <pattern id="ground-hatch" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                            <line x1="0" y1="0" x2="0" y2="16" stroke="#334155" strokeWidth="2.5" />
                        </pattern>
                    </defs>

                    {/* ── Predicted (theoretical) trajectory — dashed preview ── */}
                    {showPredicted && showTrajectory && (
                        <polyline
                            points={predictedPoly}
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="1.5"
                            strokeDasharray="6 5"
                            opacity="0.7"
                        />
                    )}

                    {/* ── Ground Reference Surface ── */}
                    <g>
                        <rect
                            x={0}
                            y={groundPY}
                            width={viewSize.width}
                            height={viewSize.height - groundPY}
                            fill="url(#ground-hatch)"
                            stroke="#475569"
                            strokeWidth="1"
                        />
                        <line
                            x1={0}
                            y1={groundPY}
                            x2={viewSize.width}
                            y2={groundPY}
                            stroke="#94a3b8"
                            strokeWidth="3"
                        />
                        <text x={20} y={groundPY + 22} fill="#64748b" fontSize="10" fontWeight="bold" letterSpacing="0.1em">
                            GROUND LEVEL (y = {snapshot.groundY.toFixed(1)} m)
                        </text>
                    </g>

                    {/* ── Launch Point Marker ── */}
                    <g transform={`translate(${wrap(launchP.x, launchP.y).x}, ${wrap(launchP.x, launchP.y).y})`}>
                        <circle cx="0" cy="0" r="5" fill="none" stroke="#f59e0b" strokeWidth="2" />
                        <circle cx="0" cy="0" r="2" fill="#f59e0b" />
                        <text x="10" y="-6" fill="#fbbf24" fontSize="10" fontWeight="bold" fontFamily="monospace">
                            LAUNCH (x₀={snapshot.config.x0.toFixed(1)}, y₀={snapshot.config.y0.toFixed(1)})
                        </text>
                    </g>

                    {/* ── Initial Velocity Vector at Launch ── */}
                    {showVelocityVector && !snapshot.isLanded && snapshot.time < 0.01 && (
                        <g transform={`translate(${launchP.x}, ${launchP.y})`}>
                            <line
                                x1={0}
                                y1={0}
                                x2={Math.cos(thetaRad) * v0Len}
                                y2={-Math.sin(thetaRad) * v0Len}
                                stroke="#38bdf8"
                                strokeWidth="3"
                                markerEnd="url(#vel-arrow)"
                            />
                            <text
                                x={Math.cos(thetaRad) * v0Len * 0.6}
                                y={-Math.sin(thetaRad) * v0Len * 0.6 - 6}
                                fill="#38bdf8"
                                fontSize="11"
                                fontWeight="bold"
                                fontFamily="monospace"
                            >
                                v₀={snapshot.config.v0.toFixed(1)} m/s
                            </text>
                        </g>
                    )}

                    {/* ── Velocity Components at Launch (educational) ── */}
                    {showComponents && snapshot.time < 0.01 && (
                        <g transform={`translate(${launchP.x}, ${launchP.y})`}>
                            {/* Vx horizontal */}
                            <line x1={0} y1={0} x2={snapshot.analytics.v0x * velScale} y2={0} stroke="#34d399" strokeWidth="2" markerEnd="url(#vx-arrow)" />
                            {/* Vy vertical */}
                            <line x1={0} y1={0} x2={0} y2={-snapshot.analytics.v0y * velScale} stroke="#fb7185" strokeWidth="2" markerEnd="url(#vy-arrow)" />
                            <text x={snapshot.analytics.v0x * velScale * 0.5} y={-6} fill="#34d399" fontSize="10" fontFamily="monospace" fontWeight="bold">
                                Vx={snapshot.analytics.v0x.toFixed(1)}
                            </text>
                            <text x={10} y={-snapshot.analytics.v0y * velScale * 0.6} fill="#fb7185" fontSize="10" fontFamily="monospace" fontWeight="bold">
                                Vy={snapshot.analytics.v0y.toFixed(1)}
                            </text>
                        </g>
                    )}

                    {/* ── Actual Traversed Trail (solid) + Strobe Markers ── */}
                    {showTrajectory && snapshot.actualPath.length > 1 && (
                        <polyline
                            points={actualPoly}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="3"
                            strokeLinecap="round"
                            opacity="0.95"
                        />
                    )}

                    {showTrajectory && strobes.map((s, i) => (
                        <g key={`strobe-${i}`} transform={`translate(${wrap(s.x, s.y).x}, ${wrap(s.x, s.y).y})`}>
                            <circle cx="0" cy="0" r={ballR * 0.4} fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2" />
                            <text x={8} y={-6} fill="#64748b" fontSize="8" fontFamily="monospace">
                                t={s.t.toFixed(2)}s
                            </text>
                        </g>
                    ))}

                    {/* ── Height Indicator (projectile → ground) ── */}
                    {showHeightIndicator && !snapshot.isLanded && (
                        <g>
                            <line x1={proj.x} y1={proj.y} x2={proj.x} y2={heightY} stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 3" />
                            <text x={proj.x + 8} y={(proj.y + heightY) / 2} fill="#fb7185" fontSize="10" fontWeight="bold" fontFamily="monospace">
                                h = {snapshot.height.toFixed(2)} m
                            </text>
                        </g>
                    )}

                    {/* ── Range Indicator (after landing) ── */}
                    {showRangeIndicator && snapshot.isLanded && landingP && (
                        <g>
                            <line x1={launchP.x} y1={groundPY + 14} x2={landingP.x} y2={groundPY + 14} stroke="#22c55e" strokeWidth="2" />
                            <line x1={launchP.x} y1={groundPY - 4} x2={launchP.x} y2={groundPY + 30} stroke="#22c55e" strokeWidth="1.5" />
                            <line x1={landingP.x} y1={groundPY - 4} x2={landingP.x} y2={groundPY + 30} stroke="#22c55e" strokeWidth="1.5" />
                            <text x={(launchP.x + landingP.x) / 2} y={groundPY + 44} fill="#22c55e" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                                RANGE = {snapshot.landingInfo.range.toFixed(2)} m
                            </text>
                        </g>
                    )}

                    {/* ── Landing Point Marker ── */}
                    {snapshot.isLanded && landingP && (
                        <g transform={`translate(${landingP.x}, ${landingP.y})`}>
                            <circle cx="0" cy="0" r="5" fill="none" stroke="#22c55e" strokeWidth="2" />
                            <circle cx="0" cy="0" r="2" fill="#22c55e" />
                            <text x={8} y={-6} fill="#22c55e" fontSize="10" fontWeight="bold" fontFamily="monospace">
                                LANDING (x={snapshot.landingInfo.range.toFixed(2)})
                            </text>
                        </g>
                    )}

                    {/* ── Maximum Height Marker ── */}
                    {showMaxHeightMarker && snapshot.apexReached && apexP && (
                        <g transform={`translate(${wrap(apexP.x, apexP.y).x}, ${wrap(apexP.x, apexP.y).y})`}>
                            <line x1={-16} y1={0} x2={16} y2={0} stroke="#a855f7" strokeWidth="2" />
                            <circle cx="0" cy="0" r="4" fill="none" stroke="#a855f7" strokeWidth="2" />
                            <circle cx="0" cy="0" r="1.5" fill="#a855f7" />
                            <text x={20} y={-8} fill="#c084fc" fontSize="10" fontWeight="bold" fontFamily="monospace">
                                MAX HEIGHT H = {(snapshot.apexPoint.y - snapshot.groundY).toFixed(2)} m
                            </text>
                            <text x={20} y={6} fill="#34d399" fontSize="9" fontFamily="monospace">
                                Vy = 0 m/s · Vx = {snapshot.analytics.v0x.toFixed(2)} m/s
                            </text>
                        </g>
                    )}

                    {/* ── Velocity Vector (tangent, rotates during flight) ── */}
                    {showVelocityVector && snapshot.time >= 0.01 && velLen > 2 && (
                        <g transform={`translate(${wrap(proj.x, proj.y).x}, ${wrap(proj.x, proj.y).y})`}>
                            <line x1={0} y1={0} x2={vxLen} y2={vyLen} stroke="#38bdf8" strokeWidth="2.5" markerEnd="url(#vel-arrow)" />
                            <g transform={`translate(${vxLen * 0.5 + 6}, ${vyLen * 0.5 - 12})`}>
                                <rect x="0" y="-9" width="88" height="18" rx="4" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1" opacity="0.95" />
                                <text x="44" y="3.5" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                                    v={snapshot.speed.toFixed(1)} m/s
                                </text>
                            </g>
                        </g>
                    )}

                    {/* ── Velocity Components Vx (const) / Vy (changing) ── */}
                    {showComponents && snapshot.time >= 0.01 && (
                        <g transform={`translate(${wrap(proj.x, proj.y).x}, ${wrap(proj.x, proj.y).y})`}>
                            <line x1={0} y1={0} x2={vxLen} y2={0} stroke="#34d399" strokeWidth="2" markerEnd="url(#vx-arrow)" />
                            <line x1={0} y1={0} x2={0} y2={vyLen} stroke="#fb7185" strokeWidth="2" markerEnd="url(#vy-arrow)" />
                            <text x={vxLen * 0.5} y={-6} fill="#34d399" fontSize="10" fontFamily="monospace" fontWeight="bold">
                                Vx={snapshot.vx.toFixed(1)}
                            </text>
                            <text x={10} y={vyLen * 0.6} fill="#fb7185" fontSize="10" fontFamily="monospace" fontWeight="bold">
                                Vy={snapshot.vy.toFixed(1)}
                            </text>
                        </g>
                    )}

                    {/* ── Gravity / Acceleration Vector (always downward, never rotates) ── */}
                    {showGravityVector && (
                        <g transform={`translate(${wrap(proj.x + 30, proj.y - 20).x}, ${wrap(proj.x + 30, proj.y - 20).y})`}>
                            <line x1="0" y1="0" x2="0" y2={gLen} stroke="#f59e0b" strokeWidth="2" markerEnd="url(#grav-arrow)" />
                            <g transform={`translate(8, ${gLen / 2})`}>
                                <rect x="0" y="-8" width="72" height="16" rx="3" fill="#451a03" stroke="#f59e0b" strokeWidth="0.8" opacity="0.95" />
                                <text x="36" y="3.5" textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="bold" fontFamily="monospace">
                                    g={snapshot.config.gravity.toFixed(2)} m/s²
                                </text>
                            </g>
                        </g>
                    )}

                    {/* ── The Projectile Body ── */}
                    {!snapshot.isLanded && (
                        <g transform={`translate(${wrap(proj.x, proj.y).x}, ${wrap(proj.x, proj.y).y})`}>
                            <circle cx="0" cy="0" r={ballR + 4} fill="#f59e0b" opacity="0.15" />
                            <circle cx="0" cy="0" r={ballR} fill="url(#proj-gradient)" stroke="#fde68a" strokeWidth="2" />
                            <line x1={-3} y1="0" x2={3} y2="0" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
                            <line x1="0" y1={-3} x2="0" y2={3} stroke="#ffffff" strokeWidth="1" opacity="0.7" />
                            <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold" opacity="0.85">
                                {snapshot.config.mass}kg
                            </text>
                        </g>
                    )}

                    {/* ── Dynamic Drop Shadow on Ground ── */}
                    {!snapshot.isLanded && (() => {
                        const prox = Math.max(0.1, 1 - (snapshot.height / Math.max(1, Number.isFinite(snapshot.analytics.maxHeight) ? snapshot.analytics.maxHeight : 10)));
                        return (
                            <ellipse cx={wrap(proj.x, proj.y).x} cy={groundPY} rx={ballR * (0.7 + prox * 0.8)} ry={4 + prox * 5} fill="#f59e0b" opacity={0.15 + prox * 0.5} />
                        );
                    })()}
                </svg>
            </div>

            {/* ── Bottom Laboratory Timeline & Playback Control Bar ── */}
            <div className="h-16 bg-slate-950/95 border-t border-white/10 backdrop-blur-3xl px-6 flex items-center justify-between z-30 shrink-0">
                {/* Primary Playback Action Cluster */}
                <div className="flex items-center gap-3">
                    <button onClick={handleReset}
                        className="p-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer bg-white/5 hover:bg-white/10 rounded-xl"
                        title="Reset Experiment">
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
                        ) : snapshot.isLanded ? (
                            <><RefreshCw size={13} className="mr-2" /> RE-LAUNCH</>
                        ) : (
                            <><Play size={15} fill="currentColor" className="mr-2" /> LAUNCH</>
                        )}
                    </button>

                    <button onClick={handleStepForward} disabled={isPlaying}
                        className="p-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer bg-white/5 hover:bg-white/10 rounded-xl disabled:opacity-30"
                        title="Step Forward (0.016s)">
                        <SkipForward size={15} />
                    </button>
                </div>

                {/* Simulation Speed Selector */}
                <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-white/10">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Speed</span>
                    {[0.25, 0.5, 1.0, 2.0].map(speed => (
                        <button key={speed} onClick={() => setTimeScale(speed)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${timeScale === speed ? 'bg-amber-500 text-white' : 'text-slate-500 hover:text-white'}`}>
                            {speed}x
                        </button>
                    ))}
                </div>

                {/* Flight Progress Summary */}
                <div className="flex items-center gap-4 min-w-80">
                    <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-slate-400 font-bold">FLIGHT PROGRESS</span>
                            <span className="text-amber-400">
                                {Number.isFinite(snapshot.analytics.timeOfFlight) && snapshot.analytics.timeOfFlight > 0
                                    ? Math.min(100, (snapshot.time / snapshot.analytics.timeOfFlight) * 100).toFixed(0)
                                    : 0}%
                            </span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                            <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-75"
                                style={{ width: `${Number.isFinite(snapshot.analytics.timeOfFlight) && snapshot.analytics.timeOfFlight > 0 ? Math.min(100, (snapshot.time / snapshot.analytics.timeOfFlight) * 100) : 0}%` }} />
                        </div>
                    </div>

                    <div className="text-right font-mono">
                        <div className="text-xs font-bold text-white">t = {snapshot.time.toFixed(2)}s</div>
                        <div className="text-[9px] text-slate-500">
                            {snapshot.isLanded
                                ? `R = ${snapshot.landingInfo.range.toFixed(1)}m · T = ${snapshot.landingInfo.time.toFixed(2)}s`
                                : `H = ${Number.isFinite(snapshot.analytics.maxHeight) ? snapshot.analytics.maxHeight.toFixed(1) : '∞'}m`}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
