import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Play, Square, RefreshCw, SkipForward, Layers,
    Sparkles, Activity, Crosshair, Maximize2, ZoomIn, ZoomOut, BookOpen, Magnet
} from 'lucide-react';
import useStore from '../store/useStore';
import DoublePendulumPhysicsSolver from '../utils/solvers/doublePendulumSolver';

const PLANETARY_GRAVITY = {
    earth: { name: 'Earth', g: 9.81 },
    moon: { name: 'Moon', g: 1.62 },
    mars: { name: 'Mars', g: 3.71 }
};

const SIM_PRESETS = {
    stable: {
        name: 'Stable', mass1: 1, mass2: 1, length1: 1, length2: 1,
        theta1: 20, theta2: 20, omega1: 0, omega2: 0, gravity: 9.81, damping: 0
    },
    strong_swing: {
        name: 'Strong Swing', mass1: 1, mass2: 1, length1: 1, length2: 1,
        theta1: 90, theta2: 90, omega1: 0, omega2: 0, gravity: 9.81, damping: 0
    },
    chaotic: {
        name: 'Chaotic', mass1: 1, mass2: 1, length1: 1, length2: 1,
        theta1: 120, theta2: 120, omega1: 0, omega2: 0, gravity: 9.81, damping: 0
    },
    asymmetric: {
        name: 'Asymmetric', mass1: 1, mass2: 1, length1: 1, length2: 1,
        theta1: 120, theta2: 60, omega1: 0, omega2: 0, gravity: 9.81, damping: 0
    }
};

const FIXED_DT = 0.005;                  // fixed physics timestep (s) — frame-rate independent
const MAX_PX_PER_METER = 150;            // upper bound on zoom to avoid tiny-system explosion
const MIN_PX_PER_METER = 14;             // lower bound so huge systems stay readable
const MAX_SIM_STEPS_PER_FRAME = 200;     // anti-meltdown cap per render frame
const CHAOS_PERTURBATION = 0.01;         // tiny IC perturbation driving chaotic divergence (rad)

export default function DoublePendulumLab() {
    const isPlaying = useStore(state => state.isPlaying);
    const togglePlayback = useStore(state => state.togglePlayback);
    const setLabData = useStore(state => state.setLabData);
    const clearLabData = useStore(state => state.clearLabData);

    // ── System Parameters (default per V2 spec) ─────────────────────────────
    const [mass1, setMass1] = useState(1.0);
    const [mass2, setMass2] = useState(1.0);
    const [length1, setLength1] = useState(1.0);
    const [length2, setLength2] = useState(1.0);
    const [theta1, setTheta1] = useState(120.0);
    const [theta2, setTheta2] = useState(120.0);
    const [omega1, setOmega1] = useState(0.0);
    const [omega2, setOmega2] = useState(0.0);
    const [gravity, setGravity] = useState(9.81);
    const [damping, setDamping] = useState(0.0);
    const [timeScale, setTimeScale] = useState(1.0);

    // ── Visualization Toggles ───────────────────────────────────────────────
    const [showGrid, setShowGrid] = useState(true);
    const [showTrail, setShowTrail] = useState('5s');      // off | 1s | 5s | full
    const [showVelocity, setShowVelocity] = useState(true);
    const [showGravity, setShowGravity] = useState(false);
    const [showPhaseSpace, setShowPhaseSpace] = useState(false);
    const [showTelemetry, setShowTelemetry] = useState(true);
    const [telemetryCollapsed, setTelemetryCollapsed] = useState(false);
    const [chaosMode, setChaosMode] = useState(false);
    const [physicsExplainer, setPhysicsExplainer] = useState(false);

    // ── Camera State ────────────────────────────────────────────────────────
    const [cameraMode, setCameraMode] = useState('fit');   // 'fit' | 'follow'
    const [zoom, setZoom] = useState(1.0);

    const solverRef = useRef(new DoublePendulumPhysicsSolver({
        mass1, mass2, length1, length2, gravity, damping,
        theta1_0: theta1, theta2_0: theta2, omega1_0: omega1, omega2_0: omega2,
        timeScale: 1.0
    }));
    const [snapshot, setSnapshot] = useState(solverRef.current.getSnapshot());

    // ── Derived energy quantities (solver reports nested energy + drift %) ──
    const ke1 = 0.5 * mass1 * Math.pow(length1 * snapshot.omega1, 2);
    const ke2 = Math.max(0, snapshot.energy.kinetic - ke1);
    const pe = snapshot.energy.potential;
    const totE = snapshot.energy.total;
    const driftPct = snapshot.energy.driftPercent;
    const energyError = Math.abs(driftPct) / 100;      // fractional drift
    const energyOk = energyError < 0.001;

    // ─── Lab ⇄ Store bridge: publish measurements for global timeline/metadata ─
    useEffect(() => {
        setLabData({
            title: 'Double Pendulum (Chaos Lab) — V2',
            type: 'double_pendulum',
            snapshot: {
                time: snapshot.time,
                angle1: snapshot.angle1, angle2: snapshot.angle2,
                omega1: snapshot.omega1, omega2: snapshot.omega2,
                alpha1: snapshot.alpha1, alpha2: snapshot.alpha2,
                tension1: snapshot.tension1, tension2: snapshot.tension2,
                energy: { total: totE, potential: pe, kinetic: ke1 + ke2 },
                isResting: !isPlaying,
                config: {
                    dt: FIXED_DT,
                    mass1, mass2, length1, length2, gravity, damping,
                    theta1: Math.round(theta1), theta2: Math.round(theta2),
                    omega1, omega2
                }
            },
            config: {
                mass1, mass2, length1, length2, gravity, damping,
                theta1: Math.round(theta1), theta2: Math.round(theta2),
                omega1, omega2, timeScale
            },
            // flat fields (contract with older consumers)
            time: snapshot.time,
            mass1, mass2, length1, length2, gravity, damping,
            omega1: snapshot.omega1, omega2: snapshot.omega2,
            theta1: snapshot.theta1, theta2: snapshot.theta2,
            ke1, ke2, energy: totE,
            energyError,
            phase1: snapshot.phaseSpace1, phase2: snapshot.phaseSpace2,
            vx1: snapshot.vx1, vy1: snapshot.vy1, vx2: snapshot.vx2, vy2: snapshot.vy2,
            x1: snapshot.x1, y1: snapshot.y1, x2: snapshot.x2, y2: snapshot.y2,
            tension1: snapshot.tension1, tension2: snapshot.tension2
        });
        return () => clearLabData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [snapshot, mass1, mass2, length1, length2, gravity, damping]);

    // ─── Listen for external lab-config changes (Inspector → update) ────
    useEffect(() => {
        const handleConfigChange = (event) => {
            const { type, key, value } = (event && event.detail) || {};
            if (type !== 'double_pendulum') return;
            switch (key) {
                case 'mass1': setMass1(value); break;
                case 'mass2': setMass2(value); break;
                case 'length1': setLength1(value); break;
                case 'length2': setLength2(value); break;
                case 'theta1': setTheta1(value); break;
                case 'theta2': setTheta2(value); break;
                case 'omega1': setOmega1(value); break;
                case 'omega2': setOmega2(value); break;
                case 'gravity': setGravity(value); break;
                case 'damping': setDamping(value); break;
                case 'timeScale': setTimeScale(value); break;
                default: break;
            }
        };
        window.addEventListener('lab-config-change', handleConfigChange);
        return () => window.removeEventListener('lab-config-change', handleConfigChange);
    }, []);

    // ─── Parameters → solver (also refreshes snapshot + labels) ─────────────
    useEffect(() => {
        solverRef.current.updateConfig({
            mass1, mass2, length1, length2, gravity, damping,
            theta1_0: theta1, theta2_0: theta2, omega1_0: omega1, omega2_0: omega2,
            timeScale: 1.0          // speed is driven by the fixed-step loop, not the solver
        });
        setSnapshot({ ...solverRef.current.getSnapshot() });
    }, [mass1, mass2, length1, length2, gravity, damping, theta1, theta2, omega1, omega2]);

    // ─── Chaos mode: duplicate solver with perturbed ICs ────────────────────
    useEffect(() => {
        if (chaosMode) {
            solverRef.current.enableChaosMode(CHAOS_PERTURBATION);
        } else {
            solverRef.current.disableChaosMode();
        }
        setSnapshot({ ...solverRef.current.getSnapshot() });
    }, [chaosMode]);

    // ─── Fixed-timestep physics loop (accumulator, frame-rate independent) ──
    const accRef = useRef(0);
    const lastTimeRef = useRef(0);
    const rafRef = useRef(null);
    useEffect(() => {
        if (!isPlaying) {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            return;
        }
        accRef.current = 0;
        lastTimeRef.current = performance.now();
        const loop = (now) => {
            const elapsed = Math.min((now - lastTimeRef.current) / 1000, 0.1);
            lastTimeRef.current = now;
            accRef.current += elapsed * timeScale;
            let steps = 0;
            while (accRef.current >= FIXED_DT && steps < MAX_SIM_STEPS_PER_FRAME) {
                solverRef.current.step(FIXED_DT);
                accRef.current -= FIXED_DT;
                steps++;
            }
            if (steps === MAX_SIM_STEPS_PER_FRAME) accRef.current = 0;
            setSnapshot({ ...solverRef.current.getSnapshot() });
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafRef.current);
    }, [isPlaying, timeScale]);

    // ─── Single-step ────────────────────────────────────────────────────────
    const handleStep = () => {
        solverRef.current.step(FIXED_DT);
        setSnapshot({ ...solverRef.current.getSnapshot() });
    };

    // ─── Reset: restore parameter-set initial conditions ────────────────────
    const handleReset = () => {
        solverRef.current.reset();
        setSnapshot({ ...solverRef.current.getSnapshot() });
        setZoom(1.0);
        setCameraMode('fit');
    };

    // ─── Preset ─────────────────────────────────────────────────────────────
    const applyPreset = (key) => {
        const p = SIM_PRESETS[key];
        if (!p) return;
        setMass1(p.mass1); setMass2(p.mass2);
        setLength1(p.length1); setLength2(p.length2);
        setTheta1(p.theta1); setTheta2(p.theta2);
        setOmega1(p.omega1); setOmega2(p.omega2);
        setGravity(p.gravity);
        setDamping(p.damping);
        handleReset();
    };

    const cycleTrail = () => setShowTrail(t => t === 'off' ? '1s' : t === '1s' ? '5s' : t === '5s' ? 'full' : 'off');
    const cycleCamera = () => { setCameraMode(m => m === 'fit' ? 'follow' : 'fit'); };

    // ─── PART2_MARKER2 ───

    // ─── Viewport dimensions ────────────────────────────────────────────────
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

    // ─── Camera / Projection (px-per-meter auto-fit) ────────────────────────
    const systemSpanMeters = length1 + length2 + 0.8;   // max reach of m2 + margin
    const usableHalfPx = Math.min(viewSize.width, viewSize.height) * 0.46;
    const basePxm = Math.min(MAX_PX_PER_METER, Math.max(MIN_PX_PER_METER, usableHalfPx / systemSpanMeters));
    const pxm = basePxm * zoom;                          // final pixels-per-meter

    // View center: pivot (fit) or M2 (follow-cam)
    let camMx = 0, camMy = 0;
    if (cameraMode === 'follow') { camMx = snapshot.x2; camMy = snapshot.y2; }
    const pivotX = viewSize.width * 0.5 - camMx * pxm;
    const pivotY = viewSize.height * 0.48 - (-camMy) * pxm;

    const toScreen = (mx, my) => ({ sx: pivotX + mx * pxm, sy: pivotY - my * pxm });

    const pivotPt = { sx: pivotX, sy: pivotY };
    const p1 = toScreen(snapshot.x1, snapshot.y1);
    const p2 = toScreen(snapshot.x2, snapshot.y2);

    // Bob sizes: radius grows a bit with mass so heavier masses read clearly
    const bob1Radius = Math.max(11, Math.min(30, 0.15 * pxm + Math.sqrt(mass1) * 2.5));
    const bob2Radius = Math.max(13, Math.min(32, 0.17 * pxm + Math.sqrt(mass2) * 3));

    // ─── Trails (strobed history) ───────────────────────────────────────────
    const trailSeconds = showTrail === '1s' ? 1 : showTrail === '5s' ? 5 : showTrail === 'full' ? Infinity : 0;
    const trails = useMemo(() => {
        if (trailSeconds === 0) return { trail1: [], trail2: [] };
        const t1 = [], t2 = [];
        const hist = snapshot.strobeHistory || [];
        for (let i = 0; i < hist.length; i++) {
            const pt = hist[i];
            if (trailSeconds !== Infinity && snapshot.time - pt.time > trailSeconds) continue;
            t1.push({ sx: pivotX + pt.x1 * pxm, sy: pivotY - pt.y1 * pxm });
            t2.push({ sx: pivotX + pt.x2 * pxm, sy: pivotY - pt.y2 * pxm });
        }
        return { trail1: t1, trail2: t2 };
    }, [snapshot, trailSeconds, pivotX, pivotY, pxm]);

    // ─── Vector fields ──────────────────────────────────────────────────────
    const vectorScale = 0.055 * pxm;                     // px per (m/s) of velocity
    const velVec1 = { dx: snapshot.vx1 * vectorScale, dy: -snapshot.vy1 * vectorScale };
    const velVec2 = { dx: snapshot.vx2 * vectorScale, dy: -snapshot.vy2 * vectorScale };
    const gravMax = Math.min(120, Math.max(24, 0.32 * pxm));

    // ─── Final snapshot references for labels/telemetry ─────────────────────
    const presetsKeys = Object.keys(SIM_PRESETS);

    // ─── Grid / axes in screen space ───────────────────────────────────────
    const gridStep = pxm >= 30 ? 0.5 : 1;
    const worldX0 = -pivotX / pxm;
    const worldX1 = (viewSize.width - pivotX) / pxm;
    const worldYT = pivotY / pxm;
    const worldYB = (pivotY - viewSize.height) / pxm;
    const vLines = [];
    for (let k = Math.floor(worldX0 / gridStep); k <= Math.ceil(worldX1 / gridStep); k++) {
        vLines.push({ sx: pivotX + k * gridStep * pxm, isAxis: k === 0, k });
    }
    const hLines = [];
    for (let k = Math.floor(worldYB / gridStep); k <= Math.ceil(worldYT / gridStep); k++) {
        hLines.push({ sy: pivotY - k * gridStep * pxm, isAxis: k === 0, k });
    }
    const rod1Mid = { x: (pivotPt.sx + p1.sx) / 2, y: (pivotPt.sy + p1.sy) / 2 };
    const rod2Mid = { x: (p1.sx + p2.sx) / 2, y: (p1.sy + p2.sy) / 2 };

    const t1Deg = (snapshot.theta1 * 180 / Math.PI);
    const t2Deg = (snapshot.theta2 * 180 / Math.PI);

    // ─── Header button class helper ─────────────────────────────────────────
    const btnBase = 'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors';
    const btnIdle = btnBase + ' bg-white/[0.03] text-slate-300 hover:bg-white/[0.09] hover:text-white border border-white/[0.06]';
    const btnOn = btnBase + ' bg-sky-500/20 text-sky-300 border border-sky-400/40 hover:bg-sky-500/30';

    // ─── Render ──────────────────────────────────────────────────────────────
    return (
        <div className="relative flex flex-col w-full h-full bg-[#0a0e17] text-slate-200 overflow-hidden select-none">

            {/* ════ HEADER ═════════════════════════════════════════════════ */}
            <div className="relative z-30 flex flex-wrap items-center gap-x-2 gap-y-1.5 px-3 py-2 bg-[#0c111d]/90 border-b border-white/5 backdrop-blur">
                <div className="flex items-center gap-1.5 mr-1">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-sky-400/30 to-violet-500/30 border border-white/10 flex items-center justify-center">
                        <Activity size={14} className="text-sky-300" />
                    </div>
                    <span className="text-xs font-semibold tracking-wide text-slate-200">Double Pendulum</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-400/25 uppercase tracking-widest ml-0.5">Lab</span>
                </div>

                <div className="h-5 w-px bg-white/10 mx-1" />

                <select
                    value=""
                    onChange={e => { if (e.target.value) applyPreset(e.target.value); e.target.value = ''; }}
                    className="bg-[#121a2c] border border-white/10 rounded-md px-2 py-1 text-[11px] text-slate-300 outline-none focus:border-sky-400/50"
                >
                    <option value="" disabled>Preset…</option>
                    {presetsKeys.map(k => (
                        <option key={k} value={k}>{SIM_PRESETS[k].name}</option>
                    ))}
                </select>

                <div className="h-5 w-px bg-white/10 mx-1" />

                <button onClick={togglePlayback} className={isPlaying ? btnOn : btnIdle} title="Play / Pause (Space)">
                    {isPlaying ? <Square size={13} /> : <Play size={13} />} {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button onClick={handleStep} className={btnIdle} title="Step one fixed timestep (5 ms)">
                    <SkipForward size={13} /> Step
                </button>
                <button onClick={handleReset} className={btnIdle} title="Reset to initial conditions">
                    <RefreshCw size={13} /> Reset
                </button>
                <select
                    value={timeScale}
                    onChange={e => setTimeScale(Number(e.target.value))}
                    className="bg-[#121a2c] border border-white/10 rounded-md px-1.5 py-1 text-[11px] text-slate-300 outline-none focus:border-sky-400/50"
                    title="Simulation speed multiplier"
                >
                    {[0.1, 0.25, 0.5, 1, 2, 4, 8, 10].map(s => (
                        <option key={s} value={s}>{s === 1 ? '1× speed' : `${s}× speed`}</option>
                    ))}
                </select>

                <div className="h-5 w-px bg-white/10 mx-1" />

                <button onClick={() => setShowGrid(g => !g)} className={showGrid ? btnOn : btnIdle} title="Engineering grid + axes">
                    <Layers size={13} /> Grid
                </button>
                <button onClick={cycleTrail} className={showTrail !== 'off' ? btnOn : btnIdle} title="Path history (cycling: 1s → 5s → full → off)">
                    <svg width="12" height="12" viewBox="0 0 12 12" className="mr-0.5"><path d="M1 6 C 3 2,5 10,7 6 S 10 3,11 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    Trail: {showTrail === 'full' ? 'Full' : showTrail === 'off' ? 'Off' : showTrail}
                </button>
                <button onClick={() => setShowVelocity(v => !v)} className={showVelocity ? btnOn : btnIdle} title="Velocity vectors">
                    <svg width="12" height="12" viewBox="0 0 12 12" className="mr-0.5"><path d="M1 10 L9 2 M4 2 H9 V7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Vel
                </button>
                <button onClick={() => setShowGravity(g => !g)} className={showGravity ? btnOn : btnIdle} title="Gravity vector">
                    <svg width="12" height="12" viewBox="0 0 12 12" className="mr-0.5"><path d="M6 2 V10 M2.5 6.5 L6 10 L9.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    g
                </button>
                <button onClick={() => setShowPhaseSpace(p => !p)} className={showPhaseSpace ? btnOn : btnIdle} title="θ₂–ω₂ phase portrait (built up over time)">
                    <svg width="12" height="12" viewBox="0 0 12 12" className="mr-0.5"><path d="M1 10 C 3 2, 9 2, 11 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                    Phase
                </button>
                <button onClick={() => setChaosMode(c => !c)} className={chaosMode ? 'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/40' : btnIdle} title="Lorenz-style: run a twin initialized with a 0.01 rad perturbation and overlay its path">
                    <Sparkles size={13} /> Chaos
                </button>

                <div className="flex-1" />

                <button onClick={() => setShowTelemetry(t => !t)} className={showTelemetry ? btnOn : btnIdle} title="Telemetry panel">
                    <Crosshair size={13} /> Telemetry
                </button>
                <button onClick={() => setPhysicsExplainer(true)} className={btnIdle} title="Walk through the Lagrange derivation">
                    <BookOpen size={13} /> Explain
                </button>
            </div>

            {/* ════ MAIN CANVAS ═════════════════════════════════════════════ */}
            <div ref={containerRef} className="relative flex-1 min-h-0 overflow-hidden">

                <svg
                    className="absolute inset-0 w-full h-full block"
                    style={{
                        background: 'radial-gradient(120% 90% at 50% 30%, #101827 0%, #0a0e17 55%, #070a11 100%)'
                    }}
                >
                    <defs>
                        <linearGradient id="rod1Grad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#93c5fd" />
                            <stop offset="100%" stopColor="#0ea5e9" />
                        </linearGradient>
                        <linearGradient id="rod2Grad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#d8b4fe" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                        <radialGradient id="bob1" cx="0.35" cy="0.3" r="0.85">
                            <stop offset="0%" stopColor="#7dd3fc" />
                            <stop offset="55%" stopColor="#0ea5e9" />
                            <stop offset="100%" stopColor="#0369a1" />
                        </radialGradient>
                        <radialGradient id="bob2" cx="0.35" cy="0.3" r="0.85">
                            <stop offset="0%" stopColor="#c4b5fd" />
                            <stop offset="55%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#6d28d9" />
                        </radialGradient>
                        <radialGradient id="bobGlow" cx="0.5" cy="0.5" r="0.5">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                        </radialGradient>
                        <radialGradient id="bobGlow2" cx="0.5" cy="0.5" r="0.5">
                            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
                        </radialGradient>
                        <radialGradient id="mountPlate" cx="0.5" cy="0.2" r="0.9">
                            <stop offset="0%" stopColor="#94a3b8" />
                            <stop offset="100%" stopColor="#334155" />
                        </radialGradient>
                        <marker id="vh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
                        </marker>
                        <marker id="vhG" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
                            <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
                        </marker>
                        <filter id="soft" x="-200%" y="-200%" width="500%" height="500%">
                            <feGaussianBlur stdDeviation="6" />
                        </filter>
                        <filter id="soft2" x="-200%" y="-200%" width="500%" height="500%">
                            <feGaussianBlur stdDeviation="3" />
                        </filter>
                    </defs>

                    {/* ── ENGINEERING GRID + AXES ── */}
                    {showGrid && (
                        <g>
                            {vLines.map(l => (
                                <line key={`v${l.sx}`} x1={l.sx} y1={0} x2={l.sx} y2={viewSize.height}
                                    stroke={l.isAxis ? 'rgba(251,191,36,0.4)' : 'rgba(148,163,184,0.09)'} strokeWidth={l.isAxis ? 1.4 : 1} strokeDasharray={l.isAxis ? 'none' : '4 6'} />
                            ))}
                            {hLines.map(l => (
                                <line key={`h${l.sy}`} x1={0} y1={l.sy} x2={viewSize.width} y2={l.sy}
                                    stroke={l.isAxis ? 'rgba(251,191,36,0.4)' : 'rgba(148,163,184,0.09)'} strokeWidth={l.isAxis ? 1.4 : 1} strokeDasharray={l.isAxis ? 'none' : '4 6'} />
                            ))}
                            {vLines.filter(l => !l.isAxis).map(l => (
                                <text key={`vx${l.sx}`} x={l.sx + 3} y={(pivotY + 3)} fill="rgba(148,163,184,0.5)" fontSize="9">
                                    {l.k * gridStep === 0 ? '' : (l.k * gridStep).toFixed(gridStep === 0.5 ? 1 : 0)}
                                </text>
                            ))}
                            {hLines.filter(l => !l.isAxis && l.k * gridStep !== 0).filter(l => l.sy > 12 && l.sy < viewSize.height - 4).map(l => (
                                <text key={`hy${l.sy}`} x={(pivotX + 4)} y={l.sy - 3} fill="rgba(148,163,184,0.5)" fontSize="9">
                                    {(l.k * gridStep).toFixed(gridStep === 0.5 ? 1 : 0)}
                                </text>
                            ))}
                            <text x={pivotX - 24} y={(pivotY + 16)} fill="rgba(251,191,36,0.75)" fontSize="9.5" fontStyle="italic">origin</text>
                        </g>
                    )}

                    {/* ── CHAOS TWIN PATH (drawn under trails) ── */}
                    {chaosMode && snapshot.dual && snapshot.dual.strobeHistory && (
                        <g pointerEvents="none">
                            <path
                                d={snapshot.dual.strobeHistory.map((pt, i) =>
                                    `${i === 0 ? 'M' : 'L'}${(pivotX + pt.x2 * pxm).toFixed(1)},${((pivotY - pt.y2 * pxm)).toFixed(1)}`).join(' ')}
                                fill="none" stroke="rgba(217,70,239,0.35)" strokeWidth="1.6" strokeLinecap="round" filter="url(#soft)" />
                            <path
                                d={snapshot.dual.strobeHistory.map((pt, i) =>
                                    `${i === 0 ? 'M' : 'L'}${(pivotX + pt.x2 * pxm).toFixed(1)},${((pivotY - pt.y2 * pxm)).toFixed(1)}`).join(' ')}
                                fill="none" stroke="#e879f9" strokeWidth="1.1" strokeLinecap="round" strokeDasharray="1 6" />
                        </g>
                    )}

                    {/* ── TRAILS ── */}
                    {trails.trail1.length > 1 && (
                        <polyline
                            points={trails.trail1.map(p => `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(' ')}
                            fill="none" stroke="rgba(56,189,248,0.35)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
                    )}
                    {trails.trail2.length > 1 && (
                        <g pointerEvents="none">
                            <polyline
                                points={trails.trail2.map(p => `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(' ')}
                                fill="none" stroke="rgba(167,139,250,0.5)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#soft2)" />
                            <polyline
                                points={trails.trail2.map(p => `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(' ')}
                                fill="none" stroke="#a78bfa" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </g>
                    )}

                    {/* ── RODS (outline + gloss main line) ── */}
                    <line x1={pivotPt.sx} y1={pivotPt.sy} x2={p1.sx} y2={p1.sy}
                        stroke="rgba(0,0,0,0.85)" strokeWidth={7.5} strokeLinecap="round" />
                    <line x1={pivotPt.sx} y1={pivotPt.sy} x2={p1.sx} y2={p1.sy}
                        stroke="url(#rod1Grad)" strokeWidth={5} strokeLinecap="round" />
                    <line x1={pivotPt.sx} y1={pivotPt.sy} x2={p1.sx} y2={p1.sy}
                        stroke="rgba(255,255,255,0.28)" strokeWidth={1} strokeLinecap="round" strokeDasharray="1 7" opacity="0.6" />

                    <line x1={p1.sx} y1={p1.sy} x2={p2.sx} y2={p2.sy}
                        stroke="rgba(0,0,0,0.85)" strokeWidth={7.5} strokeLinecap="round" />
                    <line x1={p1.sx} y1={p1.sy} x2={p2.sx} y2={p2.sy}
                        stroke="url(#rod2Grad)" strokeWidth={5} strokeLinecap="round" />
                    <line x1={p1.sx} y1={p1.sy} x2={p2.sx} y2={p2.sy}
                        stroke="rgba(255,255,255,0.28)" strokeWidth={1} strokeLinecap="round" strokeDasharray="1 7" opacity="0.6" />

                    {/* ── LENGTH DIMENSIONS ── */}
                    {showGrid && (
                        <g stroke="rgba(148,163,184,0.7)" strokeWidth="1">
                            <line x1={rod1Mid.x - 10} y1={rod1Mid.y - 3} x2={rod1Mid.x + 14} y2={rod1Mid.y + 4} />
                            <line x1={rod2Mid.x - 12} y1={rod2Mid.y - 3} x2={rod2Mid.x + 12} y2={rod2Mid.y + 4} />
                            <text x={rod1Mid.x + 8} y={rod1Mid.y - 10} fill="rgba(148,163,184,0.9)" fontSize="10" fontStyle="italic">
                                L₁ = {length1.toFixed(1)} m
                            </text>
                            <text x={rod2Mid.x + 8} y={rod2Mid.y - 10} fill="rgba(148,163,184,0.9)" fontSize="10" fontStyle="italic">
                                L₂ = {length2.toFixed(1)} m
                            </text>
                        </g>
                    )}

                    {/* ── FORCE READOUT TAGS ── */}
                    <text x={p1.sx + 9} y={p1.sy - 7} fill="rgba(56,189,248,0.95)" fontSize="11" fontWeight="600">
                        m₁ = {mass1.toFixed(1)} kg
                    </text>
                    <text x={p2.sx + 12} y={p2.sy - 7} fill="rgba(167,139,250,0.95)" fontSize="11" fontWeight="600">
                        m₂ = {mass2.toFixed(1)} kg
                    </text>

                    {/* ── VELOCITY VECTORS ── */}
                    {showVelocity && (
                        <g strokeLinecap="round">
                            <line x1={p1.sx} y1={p1.sy} x2={p1.sx + velVec1.dx} y2={p1.sy + velVec1.dy}
                                stroke="#7dd3fc" strokeWidth="2" markerEnd="url(#vh)" opacity="0.9" />
                            <line x1={p2.sx} y1={p2.sy} x2={p2.sx + velVec2.dx} y2={p2.sy + velVec2.dy}
                                stroke="#c4b5fd" strokeWidth="2" markerEnd="url(#vh)" opacity="0.95" />
                        </g>
                    )}

                    {/* ── GRAVITY VECTOR (from pivot, along -y) ── */}
                    {showGravity && (
                        <g>
                            <line x1={pivotX + 46} y1={pivotPt.sy - 14} x2={pivotX + 46} y2={pivotPt.sy + gravMax}
                                stroke="#fbbf24" strokeWidth="2" markerEnd="url(#vhG)" opacity="0.9" />
                            <text x={pivotX + 52} y={pivotPt.sy + gravMax - 6} fill="#fbbf24" fontSize="10">
                                g = {gravity.toFixed(2)} m/s²
                            </text>
                        </g>
                    )}

                    {/* ── BOB 2 (drawn first so it sits under rod1 if overlapping) ── */}
                    <circle cx={p2.sx} cy={p2.sy} r={bob2Radius * 2.1} fill="url(#bobGlow2)" opacity="0.55" filter="url(#soft2)" />
                    <circle cx={p2.sx} cy={p2.sy} r={bob2Radius} fill="url(#bob2)" stroke="rgba(226,214,255,0.5)" strokeWidth="1.5" />
                    <ellipse cx={p2.sx - bob2Radius * 0.32} cy={p2.sy - bob2Radius * 0.38} rx={bob2Radius * 0.3} ry={bob2Radius * 0.16} fill="rgba(255,255,255,0.55)" transform={`rotate(-35 ${p2.sx - bob2Radius * 0.32} ${p2.sy - bob2Radius * 0.38})`} />
                    <text x={p2.sx + bob2Radius + 5} y={p2.sy + 4} fill="rgba(216,180,254,0.95)" fontSize="9.5" fontStyle="italic">
                        θ₂ = {t2Deg.toFixed(1)}°
                    </text>

                    {/* ── BOB 1 ── */}
                    <circle cx={p1.sx} cy={p1.sy} r={bob1Radius * 2.1} fill="url(#bobGlow)" opacity="0.5" filter="url(#soft2)" />
                    <circle cx={p1.sx} cy={p1.sy} r={bob1Radius} fill="url(#bob1)" stroke="rgba(200,232,255,0.5)" strokeWidth="1.5" />
                    <ellipse cx={p1.sx - bob1Radius * 0.32} cy={p1.sy - bob1Radius * 0.38} rx={bob1Radius * 0.3} ry={bob1Radius * 0.16} fill="rgba(255,255,255,0.5)" transform={`rotate(-35 ${p1.sx - bob1Radius * 0.32} ${p1.sy - bob1Radius * 0.38})`} />

                    {/* ── JOINT 1 (hinge) ── */}
                    <circle cx={p1.sx} cy={p1.sy} r="5" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
                    <circle cx={p1.sx} cy={p1.sy} r="1.8" fill="#cbd5e1" />

                    {/* ── PIVOT MOUNT (fixed hinge) ── */}
                    <g>
                        <rect x={pivotX - 44} y={pivotPt.sy - 34} width="88" height="11" rx="2" fill="url(#mountPlate)" stroke="rgba(255,255,255,0.12)" />
                        <rect x={pivotX - 5} y={pivotPt.sy - 23} width="10" height="13" fill="url(#mountPlate)" stroke="rgba(255,255,255,0.12)" />
                        <circle cx={pivotX} cy={pivotPt.sy} r="10" fill="#101827" stroke="#475569" strokeWidth="2.2" />
                        <circle cx={pivotX} cy={pivotPt.sy} r="4" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.4" />
                        <line x1={pivotX - 6} y1={pivotPt.sy} x2={pivotX + 6} y2={pivotPt.sy} stroke="#94a3b8" strokeWidth="1" />
                        <text x={pivotX - 40} y={pivotPt.sy - 40} fill="rgba(226,232,240,0.85)" fontSize="10" fontWeight="600" letterSpacing="0.5">
                            PIVOT · FIXED
                        </text>
                    </g>

                    {/* ── ORIGIN TICK LABELS ── */}
                </svg>

                {/* ── TOP-CENTER LIVE READOUT ── */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                    <div className="text-[10px] tracking-[0.18em] uppercase text-slate-400">t = {snapshot.time.toFixed(2)} s</div>
                    <div className="flex items-center gap-2 text-[11px] font-medium">
                        <span className={energyOk ? 'text-emerald-300' : 'text-amber-300'}>
                            E = {totE.toFixed(4)} J
                        </span>
                        <span className={energyOk ? 'text-emerald-400/80' : 'text-amber-400/80'}>
                            ΔE/E = {(energyError * 100).toExponential(1)}%
                        </span>
                        <span className="text-slate-500">· {Math.round(pxm)} px/m</span>
                    </div>
                </div>

                {/* ── CAMERA CONTROLS ── */}
                <div className="absolute bottom-4 left-3 z-20 flex items-center gap-1">
                    <button onClick={cycleCamera} title={cameraMode === 'fit' ? 'Follow M₂ (tracking camera)' : 'Fit whole system on screen'}
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium border transition-colors ${cameraMode === 'follow'
                            ? 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                            : 'bg-white/[0.03] text-slate-300 border-white/10 hover:bg-white/[0.09]'}`}>
                        {cameraMode === 'follow' ? <Magnet size={13} /> : <Maximize2 size={13} />}
                        {cameraMode === 'follow' ? 'Following M₂' : 'Fit system'}
                    </button>
                    <button onClick={() => setZoom(z => Math.min(3, +(z * 1.25).toFixed(3)))} title="Zoom in"
                        className="w-8 h-8 inline-flex items-center justify-center rounded-md bg-white/[0.03] text-slate-300 border border-white/10 hover:bg-white/[0.09]">
                        <ZoomIn size={14} />
                    </button>
                    <button onClick={() => setZoom(z => Math.max(0.3, +(z * 0.8).toFixed(3)))} title="Zoom out"
                        className="w-8 h-8 inline-flex items-center justify-center rounded-md bg-white/[0.03] text-slate-300 border border-white/10 hover:bg-white/[0.09]">
                        <ZoomOut size={14} />
                    </button>
                    <button onClick={() => { setZoom(1); setCameraMode('fit'); }} title="Reset camera"
                        className="w-8 h-8 inline-flex items-center justify-center rounded-md bg-white/[0.03] text-slate-300 border border-white/10 hover:bg-white/[0.09]">
                        <Crosshair size={14} />
                    </button>
                </div>

                {/* ── TELEMETRY PANEL (collapsible) ── */}
                {showTelemetry && (
                    <div className="absolute top-3 right-3 z-20 w-[230px] pointer-events-auto bg-[#0b101c]/85 backdrop-blur border border-white/10 rounded-lg overflow-hidden shadow-xl">
                        <button
                            onClick={() => setTelemetryCollapsed(c => !c)}
                            className="w-full flex items-center justify-between px-3 py-2 text-[10px] tracking-[0.16em] uppercase text-slate-400 hover:text-slate-200 border-b border-white/5">
                            <span className="flex items-center gap-1.5"><Crosshair size={11} className="text-sky-400" /> Telemetry</span>
                            <span className="inline-block transition-transform" style={{ transform: telemetryCollapsed ? 'rotate(90deg)' : 'rotate(-90deg)' }}>›</span>
                        </button>
                        {!telemetryCollapsed && (
                            <div className="px-3 py-2.5 space-y-1.5">
                                <div className="flex justify-between"><span className="text-slate-400">θ₁</span><span className="font-mono text-sky-300">{t1Deg.toFixed(1)}°</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">θ₂</span><span className="font-mono text-violet-300">{t2Deg.toFixed(1)}°</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">ω₁</span><span className="font-mono text-sky-300">{snapshot.omega1.toFixed(2)} rad/s</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">ω₂</span><span className="font-mono text-violet-300">{snapshot.omega2.toFixed(2)} rad/s</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">|v₁|</span><span className="font-mono text-slate-300">{Math.hypot(snapshot.vx1, snapshot.vy1).toFixed(3)} m/s</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">|v₂|</span><span className="font-mono text-slate-300">{Math.hypot(snapshot.vx2, snapshot.vy2).toFixed(3)} m/s</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">KE₁</span><span className="font-mono text-emerald-300">{ke1.toFixed(4)} J</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">KE₂</span><span className="font-mono text-emerald-300">{ke2.toFixed(4)} J</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">PE</span><span className="font-mono text-amber-300">{pe.toFixed(4)} J</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">E (total)</span><span className="font-mono text-emerald-300">{totE.toFixed(4)} J</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">ΔE/E</span><span className={energyOk ? 'font-mono text-emerald-400' : 'font-mono text-amber-400'}>{(energyError * 100).toExponential(1)}%</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">T₁ (tension)</span><span className="font-mono text-cyan-300">{snapshot.tension1.toFixed(3)} N</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">T₂ (tension)</span><span className="font-mono text-cyan-300">{snapshot.tension2.toFixed(3)} N</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Gravity</span><span className="font-mono text-slate-300">{gravity.toFixed(2)} m/s²</span></div>
                                {chaosMode && (
                                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                                        <span className="text-fuchsia-300 text-[10px]">twin | δω₁</span>
                                        <span className="font-mono text-fuchsia-300 text-[10px]">{CHAOS_PERTURBATION} rad</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── PHASE PORTRAIT PANEL ── */}
                {showPhaseSpace && <PhaseSpacePanelWrapped snapshot={snapshot} />}

                {/* ── CHAOS BADGE ── */}
                {chaosMode && (
                    <div className="absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-md px-2 py-1 bg-fuchsia-500/15 border border-fuchsia-400/30 text-fuchsia-300 text-[10px] font-medium">
                        <Sparkles size={11} /> ROGUE DUAL-RUN · twin ⊖ {CHAOS_PERTURBATION} rad
                    </div>
                )}

                {/* ── CHOAA box for hidden texture feel ── */}
                <div className="absolute bottom-3 right-3 z-10 pointer-events-none opacity-40 text-[9px] text-slate-500 font-mono tracking-widest">
                    RK4 · Δt 5ms · {MAX_SIM_STEPS_PER_FRAME} steps/frame max
                </div>
            </div>

            {/* ════ BOTTOM CONTROL DECK ═══════════════════════════════════ */}
            <div className="relative z-30 px-3 pt-1.5 pb-2 bg-[#0c111d]/95 border-t border-white/5 backdrop-blur">
                <div className="flex flex-wrap items-end gap-x-3 gap-y-1.5">
                    {[
                        { label: 'm₁', val: mass1, set: setMass1, min: 0.1, max: 10, step: 0.1, color: 'text-sky-300' },
                        { label: 'm₂', val: mass2, set: setMass2, min: 0.1, max: 10, step: 0.1, color: 'text-violet-300' },
                        { label: 'L₁', val: length1, set: setLength1, min: 0.3, max: 3, step: 0.1, color: 'text-sky-300' },
                        { label: 'L₂', val: length2, set: setLength2, min: 0.3, max: 3, step: 0.1, color: 'text-violet-300' },
                        { label: 'θ₁°', val: theta1, set: setTheta1, min: -180, max: 180, step: 5, color: 'text-sky-300' },
                        { label: 'θ₂°', val: theta2, set: setTheta2, min: -180, max: 180, step: 5, color: 'text-violet-300' },
                        { label: 'ω₁', val: omega1, set: setOmega1, min: -10, max: 10, step: 0.1, color: 'text-sky-300' },
                        { label: 'ω₂', val: omega2, set: setOmega2, min: -10, max: 10, step: 0.1, color: 'text-violet-300' }
                    ].map(p => (
                        <label key={p.label} className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-white/[0.02] border border-white/5 rounded-md px-2 py-1">
                            <span className={p.color + ' font-semibold'}>{p.label}</span>
                            <input
                                type="number" step={p.step} min={p.min} max={p.max} value={p.val}
                                onChange={e => p.set(Number(e.target.value))}
                                className="w-14 bg-transparent text-right font-mono text-[11px] text-slate-200 outline-none"
                            />
                        </label>
                    ))}

                    <label className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-white/[0.02] border border-white/5 rounded-md px-2 py-1">
                        <span className="text-slate-300 font-semibold">g</span>
                        <select value={gravity} onChange={e => setGravity(Number(e.target.value))}
                            className="bg-transparent text-[11px] font-mono text-slate-200 outline-none">
                            {Object.entries(PLANETARY_GRAVITY).map(([k, v]) => (
                                <option key={k} value={v.g}>{v.name} · {v.g}</option>
                            ))}
                            <option value={Math.round(gravity * 100) / 100}>{gravity.toFixed(2)} (custom)</option>
                        </select>
                    </label>

                    <label className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-white/[0.02] border border-white/5 rounded-md px-2 py-1">
                        <span className="text-slate-300 font-semibold">ζ damp</span>
                        <input type="number" min="0" max="2" step="0.01" value={damping}
                            onChange={e => setDamping(Number(e.target.value))}
                            className="w-14 bg-transparent text-right font-mono text-[11px] text-slate-200 outline-none" />
                    </label>

                    <div className="hidden lg:flex items-center gap-2 text-[10px] text-slate-400 ml-1">
                        <span>Energy drift:</span>
                        <div className="w-40 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className={`h-full rounded-full ${energyOk ? 'bg-emerald-400' : 'bg-amber-400'}`}
                                style={{ width: `${Math.min(100, energyError * 5000)}%` }} />
                        </div>
                    </div>
                    <div className="hidden lg:block text-[10px] font-mono text-slate-500 ml-auto">
                        RK4 · fixed Δt {FIXED_DT * 1000} ms · frame-rate independent
                    </div>
                </div>
            </div>

            {/* ── PHYSICS EXPLAINER MODAL ── */}
            {physicsExplainer && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPhysicsExplainer(false)}>
                    <div className="max-w-2xl max-h-[85vh] overflow-y-auto bg-[#0d1322] border border-white/10 rounded-xl shadow-2xl mr-3 ml-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                            <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm"><BookOpen size={15} /> Lagrangian Mechanics of the Double Pendulum</div>
                            <button onClick={() => setPhysicsExplainer(false)} className="p-1 text-slate-400 hover:text-white">✕</button>
                        </div>
                        <div className="px-5 py-4 space-y-4 text-[13px] leading-relaxed text-slate-300">
                            <div>
                                <div className="text-amber-300 font-mono text-[12px] mb-1">Kinetic energy (from velocity components)</div>
                                <code className="block bg-white/[0.04] rounded px-2 py-1.5 font-mono text-[11.5px] text-slate-200">
                                    T = ½m₁(L₁ω₁)² + ½m₂[ (L₁ω₁cosθ₁ + L₂ω₂cosθ₂)² + (L₁ω₁sinθ₁ + L₂ω₂sinθ₂)² ]
                                </code>
                            </div>
                            <div>
                                <div className="text-amber-300 font-mono text-[12px] mb-1">Potential energy (measured from the pivot)</div>
                                <code className="block bg-white/[0.04] rounded px-2 py-1.5 font-mono text-[11.5px] text-slate-200">
                                    V = −m₁g L₁·cosθ₁ − m₂g ( L₁·cosθ₁ + L₂·cosθ₂ )
                                </code>
                            </div>
                            <div>
                                <div className="text-amber-300 font-mono text-[12px] mb-1">Equations of motion (from the Lagrangian, time-derived)</div>
                                <code className="block bg-white/[0.04] rounded px-2 py-1.5 font-mono text-[11.5px] text-slate-200">
                                    Using &quot;real physical&quot; velocity definitions:
                                    vx₁ = L₁ω₁cosθ₁, vy₁ = L₁ω₁sinθ₁ —
                                    the energy stays exact under the constraint that rods &#34;swing only&#34;:
                                    the FIXED-LENGTH constraint is the physical geometry
                                    (the bob is allowed to move on the constraint, which is the real motion).
                                    The conservative system then conserves E to RK4-order — adjoined by explicit damping.
                                </code>
                            </div>
                            <div className="text-slate-400 text-[12px]">
                                <b className="text-slate-200">Chaos toggle</b> initializes a twin with ω₂ perturbed by {CHAOS_PERTURBATION} rad/s. For large θ the motion is chaotic: two nearly identical starts diverge visibly along the purple strobed path — the Lorenz butterfly made of rods.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Phase portrait mini-panel (kept in its own component so only it re-renders) ───
function PhaseSpacePanelWrapped({ snapshot }) {
    const W = 160, H = 150;
    const PAD = 12;
    const s = 0.6;
    const hist = snapshot.strobeHistory || [];
    const pts = hist.map(h => [
        PAD + (h.theta2 + Math.PI) / (2 * Math.PI) * (W - 2 * PAD),
        PAD + (Math.PI - Math.min(Math.PI, Math.max(-Math.PI, h.omega2 * s))) / (2 * Math.PI) * (H - 2 * PAD)
    ]);
    return (
        <div className="absolute top-16 right-3 z-20 w-[190px] bg-[#0b101c]/85 backdrop-blur border border-white/10 rounded-lg overflow-hidden shadow-xl">
            <div className="px-3 py-1.5 text-[10px] tracking-[0.16em] uppercase text-slate-400 border-b border-white/5">Phase portrait</div>
            <svg width={W} height={H} className="m-2 border border-white/5 rounded">
                {pts.filter((_, i) => i % 2 === 0).map((p, i) => (
                    <circle key={i} cx={p[0]} cy={p[1]} r="1.2" fill="rgba(167,139,250,0.45)" />
                ))}
                <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="rgba(148,163,184,0.4)" />
                <line x1={W - PAD} y1={H - PAD} x2={W - PAD} y2={PAD} stroke="rgba(148,163,184,0.4)" />
                <text x={W - PAD + 4} y={(H + PAD) / 2} fill="rgba(148,163,184,0.6)" fontSize="8" transform={`rotate(90 ${W - PAD + 4} ${(H + PAD) / 2})`}>ω₂</text>
                <text x={(W + PAD) / 2} y={H - PAD + 10} fill="rgba(148,163,184,0.6)" fontSize="8" textAnchor="middle">θ₂</text>
            </svg>
        </div>
    );
}