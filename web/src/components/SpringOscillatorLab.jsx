import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Play, Square, RefreshCw, SkipForward, Activity, Crosshair,
    Maximize2, ZoomIn, ZoomOut, BookOpen, Magnet, LineChart, Gauge,
    Layers
} from 'lucide-react';
import useStore from '../store/useStore';
import SpringOscillatorPhysicsSolver from '../utils/solvers/springOscillatorSolver';

const PLANETARY_GRAVITY = {
    earth: { name: 'Earth', g: 9.81 },
    moon: { name: 'Moon', g: 1.62 },
    mars: { name: 'Mars', g: 3.71 },
    zero: { name: 'Zero G', g: 0 }
};

const SIM_PRESETS = {
    classic: {
        name: 'Classic', mass: 1, springConstant: 10, naturalLength: 1,
        x0: 0.2, v0: 0, gravity: 9.81, damping: 0
    },
    soft: {
        name: 'Soft Spring', mass: 1, springConstant: 3, naturalLength: 1,
        x0: 0.35, v0: 0, gravity: 9.81, damping: 0
    },
    stiff: {
        name: 'Stiff Spring', mass: 1, springConstant: 50, naturalLength: 0.8,
        x0: 0.06, v0: 0, gravity: 9.81, damping: 0
    },
    heavy: {
        name: 'Heavy Mass', mass: 5, springConstant: 10, naturalLength: 1,
        x0: 0.4, v0: 0, gravity: 9.81, damping: 0.5
    }
};

// Damping termination by target ζ: c = 2ζ√(mk)
const DAMPING_PRESETS = [
    { name: 'Under', zeta: 0.15 },
    { name: 'Critical', zeta: 1.0 },
    { name: 'Over', zeta: 1.6 }
];

const FIXED_DT = 0.005;                 // fixed physics timestep (s) — frame-rate independent
const MAX_SIM_STEPS_PER_FRAME = 200;
const MIN_PX_PER_METER = 16;
const MAX_PX_PER_METER = 220;
const SPRING_COILS = 13;                // coil count for the visible spring

const fmt = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');

// ─── Spring coil geometry: support plate → mass top, driven by CURRENT spring length ───
// Returns a screen-space polyline that exactly spans attachTopY..massTopY so the
// spring visibly stretches/compresses 1:1 with the physics state.
function buildSpringGeometry(attachTopY, massTopY, coils, radius) {
    const span = massTopY - attachTopY;
    const pitch = span / coils;
    const pts = [{ x: 0, y: attachTopY }];
    for (let i = 1; i <= coils; i++) {
        const side = i % 2 === 1 ? radius : -radius;
        pts.push({ x: side, y: attachTopY + (i - 0.5) * pitch });
        pts.push({ x: 0, y: attachTopY + i * pitch });
    }
    pts.push({ x: 0, y: massTopY });
    return pts;
}

// ─── Proportional, physics-driven arrow ────────────────────────────────────────────
// length ∝ |value|/reference × maxPx (clamped) — arrows scale with the REAL quantity.
function vectorLen(value, reference, maxPx) {
    if (reference <= 0) return 0;
    return Math.max(0, Math.min(maxPx, Math.abs(value) / reference * maxPx));
}

export default function SpringOscillatorLab() {
    const isPlaying = useStore(state => state.isPlaying);
    const togglePlayback = useStore(state => state.togglePlayback);
    const setLabData = useStore(state => state.setLabData);
    const clearLabData = useStore(state => state.clearLabData);

    // ── Physical parameters (Spec defaults) ─────────────────────────────────
    const [mass, setMass] = useState(1.0);
    const [springConstant, setSpringConstant] = useState(10.0);
    const [naturalLength, setNaturalLength] = useState(1.0);
    const [x0, setX0] = useState(0.2);
    const [v0, setV0] = useState(0.0);
    const [gravity, setGravity] = useState(9.81);
    const [damping, setDamping] = useState(0.0);
    const [timeScale, setTimeScale] = useState(1.0);

    // ── Forced oscillation ─────────────────────────────────────────────────
    const [forced, setForced] = useState(false);
    const [forceAmplitude, setForceAmplitude] = useState(2.0);
    const [drivingFrequency, setDrivingFrequency] = useState(4.0);

    // ── Visualization toggles ───────────────────────────────────────────────
    const [showScale, setShowScale] = useState(true);
    const [showGravityV, setShowGravityV] = useState(true);
    const [showSpringF, setShowSpringF] = useState(true);
    const [showNetF, setShowNetF] = useState(false);
    const [showVelV, setShowVelV] = useState(false);
    const [showAccV, setShowAccV] = useState(false);
    const [showTrail, setShowTrail] = useState(true);        // mass motion trace in the canvas
    const [showTelemetry, setShowTelemetry] = useState(true);
    const [telemetryCollapsed, setTelemetryCollapsed] = useState(false);
    const [showGraphs, setShowGraphs] = useState(false);
    const [graphTab, setGraphTab] = useState('xt');
    const [resonanceWanted, setResonanceWanted] = useState(false);
    const [showAnalytical, setShowAnalytical] = useState(false);
    const [physicsExplainer, setPhysicsExplainer] = useState(false);

    // ── Camera ──────────────────────────────────────────────────────────────
    const [cameraMode, setCameraMode] = useState('fit');   // 'fit' | 'follow'
    const [zoom, setZoom] = useState(1.0);

    const solverRef = useRef(new SpringOscillatorPhysicsSolver({
        mass, springConstant, naturalLength, gravity, damping,
        x0, v0, forced, forceAmplitude, drivingFrequency, timeScale: 1.0
    }));
    const [snapshot, setSnapshot] = useState(solverRef.current.getSnapshot());

    // ─── Derived physical constants (recomputed every render from LIVE params) ──
    const omega0 = Math.sqrt(springConstant / mass);             // ω₀ = √(k/m)
    const period = 2 * Math.PI * Math.sqrt(mass / springConstant);
    const naturalFreq = omega0 / (2 * Math.PI);
    const dampingRatio = damping / (2 * Math.sqrt(mass * springConstant)); // ζ = c/2√(mk)
    const ampHat = Math.hypot(x0, v0 / omega0);                       // A₀ = √(x₀² + (v₀/ω₀)²)
    const dampClass = dampingRatio < 1 - 1e-9 ? 'Underdamped' : dampingRatio > 1 + 1e-9 ? 'Overdamped' : 'Critically damped';

    // ─── Lab ⇄ Store bridge (Inspector telemetry) ───────────────────────────
    useEffect(() => {
        setLabData({
            title: 'Spring Oscillator · SHM Lab',
            type: 'spring_oscillator',
            snapshot: {
                time: snapshot.time,
                x: snapshot.x, v: snapshot.v, a: snapshot.a,
                y: snapshot.y, yEq: snapshot.yEq,
                springLength: snapshot.springLength, deltaL: snapshot.deltaL,
                fSpring: snapshot.fSpring, fGravity: snapshot.fGravity, fNet: snapshot.fNet,
                omega0: snapshot.omega0, period: snapshot.period, naturalFrequency: snapshot.naturalFrequency,
                ke: snapshot.ke, peSpring: snapshot.peSpring, peGravity: snapshot.peGravity,
                totalEnergy: snapshot.totalEnergy, energyErrorPct: snapshot.energyErrorPct,
                damping: snapshot.damping, dampingRatio: snapshot.dampingRatio, dampingClass: snapshot.dampingClass,
                analyticalX: snapshot.analyticalX, analyticalError: snapshot.analyticalError,
                forced: snapshot.forced, forceAmplitude: snapshot.forceAmplitude,
                drivingFrequency: snapshot.drivingFrequency,
                isResting: !isPlaying,
                energy: { total: snapshot.totalEnergy, potential: snapshot.peSpring + snapshot.peGravity, kinetic: snapshot.ke },
                config: { dt: FIXED_DT, mass, springConstant, naturalLength, gravity, damping, timeScale }
            },
            config: { mass, springConstant, naturalLength, x0, v0, gravity, damping, timeScale, forced, forceAmplitude, drivingFrequency },
            // flat fields
            time: snapshot.time, displacement: snapshot.x, velocity: snapshot.v, acceleration: snapshot.a,
            energy: snapshot.totalEnergy, energyError: snapshot.energyErrorPct
        });
        return () => clearLabData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [snapshot, mass, springConstant, naturalLength, gravity, damping, timeScale, forced]);

    // ─── Listen for Inspector → lab parameter changes ───────────────────────
    useEffect(() => {
        const handleConfigChange = (event) => {
            const { type, key, value } = (event && event.detail) || {};
            if (type !== 'spring_oscillator') return;
            switch (key) {
                case 'mass': setMass(value); break;
                case 'springConstant': setSpringConstant(value); break;
                case 'naturalLength': setNaturalLength(value); break;
                case 'x0': setX0(value); break;
                case 'v0': setV0(value); break;
                case 'gravity': setGravity(value); break;
                case 'damping': setDamping(value); break;
                case 'timeScale': setTimeScale(value); break;
                case 'forced': setForced(!!value); break;
                case 'forceAmplitude': setForceAmplitude(value); break;
                case 'drivingFrequency': setDrivingFrequency(value); break;
                default: break;
            }
        };
        window.addEventListener('lab-config-change', handleConfigChange);
        return () => window.removeEventListener('lab-config-change', handleConfigChange);
    }, []);

    // ─── Parameters → solver (reset updates initial conditions precisely) ───
    useEffect(() => {
        solverRef.current.updateConfig({
            mass, springConstant, naturalLength, gravity, damping, x0, v0,
            forced, forceAmplitude, drivingFrequency,
            timeScale: 1.0
        });
        setSnapshot({ ...solverRef.current.getSnapshot() });
    }, [mass, springConstant, naturalLength, gravity, damping, x0, v0, forced, forceAmplitude, drivingFrequency]);

    // ─── Fixed-timestep physics loop (accumulator, frame-rate independent) ───
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

    const handleStep = () => {
        solverRef.current.step(FIXED_DT);
        setSnapshot({ ...solverRef.current.getSnapshot() });
    };

    const handleReset = () => {
        solverRef.current.reset();
        setSnapshot({ ...solverRef.current.getSnapshot() });
        setZoom(1.0);
        setCameraMode('fit');
    };

    const applyPreset = (key) => {
        const p = SIM_PRESETS[key];
        if (!p) return;
        setMass(p.mass); setSpringConstant(p.springConstant);
        setNaturalLength(p.naturalLength); setX0(p.x0); setV0(p.v0);
        setGravity(p.gravity); setDamping(p.damping);
        setForced(false);
        handleReset();
    };

    const applyDampingPreset = (zeta) => {
        setDamping(+(2 * zeta * Math.sqrt(mass * springConstant)).toFixed(3));
    };

    const cycleCamera = () => setCameraMode(m => m === 'fit' ? 'follow' : 'fit');
    const GRAPH_TABS = [
        { id: 'xt', label: 'x(t)' },
        { id: 'vt', label: 'v(t)' },
        { id: 'et', label: 'E(t)' },
        { id: 'phase', label: 'x–v' },
        { id: 'fx', label: 'F–x' },
        { id: 'res', label: 'Resonance' }
    ];

    // ─── PART3_MARKER ───

    // ─── Viewport ────────────────────────────────────────────────────────────
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

    // ─── Camera / auto-framing ───────────────────────────────────────────────
    // Frame: support + spring + mass + equilibrium + expected sweep (A₀ with headroom),
    // then keep expanding if |x| runs beyond — the hero never leaves the viewport.
    const forcedMargin = forced ? (forceAmplitude / Math.max(springConstant, 1)) * 1.35 : 0;
    const aScene = Math.max(0.35, ampHat * 1.9, Math.abs(snapshot.x) * 1.55, forcedMargin);
    const topM = -0.16;
    const bottomM = snapshot.yEq + aScene + 0.16;
    const spanM = Math.max(0.5, bottomM - topM);
    const centerFitM = (topM + bottomM) / 2;
    const usablePx = viewSize.height * 0.84;
    const basePxm = Math.min(MAX_PX_PER_METER, Math.max(MIN_PX_PER_METER, usablePx / spanM));
    const pxm = basePxm * zoom;
    const centerM = cameraMode === 'follow' ? snapshot.y : centerFitM;

    const sy = (my) => viewSize.height / 2 + (my - centerM) * pxm;

    // ─── Geometric anchors (screen coords) ───────────────────────────────────
    const supportY = sy(0);                       // spring attach point at the mount plate
    const blockW = Math.max(54, Math.min(130, 0.42 * pxm));
    const blockH = Math.max(26, Math.min(64, 0.20 * pxm));
    const blockY = sy(snapshot.y);                // mass CENTER (screen)
    const massTopY = sy(snapshot.y - 0.20 / 2) ;  // top face → spring attaches here
    const eqY = sy(snapshot.yEq);                 // equilibrium line (screen)

    const coilRadius = Math.max(12, Math.min(30, 0.13 * pxm));
    const springPts = (() => {
        // clamp geometry so the spring always stays exactly between support & mass top
        const p = buildSpringGeometry(supportY, massTopY, SPRING_COILS, coilRadius);
        const off = viewSize.width / 2;
        return p.map(pt => `${(off + pt.x).toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
    })();

    // ─── Force / velocity vector readouts (ACTUAL physics magnitudes) ────────
    const fGrav = mass * gravity;                  // F_g = mg (N)
    const fSpr = springConstant * snapshot.x;      // F_s = -kx (N, signed toward equilibrium)
    const fNet = mass * Math.abs(snapshot.a);      // F_net = |ma| (N)
    const forceRef = Math.max(fGrav, 1);
    const velRef = Math.max(omega0 * ampHat, 0.05);
    const accRefMax = Math.max(omega0 * omega0 * ampHat, 0.05);
    const maxArrow = 0.30 * viewSize.height;

    // signed direction helpers (screen y grows downward)
    const gravArrowLen = vectorLen(fGrav, forceRef, maxArrow);
    const sprArrowLen = vectorLen(fSpr, forceRef, maxArrow);
    const netArrowLen = vectorLen(fNet, forceRef, maxArrow);
    const velArrowLen = vectorLen(snapshot.v, velRef, maxArrow);
    const accArrowLen = vectorLen(snapshot.a, accRefMax, maxArrow);
    const dirOf = (val) => val > 0 ? 1 : -1;       // +1 = downward on screen
    const upDown = (val) => dirOf(val) === 1 ? 1 : -1;

    // ─── Motion trace (mass-center history → vertical streak) ───────────────
    const trace = useMemo(() => {
        const hist = snapshot.strobeHistory || [];
        if (!hist.length) return '';
        return hist.map(h => `${viewSize.width / 2},${sy(h.y).toFixed(1)}`).join(' ');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [snapshot, viewSize, pxm, centerM]);

    const massLabel = `m = ${fmt(mass)} kg`;

    // ─── Graph data (real simulation history) ────────────────────────────────
    const lastN = Math.min(Math.max(8, 4 * period), 60);   // seconds of history to show
    const histWin = useMemo(() => {
        const h = snapshot.history;
        const n = h.t.length;
        if (!n) return null;
        const t0 = Math.max(0, snapshot.time - lastN);
        let idx = 0;
        for (let i = n - 1; i >= 0; i--) { if (h.t[i] >= t0) idx = i; else break; }
        return { h, idx };
    }, [snapshot, lastN]);

    const resonanceCurve = useMemo(() => {
        if (graphTab !== 'res') return null;
        const w0v = Math.sqrt(springConstant / mass);
        const curve = solverRef.current.sweepResonance(Math.max(0.05, w0v * 0.15), w0v * 2.2, 72);
        return curve;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [graphTab, mass, springConstant, damping, forceAmplitude]);

    // ─── Header button classes ───────────────────────────────────────────────
    const btnBase = 'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors';
    const btnIdle = btnBase + ' bg-white/[0.03] text-slate-300 hover:bg-white/[0.09] hover:text-white border border-white/[0.06]';
    const btnOn = btnBase + ' bg-sky-500/20 text-sky-300 border border-sky-400/40 hover:bg-sky-500/30';
    const presetsKeys = Object.keys(SIM_PRESETS);

    // ─── PART4_MARKER ───

    // ═══════════════════════════════════════════════════════════════════════
    return (
        <div className="relative flex flex-col w-full h-full bg-[#0a0e17] text-slate-200 overflow-hidden select-none">

            {/* ════ HEADER ═══════════════════════════════════════════════════ */}
            <div className="relative z-30 flex flex-wrap items-center gap-x-2 gap-y-1.5 px-3 py-2 bg-[#0c111d]/90 border-b border-white/5 backdrop-blur">
                <div className="flex items-center gap-1.5 mr-1">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-400/30 to-sky-500/30 border border-white/10 flex items-center justify-center">
                        <Gauge size={14} className="text-emerald-300" />
                    </div>
                    <span className="text-xs font-semibold tracking-wide text-slate-200">Spring Oscillator</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-400/25 uppercase tracking-widest ml-0.5">SHM Lab</span>
                </div>

                <div className="h-5 w-px bg-white/10 mx-1" />

                <select value="" onChange={e => { if (e.target.value) applyPreset(e.target.value); e.target.value = ''; }}
                    className="bg-[#121a2c] border border-white/10 rounded-md px-2 py-1 text-[11px] text-slate-300 outline-none focus:border-sky-400/50">
                    <option value="" disabled>Preset…</option>
                    {presetsKeys.map(k => <option key={k} value={k}>{SIM_PRESETS[k].name}</option>)}
                </select>

                <div className="h-5 w-px bg-white/10 mx-1" />

                <button onClick={togglePlayback} className={isPlaying ? btnOn : btnIdle} title="Play / Pause">
                    {isPlaying ? <Square size={13} /> : <Play size={13} />} {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button onClick={handleStep} className={btnIdle} title="Step one fixed timestep (5 ms)">
                    <SkipForward size={13} /> Step
                </button>
                <button onClick={handleReset} className={btnIdle} title="Reset to initial conditions">
                    <RefreshCw size={13} /> Reset
                </button>
                <select value={timeScale} onChange={e => setTimeScale(Number(e.target.value))}
                    className="bg-[#121a2c] border border-white/10 rounded-md px-1.5 py-1 text-[11px] text-slate-300 outline-none focus:border-sky-400/50"
                    title="Simulation speed">
                    {[0.1, 0.25, 0.5, 1, 2, 5, 10].map(s => (
                        <option key={s} value={s}>{s === 1 ? '1× speed' : `${s}× speed`}</option>
                    ))}
                </select>

                <div className="h-5 w-px bg-white/10 mx-1" />

                <button onClick={() => setShowScale(s => !s)} className={showScale ? btnOn : btnIdle} title="Engineering ruler + gridlines">
                    <Layers size={13} /> Scale
                </button>
                <button onClick={() => setShowTrail(t => !t)} className={showTrail ? btnOn : btnIdle} title="Mass motion trace">
                    <Activity size={13} /> Trace
                </button>
                <button onClick={() => setShowGravityV(g => !g)} className={showGravityV ? btnOn : btnIdle} title="Gravity force vector mg">
                    <span className="font-mono text-[11px]">g</span>
                </button>
                <button onClick={() => setShowSpringF(s => !s)} className={showSpringF ? btnOn : btnIdle} title="Spring restoring force −kx">
                    <span className="font-mono text-[11px]">F_s</span>
                </button>
                <button onClick={() => setShowNetF(n => !n)} className={showNetF ? btnOn : btnIdle} title="Net force ma">
                    <span className="font-mono text-[11px]">F_net</span>
                </button>
                <button onClick={() => setShowVelV(v => !v)} className={showVelV ? btnOn : btnIdle} title="Velocity vector">
                    <span className="font-mono text-[11px]">v</span>
                </button>
                <button onClick={() => setShowAccV(a => !a)} className={showAccV ? btnOn : btnIdle} title="Acceleration vector">
                    <span className="font-mono text-[11px]">a</span>
                </button>
                <button onClick={() => setShowAnalytical(s => !s)} className={showAnalytical ? btnOn : btnIdle} title="Overlay analytical solution for validation">
                    <Crosshair size={13} /> Analytical
                </button>

                <div className="flex-1" />

                <button onClick={() => setShowGraphs(g => !g)} className={showGraphs ? btnOn : btnIdle} title="Scientific graphs">
                    <LineChart size={13} /> Graphs
                </button>
                <button onClick={() => setResonanceWanted(r => !r)} className={(resonanceWanted || forced) ? 'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-400/40' : btnIdle} title="Forced oscillation + resonance">
                    <Activity size={13} /> Resonance
                </button>
                <button onClick={() => setShowTelemetry(t => !t)} className={showTelemetry ? btnOn : btnIdle} title="Telemetry panel">
                    <Gauge size={13} /> Telemetry
                </button>
                <button onClick={() => setPhysicsExplainer(true)} className={btnIdle} title="Equations behind the oscillator">
                    <BookOpen size={13} /> Explain
                </button>
            </div>

            {/* ════ MAIN CANVAS ═════════════════════════════════════════════ */}
            <div ref={containerRef} className="relative flex-1 min-h-0 overflow-hidden">
                <svg className="absolute inset-0 w-full h-full block"
                    style={{ background: 'radial-gradient(120% 90% at 50% 25%, #101827 0%, #0a0e17 55%, #070a11 100%)' }}>
                    <defs>
                        <linearGradient id="springGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#e2e8f0" />
                            <stop offset="55%" stopColor="#94a3b8" />
                            <stop offset="100%" stopColor="#64748b" />
                        </linearGradient>
                        <linearGradient id="blockGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34d399" />
                            <stop offset="55%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#047857" />
                        </linearGradient>
                        <linearGradient id="plateGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#94a3b8" />
                            <stop offset="100%" stopColor="#334155" />
                        </linearGradient>
                        <radialGradient id="bobGlowS" cx="0.5" cy="0.5" r="0.5">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                        </radialGradient>
                        <filter id="springSoft" x="-120%" y="-120%" width="340%" height="340%"><feGaussianBlur stdDeviation="2.5" /></filter>
                        <filter id="softBig" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="7" /></filter>
                        <marker id="vhS" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="currentColor" /></marker>
                    </defs>

                    {/* ── Engineering ruler + horizontal gridlines ── */}
                    {showScale && (() => {
                        const step = pxm >= 40 ? 0.25 : 0.5;
                        const lines = [];
                        const kTop = Math.ceil((centerM + viewSize.height / 2 / pxm) / step);
                        const kBot = Math.floor((centerM - viewSize.height / 2 / pxm) / step);
                        for (let k = kBot; k <= kTop; k++) {
                            const yv = k * step;
                            const yy = sy(yv);
                            if (yy < 0 || yy > viewSize.height) continue;
                            lines.push({ yv, yy, k });
                        }
                        return (
                            <g>
                                {lines.map(l => l.k === 0 ? null : (
                                    <line key={l.k} x1={0} y1={l.yy} x2={viewSize.width} y2={l.yy}
                                        stroke="rgba(148,163,184,0.08)" strokeWidth="1" strokeDasharray="5 7" />
                                ))}
                                {lines.filter(l => l.yy > 30 && l.yy < viewSize.height - 8).map(l => (
                                    <g key={'r' + l.k}>
                                        <line x1={16} y1={l.yy} x2={22} y2={l.yy} stroke="rgba(148,163,184,0.5)" />
                                        <text x={24} y={l.yy + 3} fill="rgba(148,163,184,0.55)" fontSize="9">{l.yv.toFixed(2)} m</text>
                                    </g>
                                ))}
                            </g>
                        );
                    })()}
                    {/* center axis */}
                    <line x1={viewSize.width / 2} y1={0} x2={viewSize.width / 2} y2={viewSize.height}
                        stroke="rgba(148,163,184,0.13)" strokeWidth="1" strokeDasharray="2 6" />

                    {/* ── Motion trace (real history, vertical envelope) ── */}
                    {showTrail && trace && (
                        <polyline points={trace} fill="none" stroke="rgba(16,185,129,0.35)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#softBig)" />
                    )}

                    {/* ── EQUILIBRIUM line (fixed; x = 0) ── */}
                    <g>
                        <line x1={viewSize.width * 0.06} y1={eqY} x2={viewSize.width * 0.94} y2={eqY}
                            stroke="rgba(251,191,36,0.75)" strokeWidth="2" strokeDasharray="10 6" />
                        <circle cx={viewSize.width / 2} cy={eqY} r="4" fill="#fbbf24" />
                        <g transform={`translate(${viewSize.width / 2 + 10}, ${eqY + 16})`} className="pointer-events-none">
                            <rect width="168" height="18" rx="4" fill="rgba(251,191,36,0.12)" stroke="rgba(251,191,36,0.4)" />
                            <text x="84" y="12" textAnchor="middle" fill="#fcd34d" fontSize="10" fontWeight="600" letterSpacing="0.4">
                                EQUILIBRIUM · x = 0
                            </text>
                        </g>
                    </g>

                    {/* ── SPRING (geometry rebuilt every frame from PHYSICS y) ── */}
                    <polyline points={springPts} fill="none" stroke="rgba(0,0,0,0.8)" strokeWidth={7.5} strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points={springPts} fill="none" stroke="url(#springGrad)" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points={springPts} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 6" opacity="0.5" />

                    {/* ── FORCE / KINEMATIC VECTORS (proportional to real values) ── */}
                    {(() => {
                        const off = blockW / 2;
                        const baseX = viewSize.width / 2;
                        const bx = baseX, by = blockY;
                        return (
                            <g strokeLinecap="round">
                                {showGravityV && gravArrowLen > 2 && (
                                    <g>
                                        <line x1={bx - off} y1={by} x2={bx - off} y2={by + gravArrowLen} stroke="#fb7185" strokeWidth="2.4" markerEnd="url(#vhS)" opacity="0.95" />
                                        <text x={bx - off - 6} y={by - 8} textAnchor="end" fill="#fb7185" fontSize="10" fontWeight="600">mg</text>
                                    </g>
                                )}
                                {showSpringF && sprArrowLen > 2 && (
                                    <g>
                                        <line x1={bx} y1={by} x2={bx} y2={by + dirOf(snapshot.x) * -sprArrowLen} stroke="#38bdf8" strokeWidth="2.4" markerEnd="url(#vhS)" opacity="0.95" />
                                        <text x={bx + 7} y={by - 10} fill="#38bdf8" fontSize="10" fontWeight="600">F_s = −kx</text>
                                    </g>
                                )}
                                {showNetF && netArrowLen > 2 && (
                                    <g>
                                        <line x1={bx + off} y1={by} x2={bx + off} y2={by + dirOf(snapshot.a) * netArrowLen} stroke="#a78bfa" strokeWidth="2.4" markerEnd="url(#vhS)" opacity="0.95" />
                                        <text x={bx + off + 7} y={by + dirOf(snapshot.a) * netArrowLen + (dirOf(snapshot.a) > 0 ? 12 : -4)} fill="#a78bfa" fontSize="10" fontWeight="600">F_net = m·a</text>
                                    </g>
                                )}
                                {showVelV && velArrowLen > 2 && (
                                    <g>
                                        <line x1={bx - off - 14} y1={by} x2={bx - off - 14} y2={by + dirOf(snapshot.v) * velArrowLen} stroke="#22d3ee" strokeWidth="2" markerEnd="url(#vhS)" opacity="0.9" />
                                        <text x={bx - off - 18} y={by - 8} textAnchor="end" fill="#22d3ee" fontSize="10">v</text>
                                    </g>
                                )}
                                {showAccV && accArrowLen > 2 && (
                                    <g>
                                        <line x1={bx + off + 16} y1={by} x2={bx + off + 16} y2={by + upDown(snapshot.a) * accArrowLen} stroke="#fbbf24" strokeWidth="2" markerEnd="url(#vhS)" opacity="0.9" />
                                        <text x={bx + off + 20} y={by - 8} fill="#fbbf24" fontSize="10">a</text>
                                    </g>
                                )}
                            </g>
                        );
                    })()}

                    {/* ── MASS BLOCK (moves strictly with PHYSICS y) ── */}
                    <circle cx={viewSize.width / 2} cy={blockY} r={blockW * 0.75} fill="url(#bobGlowS)" opacity="0.5" filter="url(#softBig)" />
                    <g>
                        <rect x={viewSize.width / 2 - blockW / 2} y={blockY - blockH / 2} width={blockW} height={blockH} rx="5"
                            fill="url(#blockGrad)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
                        {/* machined cross-hatch */}
                        <g stroke="rgba(255,255,255,0.16)" strokeWidth="0.8">
                            <line x1={viewSize.width / 2 - blockW / 2 + 4} y1={blockY + blockH / 2 - 4} x2={viewSize.width / 2 + blockW / 2 - 4} y2={blockY - blockH / 2 + 4} />
                            <line x1={viewSize.width / 2 - blockW / 2 + 4} y1={blockY - blockH / 2 + 4} x2={viewSize.width / 2 + blockW / 2 - 4} y2={blockY + blockH / 2 - 4} />
                        </g>
                        <text x={viewSize.width / 2} y={blockY + 4} textAnchor="middle" fill="#052e1b" fontSize="11" fontWeight="700">{massLabel}</text>
                        {/* attachment eye (spring connects here) */}
                        <circle cx={viewSize.width / 2} cy={massTopY} r="5" fill="#101827" stroke="#a7f3d0" strokeWidth="1.6" />
                        <circle cx={viewSize.width / 2} cy={massTopY} r="1.6" fill="#a7f3d0" />
                        {/* analytic ghost (validation overlay only) */}
                        {showAnalytical && (
                            <circle cx={viewSize.width / 2} cy={sy(snapshot.yEq + snapshot.analyticalX)} r="10"
                                fill="none" stroke="rgba(253,186,116,0.7)" strokeWidth="1.5" strokeDasharray="3 3" />
                        )}
                    </g>
                    <text x={viewSize.width / 2 + blockW / 2 + 14} y={blockY + blockH / 2 + 4}
                        fill="rgba(134,239,172,0.95)" fontSize="10" fontStyle="italic">
                        ΔL = {fmt(snapshot.deltaL)} m
                    </text>

                    {/* ── FIXED SUPPORT (ceiling + bracket) ── */}
                    <g>
                        <line x1={viewSize.width * 0.02} y1={supportY - 30} x2={viewSize.width * 0.98} y2={supportY - 30}
                            stroke="#475569" strokeWidth="4" strokeLinecap="round" />
                        <g fill="#475569">
                            <circle cx={viewSize.width * 0.05} cy={supportY - 30} r="4" />
                            <circle cx={viewSize.width * 0.95} cy={supportY - 30} r="4" />
                        </g>
                        <rect x={viewSize.width / 2 - 56} y={supportY - 30} width="112" height="16" rx="3" fill="url(#plateGrad)" stroke="rgba(255,255,255,0.15)" />
                        <rect x={viewSize.width / 2 - 5} y={supportY - 14} width="10" height="11" fill="url(#plateGrad)" stroke="rgba(255,255,255,0.15)" />
                        <line x1={viewSize.width * 0.04} y1={supportY - 26} x2={viewSize.width * 0.04} y2={supportY + 8} stroke="rgba(71,85,105,0.6)" strokeWidth="1.6" />
                        <line x1={viewSize.width * 0.96} y1={supportY - 26} x2={viewSize.width * 0.96} y2={supportY + 8} stroke="rgba(71,85,105,0.6)" strokeWidth="1.6" />
                        <text x={viewSize.width / 2} y={supportY - 40} textAnchor="middle" fill="rgba(226,232,240,0.85)" fontSize="10" fontWeight="600" letterSpacing="0.6">FIXED SUPPORT</text>
                    </g>
                </svg>

                {/* ── FORCED / RESONANCE BADGE ── */}
                {(forced || resonanceWanted) && (
                    <div className="absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-md px-2 py-1 bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[10px] font-medium">
                        <Activity size={11} /> DRIVEN · ω_d = {fmt(Math.abs(drivingFrequency), 2)} rad/s
                        {omega0 > 0 && (Math.abs(Math.abs(drivingFrequency) - omega0) / omega0) < 0.15 && (
                            <span className="text-amber-200 font-bold">· ω_d ≈ ω₀ → RESONANCE</span>
                        )}
                    </div>
                )}

                {/* ── TOP-CENTER READOUT ── */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center">
                    <div className="text-[10px] tracking-[0.18em] uppercase text-slate-400">t = {fmt(snapshot.time)} s</div>
                    <div className="flex items-center gap-2 text-[11px] font-medium justify-center">
                        <span className="text-emerald-300">x = {fmt(snapshot.x, 3)} m</span>
                        <span className="text-slate-500">|</span>
                        <span className="text-sky-300">v = {fmt(snapshot.v, 3)}</span>
                        <span className="text-slate-400">ω₀ = {fmt(omega0)} rad/s</span>
                        <span className="text-slate-400">T = {fmt(period, 3)} s</span>
                    </div>
                </div>

                {/* ── CAMERA CONTROLS ── */}
                <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1">
                    <button onClick={cycleCamera} title={cameraMode === 'fit' ? 'Follow the mass' : 'Fit whole system on screen'}
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium border transition-colors ${cameraMode === 'follow'
                            ? 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                            : 'bg-white/[0.03] text-slate-300 border-white/10 hover:bg-white/[0.09]'}`}>
                        {cameraMode === 'follow' ? <Magnet size={13} /> : <Maximize2 size={13} />}
                        {cameraMode === 'follow' ? 'Following mass' : 'Fit system'}
                    </button>
                    <button onClick={() => setZoom(z => Math.min(3.5, +(z * 1.25).toFixed(3)))} title="Zoom in"
                        className="w-8 h-8 inline-flex items-center justify-center rounded-md bg-white/[0.03] text-slate-300 border border-white/10 hover:bg-white/[0.09]"><ZoomIn size={14} /></button>
                    <button onClick={() => setZoom(z => Math.max(0.35, +(z * 0.8).toFixed(3)))} title="Zoom out"
                        className="w-8 h-8 inline-flex items-center justify-center rounded-md bg-white/[0.03] text-slate-300 border border-white/10 hover:bg-white/[0.09]"><ZoomOut size={14} /></button>
                    <button onClick={() => { setZoom(1); setCameraMode('fit'); }} title="Reset camera"
                        className="w-8 h-8 inline-flex items-center justify-center rounded-md bg-white/[0.03] text-slate-300 border border-white/10 hover:bg-white/[0.09]"><Crosshair size={14} /></button>
                </div>

                {/* ── TELEMETRY (collapsible, right side) ── */}
                {showTelemetry && (
                    <div className="absolute top-3 right-3 z-20 w-[232px] pointer-events-auto bg-[#0b101c]/85 backdrop-blur border border-white/10 rounded-lg overflow-hidden shadow-xl">
                        <button onClick={() => setTelemetryCollapsed(c => !c)}
                            className="w-full flex items-center justify-between px-3 py-2 text-[10px] tracking-[0.16em] uppercase text-slate-400 hover:text-slate-200 border-b border-white/5">
                            <span className="flex items-center gap-1.5"><Gauge size={11} className="text-emerald-400" /> Telemetry</span>
                            <span className="inline-block transition-transform" style={{ transform: telemetryCollapsed ? 'rotate(90deg)' : 'rotate(-90deg)' }}>›</span>
                        </button>
                        {!telemetryCollapsed && (
                            <div className="px-3 py-2 space-y-0.5 text-[11px]">
                                <Row l="Time" v={`${fmt(snapshot.time)} s`} />
                                <Row l="Position (y)" v={`${fmt(snapshot.y, 3)} m`} c="text-slate-200" />
                                <Row l="Displacement (x)" v={`${fmt(snapshot.x, 3)} m`} c="text-emerald-300" />
                                <Row l="Velocity (v)" v={`${fmt(snapshot.v, 3)} m/s`} c="text-sky-300" />
                                <Row l="Acceleration (a)" v={`${fmt(snapshot.a, 3)} m/s²`} c="text-amber-300" />
                                <div className="my-1 border-t border-white/5" />
                                <Row l="Spring length" v={`${fmt(snapshot.springLength, 3)} m`} />
                                <Row l="Extension (ΔL)" v={`${fmt(snapshot.deltaL, 3)} m`} />
                                <Row l="F_spring (kx)" v={`${fmt(snapshot.fSpring, 3)} N`} c="text-sky-300" />
                                <Row l="Gravity (mg)" v={`${fmt(snapshot.fGravity, 3)} N`} c="text-rose-300" />
                                <Row l="Net force (ma)" v={`${fmt(snapshot.fNet, 3)} N`} c="text-violet-300" />
                                <div className="my-1 border-t border-white/5" />
                                <Row l="Mass (m)" v={`${fmt(mass)} kg`} />
                                <Row l="Spring const (k)" v={`${fmt(springConstant)} N/m`} />
                                <Row l="Gravity (g)" v={`${fmt(gravity, 2)} m/s²`} />
                                <div className="my-1 border-t border-white/5" />
                                <Row l="ω₀ = √(k/m)" v={`${fmt(omega0)} rad/s`} c="text-slate-200" />
                                <Row l="f₀ = ω₀/2π" v={`${fmt(naturalFreq)} Hz`} />
                                <Row l="T = 2π√(m/k)" v={`${fmt(period, 3)} s`} />
                                {damping > 0 && <Row l="ζ = c/2√(mk)" v={`${fmt(dampingRatio)} · ${dampClass}`} c="text-rose-300" />}
                                {forced && <Row l="ω_d (driving)" v={`${fmt(drivingFrequency)} rad/s`} c="text-amber-300" />}
                                <div className="my-1 border-t border-white/5" />
                                <Row l="KE = ½mv²" v={`${fmt(snapshot.ke, 4)} J`} c="text-emerald-300" />
                                <Row l="PE_spring = ½kΔL²" v={`${fmt(snapshot.peSpring, 4)} J`} c="text-sky-300" />
                                <Row l="PE_gravity" v={`${fmt(snapshot.peGravity, 4)} J`} c="text-rose-300" />
                                <Row l="E total" v={`${fmt(snapshot.totalEnergy, 4)} J`} c="text-amber-300" />
                                <Row l="ΔE/E" v={`${fmt(snapshot.energyErrorPct, 2)} %`} c={Number(snapshot.energyErrorPct) < 0.05 ? 'text-emerald-400' : 'text-amber-400'} />
                                {showAnalytical && (
                                    <Row l="num − ana" v={`${fmt(snapshot.analyticalError, 4)} m`} c="text-orange-300" />
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── SCIENTIFIC GRAPHS PANEL ── */}
                {showGraphs && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-[#0b101c]/88 backdrop-blur border border-white/10 rounded-lg shadow-xl px-3 pt-1.5 pb-2">
                        <div className="flex items-center gap-1 pb-1.5">
                            {GRAPH_TABS.map(t => (
                                <button key={t.id} onClick={() => setGraphTab(t.id)}
                                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${graphTab === t.id ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-slate-200'}`}>
                                    {t.label}
                                </button>
                            ))}
                            <div className="flex-1" />
                            {showAnalytical && <span className="text-[9px] font-mono text-emerald-400 px-1.5 py-0.5 rounded bg-white/[0.03]">num vs ana · max err {fmt(snapshot.maxAbsError, 2)} m</span>}
                        </div>
                        <GraphCanvas tab={graphTab} snapshot={snapshot} win={histWin} W={640} H={150}
                            springConstant={springConstant} omega0={omega0} ampHat={ampHat}
                            resonance={resonanceCurve} analyticalOn={showAnalytical} />
                    </div>
                )}
            </div>

            {/* ════ BOTTOM CONTROL DECK ═══════════════════════════════════════ */}
            <div className="relative z-30 px-3 pt-1.5 pb-2 bg-[#0c111d]/95 border-t border-white/5 backdrop-blur">
                <div className="flex flex-wrap items-end gap-x-3 gap-y-1.5">
                    {[
                        { label: 'm (kg)', val: mass, set: setMass, min: 0.1, max: 20, step: 0.1, color: 'text-emerald-300' },
                        { label: 'k (N/m)', val: springConstant, set: setSpringConstant, min: 0.5, max: 100, step: 0.5, color: 'text-sky-300' },
                        { label: 'L₀ (m)', val: naturalLength, set: setNaturalLength, min: 0.3, max: 3, step: 0.05, color: 'text-slate-300' },
                        { label: 'x₀ (m)', val: x0, set: setX0, min: -1.5, max: 1.5, step: 0.05, color: 'text-emerald-300' },
                        { label: 'v₀ (m/s)', val: v0, set: setV0, min: -5, max: 5, step: 0.1, color: 'text-sky-300' },
                        { label: 'c (N·s/m)', val: damping, set: setDamping, min: 0, max: 20, step: 0.05, color: 'text-rose-300' }
                    ].map(p => (
                        <label key={p.label} className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-white/[0.02] border border-white/5 rounded-md px-2 py-1">
                            <span className={p.color + ' font-semibold'}>{p.label}</span>
                            <input type="number" step={p.step} min={p.min} max={p.max} value={p.val}
                                onChange={e => p.set(Number(e.target.value))}
                                className="w-14 bg-transparent text-right font-mono text-[11px] text-slate-200 outline-none" />
                        </label>
                    ))}

                    <label className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-white/[0.02] border border-white/5 rounded-md px-2 py-1">
                        <span className="text-emerald-300 font-semibold">g</span>
                        <select value={gravity} onChange={e => setGravity(Number(e.target.value))}
                            className="bg-transparent text-[11px] font-mono text-slate-200 outline-none">
                            {Object.entries(PLANETARY_GRAVITY).map(([k, v]) => (
                                <option key={k} value={v.g}>{v.name} · {v.g}</option>
                            ))}
                            <option value={Math.round(gravity * 100) / 100}>{fmt(gravity, 2)} (custom)</option>
                        </select>
                    </label>

                    {/* Damping ratio + classification + presets */}
                    <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 rounded-md px-2 py-1 text-[10px]">
                        <span className="text-slate-400">ζ = <span className="text-rose-300 font-mono">{fmt(dampingRatio)}</span></span>
                        <span className="text-slate-400">→</span>
                        <span className={`font-bold ${dampingRatio < 0.99 ? 'text-sky-300' : dampingRatio > 1.01 ? 'text-rose-300' : 'text-amber-300'}`}>{dampClass}</span>
                        <span className="w-px h-4 bg-white/10 mx-1" />
                        {DAMPING_PRESETS.map(d => (
                            <button key={d.name} onClick={() => applyDampingPreset(d.zeta)}
                                className="px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.12] text-slate-300 border border-white/5 font-semibold">
                                {d.name} ζ={d.zeta}
                            </button>
                        ))}
                    </div>

                    {/* Forced oscillation */}
                    <label className="flex items-center gap-2 bg-white/[0.02] border border-white/5 rounded-md px-2 py-1 text-[10px]">
                        <button onClick={() => setForced(f => !f)}
                            className={`w-7 h-4 rounded-full relative transition-colors ${forced ? 'bg-amber-500/70' : 'bg-white/10'}`}>
                            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${forced ? 'left-3.5' : 'left-0.5'}`} />
                        </button>
                        <span className="text-amber-300 font-semibold">F₀ sin(ω_d·t)</span>
                        <input type="number" step="0.1" min="0" max="50" value={forceAmplitude}
                            onChange={e => setForceAmplitude(Number(e.target.value))} disabled={!forced}
                            className="w-12 bg-transparent text-right font-mono text-[11px] text-amber-200 outline-none" title="Driving force amplitude F₀ (N)" />
                        <input type="number" step="0.1" min="0" max="20" value={drivingFrequency}
                            onChange={e => setDrivingFrequency(Number(e.target.value))} disabled={!forced}
                            className="w-12 bg-transparent text-right font-mono text-[11px] text-amber-200 outline-none" title="Driving frequency ω_d (rad/s)" />
                        {omega0 > 0 && <span className="font-mono text-slate-500">ω_d/ω₀={fmt(Math.abs(drivingFrequency) / omega0, 2)}</span>}
                    </label>

                    {/* Energy strip */}
                    <div className="hidden lg:flex items-center gap-2 text-[10px] text-slate-400 ml-1">
                        <span className="text-emerald-300 font-mono">KE {fmt(snapshot.ke, 3)}</span>
                        <span className="text-sky-300 font-mono">PE_s {fmt(snapshot.peSpring, 3)}</span>
                        <span className="text-rose-300 font-mono">PE_g {fmt(snapshot.peGravity, 3)}</span>
                        <span className="text-amber-300 font-mono font-bold">E {fmt(snapshot.totalEnergy, 4)} J</span>
                        <span className="text-slate-500">ΔE/E {fmt(snapshot.energyErrorPct, 2)}%</span>
                    </div>
                    <div className="hidden lg:block text-[10px] font-mono text-slate-500 ml-auto">
                        RK4 · fixed Δt {FIXED_DT * 1000} ms · frame-rate independent
                    </div>
                </div>
            </div>

            {/* ════ EXPLAINER MODAL ══════════════════════════════════════════ */}
            {physicsExplainer && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setPhysicsExplainer(false)}>
                    <div className="max-w-2xl max-h-[85vh] overflow-y-auto bg-[#0d1322] border border-white/10 rounded-xl shadow-2xl mr-3 ml-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                            <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm"><Gauge size={15} /> The Spring-Oscillator Equations</div>
                            <button onClick={() => setPhysicsExplainer(false)} className="p-1 text-slate-400 hover:text-white">✕</button>
                        </div>
                        <div className="px-5 py-4 space-y-4 text-[13px] leading-relaxed text-slate-300">
                            <div>
                                <div className="text-amber-300 font-mono text-[12px] mb-1">Equation of motion (displacement from equilibrium x = y − y_eq)</div>
                                <code className="block bg-white/[0.04] rounded px-2 py-1.5 font-mono text-[11.5px] text-slate-200">
                                    m·x'' + c·x' + k·x = F₀·sin(ω_d·t) &nbsp;&nbsp;⇒&nbsp;&nbsp; a = −(k/m)·x − (c/m)·v + (F₀/m)·sin(ω_d·t)
                                </code>
                            </div>
                            <div>
                                <div className="text-amber-300 font-mono text-[12px] mb-1">Natural frequency &amp; period (computed live from m and k)</div>
                                <code className="block bg-white/[0.04] rounded px-2 py-1.5 font-mono text-[11.5px] text-slate-200">
                                    ω₀ = √(k/m) &nbsp;&nbsp;&nbsp; f₀ = ω₀/(2π) &nbsp;&nbsp;&nbsp; T = 2π·√(m/k)
                                </code>
                            </div>
                            <div>
                                <div className="text-amber-300 font-mono text-[12px] mb-1">Hooke's law / equilibrium</div>
                                <code className="block bg-white/[0.04] rounded px-2 py-1.5 font-mono text-[11.5px] text-slate-200">
                                    F_s = −k·ΔL &nbsp;&nbsp;&nbsp; y_eq = L₀ + mg/k &nbsp;&nbsp;(gravity shifts equilibrium, not ω₀)
                                </code>
                            </div>
                            <div>
                                <div className="text-amber-300 font-mono text-[12px] mb-1">Damping ratio &amp; classification</div>
                                <code className="block bg-white/[0.04] rounded px-2 py-1.5 font-mono text-[11.5px] text-slate-200">
                                    ζ = c / (2√(mk)) &nbsp;&nbsp;—&nbsp;&nbsp; ζ&lt;1 underdamped · ζ=1 critically damped · ζ&gt;1 overdamped
                                </code>
                            </div>
                            <div>
                                <div className="text-amber-300 font-mono text-[12px] mb-1">Energy (live from the integrator)</div>
                                <code className="block bg-white/[0.04] rounded px-2 py-1.5 font-mono text-[11.5px] text-slate-200">
                                    KE = ½mv² &nbsp;&nbsp; PE_spring = ½kΔL² &nbsp;&nbsp; PE_gravity = −mgx &nbsp;&nbsp; E = KE + PE_s + PE_g
                                </code>
                            </div>
                            <div className="text-slate-400 text-[12px]">
                                The <b className="text-slate-200">analytical</b> solution x(t) = A·cos(ω₀t + φ) is computed <i>only for validation</i> — motion always comes from the RK4 integrator.
                                Forcing at ω_d ≈ ω₀ naturally drives resonance; the Resonance graph sweeps ω_d and measures the resulting amplitude from real simulation data.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── helpers used inside the telemetry / header ─────────────────────────────────
function Row({ l, v, c = 'text-slate-300' }) {
    return (
        <div className="flex justify-between py-0.5">
            <span className="text-slate-400">{l}</span>
            <span className={`font-mono ${c}`}>{v}</span>
        </div>
    );
}

function LayersIcon() {
    return <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 9 h8 M2 6 h8 M2 3 h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}
function WaveformIcon() {
    return <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 6 C3 2,5 10,7 6 S10 3,11 5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}

// ═══ Graph canvas — all series drawn from REAL solver history ═══════════════════
function GraphCanvas({ tab, snapshot, win, W, H, springConstant, omega0, ampHat, resonance, analyticalOn }) {
    const PAD = 10;
    const iw = W, ih = H;
    const h = win ? win.h : null;

    const buildXY = (xKey, yKey, yMin, yMax, xMin, xMax, maxPts = 260) => {
        if (!h || !h[xKey] || !h[yKey]) return '';
        const n = h[xKey].length;
        const step = Math.max(1, Math.ceil(n / maxPts));
        const pts = [];
        for (let i = win.idx; i < n; i += step) {
            const t = h[xKey][i], v = h[yKey][i];
            if (v == null || !isFinite(v)) continue;
            const px = PAD + (t - xMin) / (xMax - xMin) * (iw - 2 * PAD);
            const py = PAD + (ih - 2 * PAD) * (1 - (v - yMin) / (yMax - yMin));
            pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
        }
        return pts.join(' ');
    };

    const poly = (d, stroke, w = 1.6, dash) =>
        d ? <polyline points={d} fill="none" stroke={stroke} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dash || undefined} /> : null;

    const axes = (xLabel, yLabel, extra = null) => (
        <g>
            <line x1={PAD} y1={PAD} x2={PAD} y2={ih - PAD} stroke="rgba(148,163,184,0.4)" />
            <line x1={PAD} y1={ih - PAD} x2={iw - PAD} y2={ih - PAD} stroke="rgba(148,163,184,0.4)" />
            {extra}
            <text x={iw - 4} y={ih - 2} textAnchor="end" fill="rgba(148,163,184,0.55)" fontSize="9">{xLabel}</text>
            <text x={4} y={PAD - 4} fill="rgba(148,163,184,0.55)" fontSize="9">{yLabel}</text>
        </g>
    );

    const windows = (key) => {
        if (!h || !h[key]) return { min: 0, max: 1 };
        let mn = Infinity, mx = -Infinity;
        for (let i = win.idx; i < h[key].length; i++) {
            const v = h[key][i]; if (!isFinite(v)) continue;
            if (v < mn) mn = v; if (v > mx) mx = v;
        }
        const pad = (mx - mn) * 0.12 || 0.5;
        return { min: mn - pad, max: mx + pad };
    };

    let tMin = 0, tMax = 1;
    if (h && h.t.length) { tMin = h.t[win.idx]; tMax = h.t[h.t.length - 1]; if (tMax - tMin < 0.01) tMax = tMin + 0.01; }

    let body = null;

    if (tab === 'xt') {
        const { min, max } = windows('x');
        const num = buildXY('t', 'x', min, max, tMin, tMax);
        let ana = '';
        if (analyticalOn) {
            const A = ampHat, w = omega0;
            const phi = Math.atan2(-(snapshot.config ? 0 : 0), 1); // placeholder guard
            const xs = h.t;
            const pts = [];
            const step = Math.max(1, Math.ceil(xs.length / 220));
            for (let i = win.idx; i < xs.length; i += step) {
                const t = xs[i];
                const xa = A * Math.cos(w * t + phi);
                const px = PAD + (t - tMin) / (tMax - tMin) * (iw - 2 * PAD);
                const py = PAD + (ih - 2 * PAD) * (1 - (xa - min) / (max - min));
                pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
            }
            ana = pts.join(' ');
        }
        body = (
            <>
                {poly(num, '#10b981', 1.8)}
                {poly(ana, 'rgba(253,186,116,0.85)', 1.4, '3 3')}
                {axes('t (s)', 'x (m)')}
            </>
        );
    } else if (tab === 'vt') {
        const { min, max } = windows('v');
        body = <>{poly(buildXY('t', 'v', min, max, tMin, tMax), '#38bdf8', 1.8)}{axes('t (s)', 'v (m/s)')}</>;
    } else if (tab === 'et') {
        // three overlaid energy series: KE (emerald), PE_s (sky), total (amber)
        const allVals = [];
        for (let i = win.idx; i < h.t.length; i++) { const v = h.total[i]; if (isFinite(v)) allVals.push(v); } // min/max via helper
        let mn = Infinity, mx = -Infinity;
        for (let i = win.idx; i < h.t.length; i++) { const v = h.total[i]; if (isFinite(v)) { if (v < mn) mn = v; if (v > mx) mx = v; } }
        let mnK = mn, mxK = mx;
        for (let i = win.idx; i < h.t.length; i++) { const v = h.ke[i]; if (isFinite(v)) { if (v < mnK) mnK = v; if (v > mxK) mxK = v; } }
        const lo = Math.min(mn, mnK) - 0.02, hi = Math.max(mx, mxK) * 1.05 + 0.02;
        body = (
            <>
                {poly(buildXY('t', 'total', lo, hi, tMin, tMax), '#fbbf24', 1.6)}
                {poly(buildXY('t', 'ke', lo, hi, tMin, tMax), '#34d399', 1.3)}
                {poly(buildXY('t', 'peSpring', lo, hi, tMin, tMax), '#7dd3fc', 1.3)}
                {axes('t (s)', 'E (J)')}
                <g fontSize="8.5">
                    <rect x={iw - 80} y={PAD} width="72" height="15" fill="rgba(0,0,0,0.35)" rx="2" />
                    <circle cx={iw - 74} cy={PAD + 7} r="2.5" fill="#fbbf24" /><text x={iw - 68} y={PAD + 10} fill="rgba(148,163,184,0.8)">E</text>
                    <circle cx={iw - 74} cy={PAD + 13} r="0" />
                </g>
            </>
        );
    } else if (tab === 'phase') {
        // x vs v trajectory — ellipse for the ideal oscillator
        const w = windows('x'), wv = windows('v');
        const xmn = w.min, xmx = w.max, vmn = wv.min, vmx = wv.max;
        const hist = snapshot.strobeHistory || [];
        const step = Math.max(1, Math.ceil(hist.length / 300));
        const pts = [];
        for (let i = 0; i < hist.length; i += step) {
            const pt = hist[i];
            const px = PAD + (pt.x - xmn) / (xmx - xmn) * (iw - 2 * PAD);
            const py = PAD + (ih - 2 * PAD) * (1 - (pt.v - vmn) / (vmx - vmn));
            pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
        }
        body = <>{poly(pts.join(' '), '#a78bfa', 1.7)}{axes('x (m)', 'v (m/s)')}</>;
    } else if (tab === 'fx') {
        // F_s = −kx: scatter real (x, -fSpringSwapped) + ideal line
        const hist = snapshot.strobeHistory || [];
        const xs = [];
        for (let i = 0; i < hist.length; i++) xs.push(hist[i].x);
        let mn = Infinity, mx = -Infinity;
        for (let i = 0; i < xs.length; i++) { if (xs[i] < mn) mn = xs[i]; if (xs[i] > mx) mx = xs[i]; }
        const xmn = mn - 0.02, xmx = mx + 0.02;
        // force display: fSpring stored signed (restoring toward eq at x-signed); plot y = -fSpring convention = kx? keep as F_s=-kx
        let fmn = Infinity, fmx = -Infinity;
        hist.forEach(p => { if (isFinite(p.fSpring)) { if (p.fSpring < fmn) fmn = p.fSpring; if (p.fSpring > fmx) fmx = p.fSpring; } });
        const fpad = (fmx - fmn) * 0.15 || 1;
        const fmin = fmn - fpad, fmax = fmx + fpad;
        const step = Math.max(1, Math.ceil(hist.length / 200));
        const pts = [];
        const linePts = [];
        for (let i = 0; i < hist.length; i += step) {
            const p = hist[i];
            const px = PAD + (p.x - xmn) / (xmx - xmn) * (iw - 2 * PAD);
            const py = PAD + (ih - 2 * PAD) * (1 - (p.fSpring - fmin) / (fmax - fmin));
            pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
        }
        for (let k = 0; k <= 4; k++) {
            const xv = xmn + (xmx - xmn) * k / 4;
            const fv = -springConstant * xv;
            const px = PAD + (xv - xmn) / (xmx - xmn) * (iw - 2 * PAD);
            const py = PAD + (ih - 2 * PAD) * (1 - (fv - fmin) / (fmax - fmin));
            linePts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
        }
        body = (
            <>
                {poly(linePts.join(' '), 'rgba(56,189,248,0.6)', 1.4, '4 4')}
                {poly(pts.join(' '), '#38bdf8', 1.5)}
                {axes('x (m)', 'F_s (N)')}
                <text x={iw - 4} y={PAD + 10} textAnchor="end" fill="rgba(56,189,248,0.7)" fontSize="8.5">line: F_s = −k·x</text>
            </>
        );
    } else if (tab === 'res') {
        // amplitude vs driving frequency (curve from a real sweep)
        if (!resonance) {
            body = <text x={iw / 2} y={ih / 2} textAnchor="middle" fill="rgba(148,163,184,0.6)" fontSize="10">computing sweep…</text>;
        } else {
            const pts = resonance.points;
            let ampMax = 1e-9;
            pts.forEach(p => { if (p.amp > ampMax) ampMax = p.amp; });
            const wMin = pts[0].w, wMax = pts[pts.length - 1].w;
            const curve = pts.map(p => {
                const px = PAD + (p.w - wMin) / (wMax - wMin) * (iw - 2 * PAD);
                const py = PAD + (ih - 2 * PAD) * (1 - p.amp / (ampMax * 1.15));
                return `${px.toFixed(1)},${py.toFixed(1)}`;
            }).join(' ');
            const peakPx = PAD + (resonance.peak.w - wMin) / (wMax - wMin) * (iw - 2 * PAD);
            const peakPy = PAD + (ih - 2 * PAD) * (1 - resonance.peak.amp / (ampMax * 1.15));
            const w0Px = PAD + Math.min(1, Math.max(0, (omega0 - wMin) / (wMax - wMin))) * (iw - 2 * PAD);
            body = (
                <>
                    {poly(curve, '#fbbf24', 2)}
                    <polyline points={`${w0Px},${PAD} ${w0Px},${ih - PAD}`} stroke="rgba(251,191,36,0.35)" strokeWidth="1" strokeDasharray="4 4" />
                    <circle cx={peakPx} cy={peakPy} r="4.5" fill="#fb923c" stroke="#fef3c7" strokeWidth="1.2" />
                    <text x={w0Px + 3} y={PAD + 9} fill="rgba(251,191,36,0.8)" fontSize="8.5">ω₀</text>
                    <text x={peakPx + 5} y={peakPy - 5} fill="#fb923c" fontSize="8.5">peak {resonance.peak.w.toFixed(2)} rad/s → A = {resonance.peak.amp.toFixed(3)} m</text>
                    {axes('ω_d (rad/s)', 'A (m)')}
                </>
            );
        }
    }

    return (
        <div className="flex items-stretch gap-3">
            <div className="relative">
                <svg width={iw} height={ih} className="border border-white/5 rounded bg-black/25">
                    {body}
                </svg>
            </div>
        </div>
    );
}