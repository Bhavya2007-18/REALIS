import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Play, Square, RefreshCw, SkipForward, Globe, Layers,
    Sparkles, ArrowDown, Activity
} from 'lucide-react';
import useStore from '../store/useStore';
import FreeFallPhysicsSolver, { PLANETARY_GRAVITY } from '../utils/solvers/freeFallSolver';

export default function FreeFallLab() {
    const isPlaying = useStore(state => state.isPlaying);
    const togglePlayback = useStore(state => state.togglePlayback);
    const resetPlayback = useStore(state => state.resetPlayback);
    const setLabData = useStore(state => state.setLabData);
    const clearLabData = useStore(state => state.clearLabData);

    // Initial laboratory configuration
    const [initialHeight, setInitialHeight] = useState(100.0); // meters
    const [selectedPlanet, setSelectedPlanet] = useState('earth');
    const [restitution, setRestitution] = useState(0.45);
    const [mass, setMass] = useState(10.0); // kg
    const [timeScale, setTimeScale] = useState(1.0);

    // Visual overlay toggles (canvas layers only — the sim stays the hero)
    const [showRuler, setShowRuler] = useState(true);
    const [showVelocityVector, setShowVelocityVector] = useState(true);
    const [showGravityVector, setShowGravityVector] = useState(true);
    const [showStrobeTrail, setShowStrobeTrail] = useState(true);

    // Physics solver instance ref
    const solverRef = useRef(new FreeFallPhysicsSolver({
        initialHeight: 100.0,
        gravity: PLANETARY_GRAVITY.earth.g,
        restitution: 0.45,
        mass: 10.0,
        timeScale: 1.0
    }));

    const [snapshot, setSnapshot] = useState(solverRef.current.getSnapshot());
    
    // Push lab data to store for Properties panel
    useEffect(() => {
        setLabData({
            type: 'free_fall',
            title: 'Free-Fall Physics Laboratory',
            snapshot: snapshot,
            config: {
                initialHeight,
                selectedPlanet,
                restitution,
                mass,
                timeScale
            }
        });
        return () => clearLabData();
    }, [snapshot, initialHeight, selectedPlanet, restitution, mass, timeScale]);

    // Listen for config changes from Properties panel
    useEffect(() => {
        const handleConfigChange = (event) => {
            const { type, key, value } = event.detail
            if (type !== 'free_fall') return
            if (key === 'initialHeight') setInitialHeight(value)
            else if (key === 'restitution') setRestitution(value)
            else if (key === 'mass') setMass(value)
            else if (key === 'selectedPlanet') setSelectedPlanet(value)
            else if (key === 'timeScale') setTimeScale(value)
        }
        window.addEventListener('lab-config-change', handleConfigChange)
        return () => window.removeEventListener('lab-config-change', handleConfigChange)
    }, [])

    const [impactFlash, setImpactFlash] = useState(false);
    const prevBounceCount = useRef(0);
    const reqRef = useRef(null);
    const lastTimeRef = useRef(0);

    // Update solver when configuration changes
    useEffect(() => {
        solverRef.current.updateConfig({
            initialHeight,
            gravity: PLANETARY_GRAVITY[selectedPlanet]?.g ?? 9.81,
            restitution,
            mass,
            timeScale
        });
        setSnapshot(solverRef.current.getSnapshot());
    }, [initialHeight, selectedPlanet, restitution, mass, timeScale]);

    // Handle Reset
    const handleReset = () => {
        resetPlayback();
        solverRef.current.reset();
        prevBounceCount.current = 0;
        setSnapshot(solverRef.current.getSnapshot());
    };

    // Single step forward
    const handleStepForward = () => {
        if (!isPlaying) {
            const nextSnap = solverRef.current.step(0.016);
            setSnapshot({ ...nextSnap });
        }
    };

    // Main 60 FPS physics animation loop
    useEffect(() => {
        if (!isPlaying) {
            cancelAnimationFrame(reqRef.current);
            return;
        }

        lastTimeRef.current = performance.now();

        const loop = (now) => {
            const elapsed = Math.min((now - lastTimeRef.current) / 1000, 0.05);
            lastTimeRef.current = now;

            const nextSnap = solverRef.current.step(elapsed);
            setSnapshot({ ...nextSnap });

            // Detect impact event for ground shockwave animation
            if (nextSnap.bounceCount > prevBounceCount.current) {
                prevBounceCount.current = nextSnap.bounceCount;
                setImpactFlash(true);
                setTimeout(() => setImpactFlash(false), 300);
            }

            reqRef.current = requestAnimationFrame(loop);
        };

        reqRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(reqRef.current);
    }, [isPlaying]);

    // Sync AI query window hook
    useEffect(() => {
        window.REALIS_AI_QUERY = () => ({
            simulationType: 'FreeFallExperiment',
            ...snapshot
        });
        return () => {
            delete window.REALIS_AI_QUERY;
        };
    }, [snapshot]);

    // Viewport dimensions & dynamic metric coordinate transformation
    const containerRef = useRef(null);
    const [viewSize, setViewSize] = useState({ width: 800, height: 600 });

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setViewSize({
                    width: containerRef.current.clientWidth || 800,
                    height: containerRef.current.clientHeight || 600
                });
            }
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Metric to Pixel projection
    // Ground reference is at bottom (viewSize.height - 110px)
    // Top height (initialHeight) is at (viewSize.height - 110px - availablePixelHeight)
    const marginY = 80;
    const groundPixelY = Math.max(200, viewSize.height - 110);
    const topPixelY = marginY;
    const usableHeightPixels = Math.max(100, groundPixelY - topPixelY);

    // Position of object in pixels
    const maxH = Math.max(1, snapshot.config.initialHeight);
    const heightRatio = Math.max(0, Math.min(1, snapshot.height / maxH));
    const ballPixelY = groundPixelY - (heightRatio * usableHeightPixels);
    const ballPixelX = viewSize.width / 2; // centered drop column

    const ballRadiusPixels = Math.max(12, Math.min(26, usableHeightPixels * 0.035));

    // Dynamic Velocity Vector length
    const maxTheoreticalVel = snapshot.theoretical.impactVelocity || 45;
    const velMagnitude = Math.abs(snapshot.velocity);
    const velFraction = Math.min(1.5, velMagnitude / (maxTheoreticalVel || 1));
    const velArrowLength = Math.max(0, velFraction * (usableHeightPixels * 0.28));

    // Constant Gravity Vector length
    const gravArrowLength = 48; // pixels

    // Major ruler tick intervals (10m, 20m, 50m depending on height)
    const tickInterval = initialHeight > 150 ? 25 : (initialHeight > 60 ? 10 : 5);
    const rulerTicks = useMemo(() => {
        const ticks = [];
        for (let h = 0; h <= initialHeight; h += tickInterval) {
            ticks.push(h);
        }
        if (!ticks.includes(initialHeight)) {
            ticks.push(initialHeight);
        }
        return ticks;
    }, [initialHeight, tickInterval]);

    return (
        <div ref={containerRef} className="relative w-full h-full bg-[#0a0f1a] overflow-hidden select-none font-sans flex flex-col">
            {/* ── Background Grid & Elevation Gradients ── */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(56,189,248,0.12),rgba(255,255,255,0))] pointer-events-none" />
            <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            {/* ── Top Floating Header: Preset Status & Quick Planet Selector ── */}
            <div className="absolute top-4 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-3 pointer-events-auto">
                    <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-sky-500/30 shadow-lg shadow-sky-500/10">
                        <Activity size={14} className="text-sky-400 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Free-Fall Physics Laboratory</span>
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-mono font-bold">100m Standard</span>
                    </div>

                    {/* Planet Environment Pill Buttons */}
                    <div className="flex bg-slate-900/80 backdrop-blur-md p-0.5 rounded-xl border border-white/10">
                        {Object.entries(PLANETARY_GRAVITY).map(([pKey, pData]) => (
                            <button
                                key={pKey}
                                onClick={() => setSelectedPlanet(pKey)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                    selectedPlanet === pKey
                                        ? 'bg-sky-500 text-white shadow-md'
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
                        onClick={() => setShowRuler(!showRuler)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            showRuler ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title="Toggle Metric Height Ruler"
                    >
                        <Layers size={11} /> Ruler
                    </button>
                    <button
                        onClick={() => setShowVelocityVector(!showVelocityVector)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            showVelocityVector ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title="Toggle Velocity Vector"
                    >
                        <ArrowDown size={11} /> Vel Vector
                    </button>
                    <button
                        onClick={() => setShowGravityVector(!showGravityVector)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            showGravityVector ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title="Toggle Gravity Vector"
                    >
                        <Globe size={11} /> Gravity Vector
                    </button>
                    <button
                        onClick={() => setShowStrobeTrail(!showStrobeTrail)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            showStrobeTrail ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title="Toggle Stroboscopic Acceleration Markers"
                    >
                        <Sparkles size={11} /> Strobe Trail
                    </button>
                </div>
            </div>

            {/* ── Main High-Precision Physics SVG Viewport ── */}
            <div className="flex-1 relative w-full h-full">
                <svg className="absolute inset-0 w-full h-full">
                    <defs>
                        {/* Cyan Velocity Arrowhead */}
                        <marker id="vel-arrow" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 9 3, 0 6" fill="#38bdf8" />
                        </marker>
                        {/* Amber Gravity Arrowhead */}
                        <marker id="grav-arrow" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 9 3, 0 6" fill="#f59e0b" />
                        </marker>
                        {/* Sphere Radial Glow & Material */}
                        <radialGradient id="sphere-gradient" cx="35%" cy="35%" r="65%">
                            <stop offset="0%" stopColor="#bae6fd" />
                            <stop offset="35%" stopColor="#38bdf8" />
                            <stop offset="85%" stopColor="#0284c7" />
                            <stop offset="100%" stopColor="#0369a1" />
                        </radialGradient>
                        {/* Ground Hatch Pattern */}
                        <pattern id="ground-hatch" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                            <line x1="0" y1="0" x2="0" y2="16" stroke="#334155" strokeWidth="2.5" />
                        </pattern>
                    </defs>

                    {/* ── Vertical Drop Axis / Centerline ── */}
                    <line
                        x1={ballPixelX}
                        y1={topPixelY - 20}
                        x2={ballPixelX}
                        y2={groundPixelY}
                        stroke="#334155"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        opacity="0.6"
                    />

                    {/* ── Height Measurement Graduation Ruler (Left of Column) ── */}
                    {showRuler && (
                        <g className="ruler-group font-mono">
                            {/* Main vertical ruler rail */}
                            <line
                                x1={ballPixelX - 120}
                                y1={topPixelY}
                                x2={ballPixelX - 120}
                                y2={groundPixelY}
                                stroke="#475569"
                                strokeWidth="2"
                            />

                            {/* Graduation Ticks & Elevation Labels */}
                            {rulerTicks.map((hVal) => {
                                const tickY = groundPixelY - ((hVal / maxH) * usableHeightPixels);
                                const isGround = hVal === 0;
                                const isApex = hVal === initialHeight;

                                return (
                                    <g key={`tick-${hVal}`}>
                                        <line
                                            x1={ballPixelX - 132}
                                            y1={tickY}
                                            x2={ballPixelX - 108}
                                            y2={tickY}
                                            stroke={isGround ? '#22c55e' : (isApex ? '#38bdf8' : '#64748b')}
                                            strokeWidth={isGround || isApex ? 2.5 : 1.5}
                                        />
                                        <text
                                            x={ballPixelX - 140}
                                            y={tickY + 3.5}
                                            textAnchor="end"
                                            fill={isGround ? '#22c55e' : (isApex ? '#38bdf8' : '#94a3b8')}
                                            fontSize={isGround || isApex ? 11 : 9}
                                            fontWeight={isGround || isApex ? 'bold' : 'normal'}
                                        >
                                            {hVal.toFixed(0)}m {isGround ? '(Ground)' : ''}
                                        </text>

                                        {/* Light horizontal guide lines across to drop column */}
                                        <line
                                            x1={ballPixelX - 108}
                                            y1={tickY}
                                            x2={ballPixelX - 30}
                                            y2={tickY}
                                            stroke="#1e293b"
                                            strokeWidth="1"
                                            strokeDasharray="2 4"
                                        />
                                    </g>
                                );
                            })}

                            {/* Live Altitude Tracker Bracket (pointing to current sphere height) */}
                            <g transform={`translate(${ballPixelX - 120}, ${ballPixelY})`}>
                                <polygon points="0 0, 10 -5, 10 5" fill="#38bdf8" />
                                <rect x="-65" y="-10" width="55" height="20" rx="4" fill="#0284c7" opacity="0.9" />
                                <text x="-37.5" y="4" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                                    {snapshot.height.toFixed(1)}m
                                </text>
                            </g>

                            {/* Distance Fallen Indicator Bracket */}
                            {snapshot.distanceFallen > 0.5 && (
                                <g>
                                    <line
                                        x1={ballPixelX - 75}
                                        y1={topPixelY}
                                        x2={ballPixelX - 75}
                                        y2={ballPixelY}
                                        stroke="#f43f5e"
                                        strokeWidth="2"
                                        strokeDasharray="3 3"
                                    />
                                    <text
                                        x={ballPixelX - 82}
                                        y={(topPixelY + ballPixelY) / 2}
                                        textAnchor="end"
                                        fill="#fb7185"
                                        fontSize="10"
                                        fontWeight="bold"
                                    >
                                        Δy = {snapshot.distanceFallen.toFixed(1)}m
                                    </text>
                                </g>
                            )}
                        </g>
                    )}

                    {/* ── Stroboscopic Acceleration Motion Trail ── */}
                    {showStrobeTrail && snapshot.strobeHistory.map((strobe, idx) => {
                        const strobeRatio = Math.max(0, Math.min(1, strobe.height / maxH));
                        const sY = groundPixelY - (strobeRatio * usableHeightPixels);

                        return (
                            <g key={`strobe-${idx}`} opacity="0.75">
                                {/* Strobe ghost marker */}
                                <circle
                                    cx={ballPixelX}
                                    cy={sY}
                                    r={ballRadiusPixels * 0.45}
                                    fill="#38bdf8"
                                    fillOpacity="0.2"
                                    stroke="#38bdf8"
                                    strokeWidth="1"
                                    strokeDasharray="2 2"
                                />
                                {/* Time & Distance Tag along right side */}
                                <text
                                    x={ballPixelX + 28}
                                    y={sY + 3}
                                    fill="#64748b"
                                    fontSize="8"
                                    fontFamily="monospace"
                                >
                                    t={strobe.time.toFixed(2)}s ({strobe.height.toFixed(0)}m)
                                </text>
                            </g>
                        );
                    })}

                    {/* ── Ground Reference Surface & Baseline Plane ── */}
                    <g className="ground-plane">
                        {/* Ground Base Rect with Hatch Fill */}
                        <rect
                            x={Math.max(20, ballPixelX - 350)}
                            y={groundPixelY}
                            width={700}
                            height={90}
                            fill="url(#ground-hatch)"
                            stroke="#475569"
                            strokeWidth="1"
                        />
                        {/* Solid Top Surface Line */}
                        <line
                            x1={Math.max(20, ballPixelX - 350)}
                            y1={groundPixelY}
                            x2={ballPixelX + 350}
                            y2={groundPixelY}
                            stroke="#94a3b8"
                            strokeWidth="3"
                        />
                        {/* Center Target Impact Marker */}
                        <circle
                            cx={ballPixelX}
                            cy={groundPixelY}
                            r="6"
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="2"
                        />
                        <text
                            x={ballPixelX + 180}
                            y={groundPixelY + 22}
                            fill="#64748b"
                            fontSize="10"
                            fontWeight="bold"
                            letterSpacing="0.1em"
                        >
                            GROUND LEVEL (y = 0.00 m)
                        </text>
                    </g>

                    {/* ── Ground Impact Shockwave Flash Ring ── */}
                    {impactFlash && (
                        <g transform={`translate(${ballPixelX}, ${groundPixelY})`}>
                            <ellipse cx="0" cy="0" rx="45" ry="12" fill="none" stroke="#38bdf8" strokeWidth="3" opacity="0.8" className="animate-ping" />
                            <ellipse cx="0" cy="0" rx="20" ry="6" fill="#38bdf8" opacity="0.6" />
                        </g>
                    )}

                    {/* ── Dynamic Drop Shadow on Ground ── */}
                    {(() => {
                        const shadowProximity = Math.max(0.1, 1 - heightRatio);
                        const shadowRx = ballRadiusPixels * (0.8 + shadowProximity * 0.8);
                        const shadowRy = 4 + shadowProximity * 6;
                        const shadowOpacity = 0.2 + (shadowProximity * 0.65);

                        return (
                            <ellipse
                                cx={ballPixelX}
                                cy={groundPixelY}
                                rx={shadowRx}
                                ry={shadowRy}
                                fill="#0284c7"
                                opacity={shadowOpacity}
                            />
                        );
                    })()}

                    {/* ── Dynamic Downward Velocity Vector (Cyan Arrow) ── */}
                    {showVelocityVector && velArrowLength > 2 && (
                        <g>
                            <line
                                x1={ballPixelX}
                                y1={ballPixelY}
                                x2={ballPixelX}
                                y2={ballPixelY + (snapshot.velocity <= 0 ? velArrowLength : -velArrowLength)}
                                stroke="#38bdf8"
                                strokeWidth="2.5"
                                markerEnd="url(#vel-arrow)"
                            />
                            {/* Live Velocity Badge attached to arrow */}
                            <g transform={`translate(${ballPixelX + 14}, ${ballPixelY + (snapshot.velocity <= 0 ? (velArrowLength / 2) : -(velArrowLength / 2))})`}>
                                <rect x="0" y="-10" width="84" height="20" rx="4" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="1" opacity="0.95" />
                                <text x="42" y="3.5" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                                    v={snapshot.velocity.toFixed(1)} m/s
                                </text>
                            </g>
                        </g>
                    )}

                    {/* ── Constant Gravity / Acceleration Vector (Amber Arrow, Right of Ball) ── */}
                    {showGravityVector && (
                        <g transform={`translate(${ballPixelX + 45}, ${ballPixelY - 20})`}>
                            <line
                                x1="0"
                                y1="0"
                                x2="0"
                                y2={gravArrowLength}
                                stroke="#f59e0b"
                                strokeWidth="2"
                                markerEnd="url(#grav-arrow)"
                            />
                            <g transform={`translate(8, ${gravArrowLength / 2})`}>
                                <rect x="0" y="-8" width="75" height="16" rx="3" fill="#451a03" stroke="#f59e0b" strokeWidth="0.8" opacity="0.95" />
                                <text x="37.5" y="3.5" textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="bold" fontFamily="monospace">
                                    g={snapshot.config.gravity.toFixed(2)} m/s²
                                </text>
                            </g>
                        </g>
                    )}

                    {/* ── The Physical Falling Sphere ── */}
                    <g transform={`translate(${ballPixelX}, ${ballPixelY})`}>
                        {/* Outer Glow */}
                        <circle
                            cx="0"
                            cy="0"
                            r={ballRadiusPixels + 4}
                            fill="#38bdf8"
                            opacity="0.15"
                        />
                        {/* Main Body with Radial Metallic Gradient */}
                        <circle
                            cx="0"
                            cy="0"
                            r={ballRadiusPixels}
                            fill="url(#sphere-gradient)"
                            stroke="#bae6fd"
                            strokeWidth="2"
                            className="shadow-2xl"
                        />
                        {/* Center of Mass Crosshair */}
                        <line x1="-4" y1="0" x2="4" y2="0" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
                        <line x1="0" y1="-4" x2="0" y2="4" stroke="#ffffff" strokeWidth="1" opacity="0.7" />
                        {/* Mass Tag */}
                        <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold" opacity="0.85">
                            {snapshot.config.mass}kg
                        </text>
                    </g>
                </svg>

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
                        ) : (
                            <><Play size={15} fill="currentColor" className="mr-2" /> RUN FREE-FALL</>
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

                {/* Experiment Status & Timeline Progress */}
                <div className="flex items-center gap-4 min-w-72">
                    <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-slate-400 font-bold">ALTITUDE PROGRESS</span>
                            <span className="text-sky-400">{snapshot.percentFallen.toFixed(0)}% Fallen</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                            <div
                                className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-75"
                                style={{ width: `${snapshot.percentFallen}%` }}
                            />
                        </div>
                    </div>

                    <div className="text-right font-mono">
                        <div className="text-xs font-bold text-white">t = {snapshot.time.toFixed(2)}s</div>
                        <div className="text-[9px] text-slate-500">{snapshot.bounceCount} Bounces</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
