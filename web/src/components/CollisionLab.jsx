// ═══════════════════════════════════════════════════════════════════════════════
// REALIS — Elastic & Inelastic Collision Laboratory
// Complete physics simulation following the FreeFallLab / CrankSliderLab pattern.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    Play, Square, RefreshCw, SkipForward, Activity, Sliders,
    ArrowRight, ArrowLeft, Layers, TrendingUp, Zap, GitMerge, AlertTriangle
} from 'lucide-react';
import useStore from '../store/useStore';
import CollisionPhysicsSolver, {
    COLLISION_TYPE, COLLISION_PHASE, DEFAULT_COLLISION_CONFIG, validateCollisionConfig
} from '../utils/solvers/collisionSolver';

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (v, d = 3) => {
    if (v === null || v === undefined) return '—';
    if (!Number.isFinite(v)) return '∞';
    if (Math.abs(v) < 0.0001 && v !== 0) return v.toExponential(2);
    return parseFloat(v.toFixed(d)).toString();
};

// Phase label + color
const PHASE_META = {
    [COLLISION_PHASE.READY]:      { label: 'READY',      color: '#64748b', bg: 'rgba(100,116,139,0.2)' },
    [COLLISION_PHASE.APPROACH]:   { label: 'APPROACHING', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    [COLLISION_PHASE.CONTACT]:    { label: 'CONTACT',     color: '#ef4444', bg: 'rgba(239,68,68,0.25)' },
    [COLLISION_PHASE.SEPARATING]: { label: 'SEPARATING',  color: '#10b981', bg: 'rgba(16,185,129,0.2)' },
    [COLLISION_PHASE.COMPLETED]:  { label: 'COMPLETED',   color: '#3b82f6', bg: 'rgba(59,130,246,0.2)' },
};

// Collision type display
const TYPE_META = {
    [COLLISION_TYPE.ELASTIC]:            { label: 'Elastic', tag: 'e = 1.0', accent: '#38bdf8' },
    [COLLISION_TYPE.INELASTIC]:          { label: 'Inelastic', tag: '0 < e < 1', accent: '#a78bfa' },
    [COLLISION_TYPE.PERFECTLY_INELASTIC]:{ label: 'Perfectly Inelastic', tag: 'e = 0.0', accent: '#fb923c' },
};

// ── Mini SVG Graph ────────────────────────────────────────────────────────────
function MiniGraph({ data, keyA, keyB, labelA, labelB, colorA, colorB, unit = '' }) {
    if (!data || data.length < 2) {
        return (
            <div className="h-16 bg-slate-950 rounded-lg border border-white/5 flex items-center justify-center font-mono text-[9px] text-slate-600">
                Collecting data…
            </div>
        );
    }
    const w = 280, h = 64;
    const valsA = data.map(d => d[keyA]);
    const valsB = data.map(d => d[keyB]);
    const allVals = [...valsA, ...valsB];
    const minV = Math.min(...allVals);
    const maxV = Math.max(...allVals);
    const rng = Math.max(maxV - minV, 0.01);
    const n = data.length;
    const px = (i) => (i / (n - 1)) * w;
    const py = (v) => h - ((v - minV) / rng) * (h - 4) - 2;
    const ptA = valsA.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
    const ptB = valsB.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');

    return (
        <div>
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
                <line x1="0" y1={h} x2={w} y2={h} stroke="rgba(148,163,184,0.15)" strokeWidth="1" />
                <line x1="0" y1={py(0)} x2={w} y2={py(0)} stroke="rgba(148,163,184,0.1)" strokeWidth="1" strokeDasharray="4 4" />
                <polyline points={ptA} fill="none" stroke={colorA} strokeWidth="1.5" opacity="0.9" />
                <polyline points={ptB} fill="none" stroke={colorB} strokeWidth="1.5" opacity="0.9" />
            </svg>
            <div className="flex justify-between text-[9px] font-mono mt-1">
                <span style={{ color: colorA }}>— {labelA}: {fmt(valsA[valsA.length - 1], 3)}{unit}</span>
                <span style={{ color: colorB }}>— {labelB}: {fmt(valsB[valsB.length - 1], 3)}{unit}</span>
            </div>
        </div>
    );
}

// ── Main Lab Component ─────────────────────────────────────────────────────────
export default function CollisionLab() {
    const isPlaying      = useStore(s => s.isPlaying);
    const togglePlayback = useStore(s => s.togglePlayback);
    const resetPlayback  = useStore(s => s.resetPlayback);
    const setLabData     = useStore(s => s.setLabData);
    const clearLabData   = useStore(s => s.clearLabData);

    // ── Lab Configuration (all in SI) ─────────────────────────────────────────
    const [cfg, setCfg] = useState({ ...DEFAULT_COLLISION_CONFIG });
    const [configErrors, setConfigErrors] = useState([]);

    // ── Visual Overlay Toggles ────────────────────────────────────────────────
    const [showVelocityArrows, setShowVelocityArrows]     = useState(true);
    const [showMomentumArrows, setShowMomentumArrows]     = useState(false);
    const [showGraph,          setShowGraph]               = useState(true);
    const [showDimensions,     setShowDimensions]          = useState(false);

    // ── Solver ────────────────────────────────────────────────────────────────
    const solverRef = useRef(null);
    if (!solverRef.current) {
        solverRef.current = new CollisionPhysicsSolver({ ...DEFAULT_COLLISION_CONFIG });
    }

    const [snapshot, setSnapshot] = useState(() => solverRef.current.getSnapshot());

    // ── Canvas Viewport ───────────────────────────────────────────────────────
    const containerRef = useRef(null);
    const [viewSize, setViewSize] = useState({ width: 900, height: 520 });

    useEffect(() => {
        const update = () => {
            if (containerRef.current) {
                setViewSize({
                    width: containerRef.current.clientWidth || 900,
                    height: containerRef.current.clientHeight || 520,
                });
            }
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    // ── Push lab data to Properties panel ─────────────────────────────────────
    useEffect(() => {
        setLabData({
            type: 'elastic_collision',
            title: 'Collision Physics Laboratory',
            snapshot,
            config: cfg,
        });
    }, [snapshot, cfg, setLabData]);

    useEffect(() => {
        return () => clearLabData();
    }, [clearLabData]);

    // ── Listen for config changes fired by PropertiesPanel ────────────────────
    useEffect(() => {
        const handler = (e) => {
            const { type, key, value } = e.detail || {};
            if (type !== 'elastic_collision') return;
            setCfg(prev => {
                const next = { ...prev, [key]: value };
                // Sync restitution to collision type
                if (key === 'collisionType') {
                    if (value === COLLISION_TYPE.ELASTIC) next.restitution = 1.0;
                    if (value === COLLISION_TYPE.PERFECTLY_INELASTIC) next.restitution = 0.0;
                }
                if (key === 'restitution') {
                    if (value >= 1.0) next.collisionType = COLLISION_TYPE.ELASTIC;
                    else if (value <= 0.0) next.collisionType = COLLISION_TYPE.PERFECTLY_INELASTIC;
                    else next.collisionType = COLLISION_TYPE.INELASTIC;
                }
                return next;
            });
        };
        window.addEventListener('lab-config-change', handler);
        return () => window.removeEventListener('lab-config-change', handler);
    }, []);

    // ── Apply config changes to solver ────────────────────────────────────────
    useEffect(() => {
        const errors = validateCollisionConfig(cfg);
        setConfigErrors(errors);
        if (errors.length === 0) {
            solverRef.current.updateConfig(cfg);
        }
    }, [cfg]);

    // ── Handle Reset ──────────────────────────────────────────────────────────
    const handleReset = useCallback(() => {
        resetPlayback();
        solverRef.current.reset();
        setSnapshot(solverRef.current.getSnapshot());
    }, [resetPlayback]);

    // ── Handle Step ──────────────────────────────────────────────────────────
    const handleStep = useCallback(() => {
        if (!isPlaying) {
            const next = solverRef.current.step(solverRef.current.config.dt);
            setSnapshot({ ...next });
        }
    }, [isPlaying]);

    // ── Collision flash ───────────────────────────────────────────────────────
    const [collisionFlash, setCollisionFlash] = useState(false);
    const wasColliding = useRef(false);
    useEffect(() => {
        const colliding = snapshot.phase === COLLISION_PHASE.CONTACT;
        if (colliding && !wasColliding.current) {
            setCollisionFlash(true);
            setTimeout(() => setCollisionFlash(false), 400);
        }
        wasColliding.current = colliding;
    }, [snapshot.phase]);

    // ── Main animation loop ───────────────────────────────────────────────────
    const reqRef     = useRef(null);
    const lastTimeRef = useRef(0);

    useEffect(() => {
        if (!isPlaying) {
            cancelAnimationFrame(reqRef.current);
            return;
        }
        if (configErrors.length > 0) return;

        lastTimeRef.current = performance.now();

        const loop = (now) => {
            const elapsed = Math.min((now - lastTimeRef.current) / 1000, 0.05);
            lastTimeRef.current = now;
            const next = solverRef.current.tick(elapsed);
            setSnapshot({ ...next });
            reqRef.current = requestAnimationFrame(loop);
        };

        reqRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(reqRef.current);
    }, [isPlaying, configErrors.length]);

    // ── Coordinate helpers ────────────────────────────────────────────────────
    // Physics world spans roughly ±8m; canvas is viewSize.width × viewSize.height
    const WORLD_HALF  = 8.0; // metres each side of origin
    const trackY      = Math.round(viewSize.height * 0.5);
    const groundY     = trackY + 22;

    const worldToSvg = useCallback((xPhysics) => {
        return viewSize.width / 2 + (xPhysics / WORLD_HALF) * (viewSize.width * 0.44);
    }, [viewSize.width]);

    const SCALE = (viewSize.width * 0.44) / WORLD_HALF; // px per metre

    // Object radii in pixels (proportional to physical radius + minimum readable size)
    const rAsvg = Math.max(16, cfg.radiusA * SCALE * 0.9);
    const rBsvg = Math.max(16, cfg.radiusB * SCALE * 0.9);

    const xASvg  = worldToSvg(snapshot.objectA.position);
    const xBSvg  = worldToSvg(snapshot.objectB.position);

    // Velocity arrow scale: 1 m/s = 40px
    const VEL_SCALE = 40;
    const MOM_SCALE = 20;

    // ── Graph data (downsampled for performance) ──────────────────────────────
    const graphData = useMemo(() => {
        const h = snapshot.history;
        if (!h || h.length < 2) return [];
        // Downsample to max 120 points for SVG performance
        const step = Math.max(1, Math.floor(h.length / 120));
        return h.filter((_, i) => i % step === 0);
    }, [snapshot.history]);

    // ── Phase styling ─────────────────────────────────────────────────────────
    const phaseMeta = PHASE_META[snapshot.phase] || PHASE_META[COLLISION_PHASE.READY];
    const typeMeta  = TYPE_META[cfg.collisionType] || TYPE_META[COLLISION_TYPE.ELASTIC];

    // ── Canvas tick marks ─────────────────────────────────────────────────────
    const trackTicks = useMemo(() => {
        const ticks = [];
        for (let m = -7; m <= 7; m++) {
            ticks.push({ m, x: worldToSvg(m) });
        }
        return ticks;
    }, [worldToSvg]);

    // ── Sticky/coupled visual (perfectly inelastic) ───────────────────────────
    const isStuck = cfg.collisionType === COLLISION_TYPE.PERFECTLY_INELASTIC
        && snapshot.system.collisionOccurred
        && snapshot.phase !== COLLISION_PHASE.READY;

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full bg-[#08101e] overflow-hidden select-none font-sans flex flex-col"
        >
            {/* ── Background ── */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(59,130,246,0.06),rgba(255,255,255,0))] pointer-events-none" />
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            {/* Collision flash overlay */}
            {collisionFlash && (
                <div className="absolute inset-0 pointer-events-none z-20 animate-pulse"
                    style={{ background: 'rgba(239,68,68,0.08)', transition: 'opacity 0.4s' }} />
            )}

            {/* ── Top toolbar ── */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
                {/* Left: Lab badge + collision type */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-blue-500/30 shadow-lg">
                        <Activity size={13} className="text-blue-400 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Collision Lab</span>
                        <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold"
                            style={{ background: `${typeMeta.accent}22`, color: typeMeta.accent, border: `1px solid ${typeMeta.accent}44` }}
                        >
                            {typeMeta.label} · {typeMeta.tag}
                        </span>
                    </div>

                    {/* Phase badge */}
                    <div
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest font-mono border"
                        style={{ color: phaseMeta.color, background: phaseMeta.bg, borderColor: `${phaseMeta.color}40` }}
                    >
                        {phaseMeta.label}
                    </div>
                </div>

                {/* Right: Overlay toggles */}
                <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-white/10">
                    {[
                        { key: 'vel',  label: 'Vel Vectors', state: showVelocityArrows, setter: setShowVelocityArrows },
                        { key: 'mom',  label: 'Mom Vectors', state: showMomentumArrows, setter: setShowMomentumArrows },
                        { key: 'graph',label: 'Graphs',      state: showGraph,          setter: setShowGraph },
                        { key: 'dim',  label: 'Dimensions',  state: showDimensions,     setter: setShowDimensions },
                    ].map(({ key, label, state, setter }) => (
                        <button
                            key={key}
                            onClick={() => setter(p => !p)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                state ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Collision Type Selector strip ── */}
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex bg-slate-900/80 backdrop-blur-md p-0.5 rounded-xl border border-white/10">
                {Object.values(COLLISION_TYPE).map(ct => {
                    const m = TYPE_META[ct];
                    return (
                        <button
                            key={ct}
                            onClick={() => setCfg(prev => {
                                const next = { ...prev, collisionType: ct };
                                if (ct === COLLISION_TYPE.ELASTIC) next.restitution = 1.0;
                                if (ct === COLLISION_TYPE.PERFECTLY_INELASTIC) next.restitution = 0.0;
                                return next;
                            })}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                cfg.collisionType === ct
                                    ? 'text-white shadow-md'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                            style={cfg.collisionType === ct ? { background: m.accent + '33', color: m.accent } : {}}
                        >
                            {m.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Config Error Banner ── */}
            {configErrors.length > 0 && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 bg-red-950/90 border border-red-500/60 text-red-300 text-[11px] font-mono px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg">
                    <AlertTriangle size={13} className="text-red-400 shrink-0" />
                    <div>
                        <div className="font-bold text-red-200 uppercase tracking-wider text-[10px]">INVALID CONFIGURATION</div>
                        {configErrors.map((e, i) => <div key={i}>• {e}</div>)}
                    </div>
                </div>
            )}

            {/* ── Main SVG Viewport ── */}
            <div className="flex-1 relative w-full">
                <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
                    <defs>
                        <marker id="arrowA" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                            <polygon points="0 0, 8 3, 0 6" fill="#38bdf8" />
                        </marker>
                        <marker id="arrowB" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                            <polygon points="0 0, 8 3, 0 6" fill="#fb923c" />
                        </marker>
                        <marker id="arrowMomA" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                            <polygon points="0 0, 8 3, 0 6" fill="#60a5fa" />
                        </marker>
                        <marker id="arrowMomB" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                            <polygon points="0 0, 8 3, 0 6" fill="#f97316" />
                        </marker>
                        <filter id="glowBlue">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                        <filter id="glowAmber">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                        <filter id="glowRed">
                            <feGaussianBlur stdDeviation="5" result="blur" />
                            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                        <radialGradient id="gradA" cx="40%" cy="35%" r="60%">
                            <stop offset="0%" stopColor="#7dd3fc" />
                            <stop offset="100%" stopColor="#1d4ed8" />
                        </radialGradient>
                        <radialGradient id="gradB" cx="40%" cy="35%" r="60%">
                            <stop offset="0%" stopColor="#fcd34d" />
                            <stop offset="100%" stopColor="#b45309" />
                        </radialGradient>
                        <radialGradient id="gradContact" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                        </radialGradient>
                    </defs>

                    {/* ── Ground / Track ── */}
                    <rect
                        x={0} y={groundY}
                        width={viewSize.width} height={viewSize.height - groundY}
                        fill="url(#trackGrad)" opacity="0.7"
                        style={{ fill: 'rgba(15,23,42,0.8)' }}
                    />
                    <line
                        x1={0} y1={groundY}
                        x2={viewSize.width} y2={groundY}
                        stroke="#334155" strokeWidth="2"
                    />

                    {/* Track surface texture */}
                    {Array.from({ length: Math.ceil(viewSize.width / 20) }, (_, i) => (
                        <line
                            key={`hatch_${i}`}
                            x1={i * 20} y1={groundY}
                            x2={i * 20 - 8} y2={groundY + 8}
                            stroke="#1e293b" strokeWidth="1.5"
                        />
                    ))}

                    {/* ── Ruler ticks ── */}
                    {trackTicks.map(({ m, x }) => (
                        <g key={`tick_${m}`}>
                            <line x1={x} y1={groundY - 6} x2={x} y2={groundY + 4} stroke="#334155" strokeWidth="1" />
                            {m % 2 === 0 && (
                                <text x={x} y={groundY + 16} fill="#475569" fontSize="9" textAnchor="middle" fontFamily="monospace">
                                    {m}m
                                </text>
                            )}
                        </g>
                    ))}

                    {/* Origin marker */}
                    <line x1={worldToSvg(0)} y1={groundY - 12} x2={worldToSvg(0)} y2={groundY + 4}
                        stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />

                    {/* ── Collision contact glow (when objects are touching) ── */}
                    {snapshot.phase === COLLISION_PHASE.CONTACT && (
                        <circle
                            cx={(xASvg + xBSvg) / 2}
                            cy={trackY}
                            r={rAsvg + rBsvg}
                            fill="url(#gradContact)"
                            filter="url(#glowRed)"
                            opacity="0.7"
                        />
                    )}

                    {/* ── Dimension annotations ── */}
                    {showDimensions && (
                        <g>
                            {/* Object A radius */}
                            <line x1={xASvg - rAsvg} y1={trackY + rAsvg + 16}
                                x2={xASvg + rAsvg} y2={trackY + rAsvg + 16}
                                stroke="#60a5fa" strokeWidth="1" markerStart="url(#arrowMomA)" markerEnd="url(#arrowMomA)" opacity="0.7" />
                            <text x={xASvg} y={trackY + rAsvg + 28} fill="#60a5fa" fontSize="9" textAnchor="middle" fontFamily="monospace" opacity="0.8">
                                2r={fmt(cfg.radiusA * 2, 2)}m
                            </text>
                            {/* Mass A label */}
                            <text x={xASvg} y={trackY - rAsvg - 22} fill="#7dd3fc" fontSize="9" textAnchor="middle" fontFamily="monospace">
                                m_A={fmt(cfg.massA, 2)}kg
                            </text>
                            {/* Object B */}
                            <text x={xBSvg} y={trackY - rBsvg - 22} fill="#fcd34d" fontSize="9" textAnchor="middle" fontFamily="monospace">
                                m_B={fmt(cfg.massB, 2)}kg
                            </text>
                        </g>
                    )}

                    {/* ── Object A (BLUE) ── */}
                    <g>
                        {/* Shadow */}
                        <ellipse cx={xASvg} cy={groundY} rx={rAsvg * 0.8} ry={4} fill="rgba(0,0,0,0.5)" opacity="0.7" />

                        {/* Body */}
                        <circle
                            cx={xASvg}
                            cy={trackY}
                            r={rAsvg}
                            fill="url(#gradA)"
                            stroke={snapshot.phase === COLLISION_PHASE.CONTACT ? '#ef4444' : '#38bdf8'}
                            strokeWidth={snapshot.phase === COLLISION_PHASE.CONTACT ? 2 : 1.5}
                            filter="url(#glowBlue)"
                        />
                        {/* Mass indicator ring (larger mass = thicker) */}
                        <circle
                            cx={xASvg} cy={trackY} r={rAsvg - 4}
                            fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={Math.max(1, cfg.massA)}
                        />
                        {/* Label */}
                        <text x={xASvg} y={trackY + 4} fill="white" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">A</text>
                    </g>

                    {/* ── Object B (AMBER) ── */}
                    <g>
                        <ellipse cx={xBSvg} cy={groundY} rx={rBsvg * 0.8} ry={4} fill="rgba(0,0,0,0.5)" opacity="0.7" />
                        <circle
                            cx={xBSvg}
                            cy={trackY}
                            r={rBsvg}
                            fill="url(#gradB)"
                            stroke={snapshot.phase === COLLISION_PHASE.CONTACT ? '#ef4444' : '#fbbf24'}
                            strokeWidth={snapshot.phase === COLLISION_PHASE.CONTACT ? 2 : 1.5}
                            filter="url(#glowAmber)"
                        />
                        <circle
                            cx={xBSvg} cy={trackY} r={rBsvg - 4}
                            fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={Math.max(1, cfg.massB)}
                        />
                        <text x={xBSvg} y={trackY + 4} fill="white" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">B</text>
                    </g>

                    {/* ── Velocity arrows ── */}
                    {showVelocityArrows && (() => {
                        const vA = snapshot.objectA.velocity;
                        const vB = snapshot.objectB.velocity;
                        const lenA = vA * VEL_SCALE;
                        const lenB = vB * VEL_SCALE;
                        const arrowY = trackY - rAsvg - 12;
                        const arrowYB = trackY - rBsvg - 12;
                        return (
                            <g>
                                {Math.abs(lenA) > 3 && (
                                    <line
                                        x1={xASvg} y1={arrowY}
                                        x2={xASvg + lenA} y2={arrowY}
                                        stroke="#38bdf8" strokeWidth="2.5"
                                        markerEnd={lenA > 0 ? 'url(#arrowA)' : undefined}
                                        markerStart={lenA < 0 ? 'url(#arrowA)' : undefined}
                                        style={lenA < 0 ? { markerStart: 'url(#arrowA)', transform: 'scaleX(-1)', transformOrigin: `${xASvg}px ${arrowY}px` } : {}}
                                    />
                                )}
                                {Math.abs(lenA) > 3 && (
                                    <text x={xASvg + lenA / 2} y={arrowY - 6} fill="#7dd3fc" fontSize="9" textAnchor="middle" fontFamily="monospace">
                                        {fmt(vA, 2)} m/s
                                    </text>
                                )}
                                {Math.abs(lenB) > 3 && (
                                    <line
                                        x1={xBSvg} y1={arrowYB}
                                        x2={xBSvg + lenB} y2={arrowYB}
                                        stroke="#fb923c" strokeWidth="2.5"
                                        markerEnd={lenB > 0 ? 'url(#arrowB)' : undefined}
                                    />
                                )}
                                {Math.abs(lenB) > 3 && (
                                    <text x={xBSvg + lenB / 2} y={arrowYB - 6} fill="#fcd34d" fontSize="9" textAnchor="middle" fontFamily="monospace">
                                        {fmt(vB, 2)} m/s
                                    </text>
                                )}
                            </g>
                        );
                    })()}

                    {/* ── Momentum arrows (below objects) ── */}
                    {showMomentumArrows && (() => {
                        const pA = snapshot.objectA.momentum;
                        const pB = snapshot.objectB.momentum;
                        const lenA = pA * MOM_SCALE;
                        const lenB = pB * MOM_SCALE;
                        const momY = trackY + rAsvg + 14;
                        const momYB = trackY + rBsvg + 14;
                        return (
                            <g>
                                {Math.abs(lenA) > 2 && (
                                    <>
                                        <line x1={xASvg} y1={momY} x2={xASvg + lenA} y2={momY}
                                            stroke="#60a5fa" strokeWidth="2" markerEnd={lenA > 0 ? 'url(#arrowMomA)' : undefined} />
                                        <text x={xASvg + lenA / 2} y={momY + 12} fill="#60a5fa" fontSize="9" textAnchor="middle" fontFamily="monospace">
                                            p={fmt(pA, 2)} kg·m/s
                                        </text>
                                    </>
                                )}
                                {Math.abs(lenB) > 2 && (
                                    <>
                                        <line x1={xBSvg} y1={momYB} x2={xBSvg + lenB} y2={momYB}
                                            stroke="#f97316" strokeWidth="2" markerEnd={lenB > 0 ? 'url(#arrowMomB)' : undefined} />
                                        <text x={xBSvg + lenB / 2} y={momYB + 12} fill="#f97316" fontSize="9" textAnchor="middle" fontFamily="monospace">
                                            p={fmt(pB, 2)} kg·m/s
                                        </text>
                                    </>
                                )}
                            </g>
                        );
                    })()}

                    {/* ── Sticky connector (perfectly inelastic) ── */}
                    {isStuck && (
                        <line
                            x1={xASvg + rAsvg} y1={trackY}
                            x2={xBSvg - rBsvg} y2={trackY}
                            stroke="#fb923c" strokeWidth="3" strokeDasharray="4 2" opacity="0.8"
                        />
                    )}

                    {/* ── Impulse arrows (only at contact moment) ── */}
                    {snapshot.phase === COLLISION_PHASE.CONTACT && snapshot.system.impulse !== null && (
                        <g>
                            <line x1={xASvg - rAsvg - 5} y1={trackY} x2={xASvg - rAsvg - 40} y2={trackY}
                                stroke="#f87171" strokeWidth="2.5" markerEnd="url(#arrowA)" opacity="0.9" />
                            <line x1={xBSvg + rBsvg + 5} y1={trackY} x2={xBSvg + rBsvg + 40} y2={trackY}
                                stroke="#f87171" strokeWidth="2.5" markerEnd="url(#arrowB)" opacity="0.9" />
                            <text x={(xASvg + xBSvg) / 2} y={trackY + rAsvg + 40} fill="#f87171" fontSize="9" textAnchor="middle" fontFamily="monospace">
                                J = {fmt(snapshot.system.impulse, 3)} N·s
                            </text>
                        </g>
                    )}

                    {/* ── Compact telemetry overlay (top-right of canvas) ── */}
                    <g transform={`translate(${viewSize.width - 200}, ${viewSize.height * 0.15})`}>
                        <rect x="0" y="0" width="195" height="88" rx="8"
                            fill="rgba(8,16,30,0.85)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                        <text x="10" y="16" fill="#94a3b8" fontSize="9" fontFamily="monospace" fontWeight="bold">SIM TIME</text>
                        <text x="100" y="16" fill="#e2e8f0" fontSize="9" fontFamily="monospace">{fmt(snapshot.time, 3)} s</text>
                        <text x="10" y="30" fill="#94a3b8" fontSize="9" fontFamily="monospace">v_A</text>
                        <text x="100" y="30" fill="#7dd3fc" fontSize="9" fontFamily="monospace" fontWeight="bold">{fmt(snapshot.objectA.velocity, 3)} m/s</text>
                        <text x="10" y="44" fill="#94a3b8" fontSize="9" fontFamily="monospace">v_B</text>
                        <text x="100" y="44" fill="#fcd34d" fontSize="9" fontFamily="monospace" fontWeight="bold">{fmt(snapshot.objectB.velocity, 3)} m/s</text>
                        <text x="10" y="58" fill="#94a3b8" fontSize="9" fontFamily="monospace">p_total</text>
                        <text x="100" y="58" fill="#a78bfa" fontSize="9" fontFamily="monospace">{fmt(snapshot.system.totalMomentum, 3)} kg·m/s</text>
                        <text x="10" y="72" fill="#94a3b8" fontSize="9" fontFamily="monospace">KE_total</text>
                        <text x="100" y="72" fill="#34d399" fontSize="9" fontFamily="monospace">{fmt(snapshot.system.totalKineticEnergy, 3)} J</text>
                    </g>
                </svg>
            </div>

            {/* ── Mini Graphs panel ── */}
            {showGraph && (
                <div className="absolute bottom-20 left-4 w-64 z-10 bg-slate-900/90 backdrop-blur-md rounded-xl border border-white/10 p-3 space-y-3">
                    <div className="text-[9px] font-bold uppercase text-slate-500 tracking-widest flex items-center gap-1">
                        <TrendingUp size={10} /> Velocity vs Time
                    </div>
                    <MiniGraph
                        data={graphData}
                        keyA="vA" keyB="vB"
                        labelA="A" labelB="B"
                        colorA="#38bdf8" colorB="#fbbf24"
                        unit=" m/s"
                    />
                    <div className="border-t border-white/10 pt-2">
                        <div className="text-[9px] font-bold uppercase text-slate-500 tracking-widest flex items-center gap-1">
                            <Zap size={10} /> KE vs Time
                        </div>
                        <MiniGraph
                            data={graphData}
                            keyA="ke" keyB="pTotal"
                            labelA="KE" labelB="p"
                            colorA="#34d399" colorB="#a78bfa"
                            unit=""
                        />
                    </div>
                </div>
            )}

            {/* ── Playback Controls bar ── */}
            <div className="h-14 bg-slate-950/95 border-t border-white/10 backdrop-blur-3xl px-4 flex items-center gap-4 z-30 shrink-0">
                {/* Reset */}
                <button
                    onClick={handleReset}
                    className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer bg-white/5 hover:bg-white/10 rounded-lg"
                    title="Reset"
                >
                    <RefreshCw size={14} />
                </button>

                {/* Play / Pause */}
                <button
                    onClick={togglePlayback}
                    disabled={configErrors.length > 0}
                    className="h-8 px-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg flex items-center justify-center transition-all cursor-pointer font-bold tracking-wider uppercase text-[10px] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {isPlaying
                        ? <><Square size={11} fill="currentColor" className="mr-1.5" />PAUSE</>
                        : <><Play size={13} fill="currentColor" className="mr-1.5" />PLAY</>
                    }
                </button>

                {/* Step */}
                <button
                    onClick={handleStep}
                    disabled={isPlaying || configErrors.length > 0}
                    className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer bg-white/5 hover:bg-white/10 rounded-lg disabled:opacity-40"
                    title="Single Step"
                >
                    <SkipForward size={14} />
                </button>

                {/* Time Scale */}
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                    <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">Speed</span>
                    <input
                        type="range" min="0.1" max="10" step="0.1"
                        value={cfg.timeScale}
                        onChange={e => setCfg(p => ({ ...p, timeScale: parseFloat(e.target.value) }))}
                        className="w-20 h-1 bg-white/10 rounded-full accent-blue-500 outline-none cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-blue-400 font-bold w-8">{cfg.timeScale.toFixed(1)}x</span>
                </div>

                {/* Restitution quick slider */}
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                    <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">e</span>
                    <input
                        type="range" min="0" max="1" step="0.05"
                        value={cfg.restitution}
                        onChange={e => setCfg(prev => {
                            const r = parseFloat(e.target.value);
                            const next = { ...prev, restitution: r };
                            if (r >= 1.0) next.collisionType = COLLISION_TYPE.ELASTIC;
                            else if (r <= 0.0) next.collisionType = COLLISION_TYPE.PERFECTLY_INELASTIC;
                            else next.collisionType = COLLISION_TYPE.INELASTIC;
                            return next;
                        })}
                        className="w-20 h-1 bg-white/10 rounded-full accent-violet-500 outline-none cursor-pointer"
                    />
                    <span className="text-[10px] font-mono text-violet-400 font-bold w-8">{cfg.restitution.toFixed(2)}</span>
                </div>

                {/* Sim time display */}
                <div className="flex-1 flex items-center justify-end gap-2">
                    <div className={`size-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                    <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">
                        {isPlaying ? 'SIMULATING' : 'PAUSED'} · t = {fmt(snapshot.time, 3)} s
                    </span>
                </div>
            </div>
        </div>
    );
}
