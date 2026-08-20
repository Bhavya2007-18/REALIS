import React, { useState, useEffect, useRef } from 'react';
import {
    Play, Square, RefreshCw, SkipForward, ChevronDown, Activity,
    Sliders, ZoomIn, ZoomOut, Maximize, Crosshair, RotateCcw,
    Satellite, TrendingUp, BookOpen, Zap, Gauge
} from 'lucide-react';
import useStore from '../store/useStore';
import OrbitalPhysicsSolver, { ORBITAL_PRESETS, clamp } from '../utils/solvers/orbitalSolver';

// ── Collapsible Engineering Information Bar (Accordion Section) ───────────────
function InfoBar({ icon, title, accent, summary, status, open, onToggle, children }) {
    return (
        <div className={`border-t border-white/10 transition-colors duration-200 ${open ? 'bg-slate-900/60' : 'bg-slate-950/90'}`}>
            <button
                onClick={onToggle}
                className={`w-full flex items-center gap-3 px-5 py-2 text-left cursor-pointer transition-colors duration-200 group ${open ? 'bg-slate-900/70' : 'hover:bg-slate-900/50'}`}
                aria-expanded={open}
            >
                <span className={`shrink-0 transition-colors ${open ? accent : 'text-slate-500 group-hover:text-slate-300'}`}>{icon}</span>
                <span className={`text-[10px] font-bold tracking-widest uppercase shrink-0 transition-colors ${open ? 'text-slate-200' : 'text-slate-400 group-hover:text-slate-200'}`}>{title}</span>
                <span className="flex-1 min-w-0 text-xs font-mono text-slate-400 truncate">{summary}</span>
                {status}
                <ChevronDown size={13} className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-slate-300' : 'text-slate-500 group-hover:text-slate-300'}`} />
            </button>
            <div className="grid" style={{ gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.2s ease-out' }}>
                <div className="overflow-hidden min-h-0">{children}</div>
            </div>
        </div>
    );
}

function Stat({ label, value, unit, color = 'text-white' }) {
    return (
        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">{label}</span>
            <div className={`text-sm font-bold font-mono ${color}`}>
                {value} <span className="text-[10px] font-normal text-slate-500">{unit}</span>
            </div>
        </div>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v, digits = 4) {
    if (v === null || v === undefined) return '—';
    if (!Number.isFinite(v)) return '∞';
    const abs = Math.abs(v);
    if (abs === 0) return '0';
    if (abs >= 1e6 || abs < 1e-4) return v.toExponential(digits - 1);
    return v.toPrecision(digits).replace(/(\.\d*?)0+$/, '$1');
}

function formatSimTime(sec) {
    if (!Number.isFinite(sec)) return '∞';
    if (sec < 60) return `${sec.toFixed(2)} s`;
    const m = sec / 60;
    if (m < 60) return `${m.toFixed(2)} min`;
    const hr = m / 60;
    if (hr < 24) return `${hr.toFixed(2)} hr`;
    return `${(hr / 24).toFixed(2)} d`;
}

function niceStep(raw) {
    const pow = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-12))));
    const norm = raw / pow;
    const mult = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
    return mult * pow;
}

const DEG = Math.PI / 180;

const ORBIT_ACCENT = {
    CIRCULAR: '#38bdf8',
    ELLIPTICAL: '#a78bfa',
    PARABOLIC: '#fbbf24',
    HYPERBOLIC: '#f472b6',
};

// ── Energy Graph (real sampled data) ─────────────────────────────────────────
function EnergyGraph({ history }) {
    const { time, kinetic, potential, total } = history;
    if (!time || time.length < 2) {
        return (
            <div className="h-40 flex items-center justify-center text-[10px] font-mono text-slate-600">
                Collecting energy samples…
            </div>
        );
    }
    const W = 560, H = 150, PAD = 10;
    const t0 = time[0], t1 = time[time.length - 1];
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < time.length; i++) {
        lo = Math.min(lo, potential[i], kinetic[i], total[i]);
        hi = Math.max(hi, potential[i], kinetic[i], total[i]);
    }
    if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
    const X = (t) => PAD + ((t - t0) / (t1 - t0 || 1)) * (W - PAD * 2);
    const Y = (v) => H - PAD - ((v - lo) / (hi - lo)) * (H - PAD * 2);
    const line = (arr) => arr.map((v, i) => `${X(time[i]).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    const gridY = [0, 0.25, 0.5, 0.75, 1].map(f => lo + f * (hi - lo));
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-h-40">
            {gridY.map((gv, i) => (
                <line key={i} x1={PAD} y1={Y(gv)} x2={W - PAD} y2={Y(gv)} stroke="#1e293b" strokeWidth="1" />
            ))}
            <polyline points={line(potential)} fill="none" stroke="#38bdf8" strokeWidth="1.5" />
            <polyline points={line(kinetic)} fill="none" stroke="#34d399" strokeWidth="1.5" />
            <polyline points={line(total)} fill="none" stroke="#fbbf24" strokeWidth="2.2" />
            <text x={W - PAD} y={Y(gridY[gridY.length - 1]) + 10} textAnchor="end" fill="#38bdf8" fontSize="8" fontFamily="monospace">PE</text>
            <text x={W - PAD} y={Y(gridY[gridY.length - 1]) + 20} textAnchor="end" fill="#34d399" fontSize="8" fontFamily="monospace">KE</text>
            <text x={W - PAD} y={Y(gridY[gridY.length - 1]) + 30} textAnchor="end" fill="#fbbf24" fontSize="8" fontFamily="monospace">E_total</text>
        </svg>
    );
}

// ── Orbital Mechanics Laboratory ──────────────────────────────────────────────
export default function OrbitalLab() {
    const isPlaying = useStore(state => state.isPlaying);
    const togglePlayback = useStore(state => state.togglePlayback);
    const resetPlayback = useStore(state => state.resetPlayback);
    const setLabData = useStore(state => state.setLabData);
    const clearLabData = useStore(state => state.clearLabData);

    // ── Laboratory configuration ─────────────────────────────────────────────
    const [mu, setMu] = useState(3986.0);            // km³/s² gravitational parameter
    const [centralMass, setCentralMass] = useState(6.0e22); // kg
    const [satelliteMass, setSatelliteMass] = useState(1000); // kg
    const [centralRadius, setCentralRadius] = useState(15.0); // km physics radius
    const [r0, setR0] = useState(100.0);             // km initial radius
    const [theta0, setTheta0] = useState(0.0);       // deg initial angular position
    const [v0, setV0] = useState(Math.sqrt(3986 / 100).toFixed(4) * 1); // km/s
    const [velAngle, setVelAngle] = useState(90.0);  // deg direction of initial v
    const [dt, setDt] = useState(0.1);               // fixed physics timestep (s)
    const [timeScale, setTimeScale] = useState(5.0); // sim-time multiplier

    // ── Visual overlay toggles ───────────────────────────────────────────────
    const [showTrail, setShowTrail] = useState(true);
    const [showVelocityVector, setShowVelocityVector] = useState(true);
    const [showForceVector, setShowForceVector] = useState(true);
    const [showAccelVector, setShowAccelVector] = useState(true);
    const [showSweptArea, setShowSweptArea] = useState(true);
    const [showApsis, setShowApsis] = useState(true);
    const [showRadiusRing, setShowRadiusRing] = useState(true);

    // ── Camera ───────────────────────────────────────────────────────────────
    const [camera, setCamera] = useState({ cx: 0, cy: 0, zoom: 1 });
    const [cameraMode, setCameraMode] = useState('fit'); // 'fit' | 'follow'
    const [needsFit, setNeedsFit] = useState(true);

    // ── Accordion state ──────────────────────────────────────────────────────
    const [openSection, setOpenSection] = useState('telemetry');
    const toggleSection = (key) => setOpenSection(prev => (prev === key ? null : key));

    // ── Physics solver ───────────────────────────────────────────────────────
    const solverRef = useRef(new OrbitalPhysicsSolver({
        mu: 3986.0,
        centralMass: 6.0e22,
        satelliteMass: 1000,
        centralRadius: 15.0,
        initialPosition: { x: 100, y: 0 },
        initialVelocity: { vx: 0, vy: Math.sqrt(3986 / 100) },
        dt: 0.1,
        timeScale: 5.0,
    }));

    const [snapshot, setSnapshot] = useState(solverRef.current.getSnapshot());

    // ── Viewport dimensions ──────────────────────────────────────────────────
    const containerRef = useRef(null);
    const [viewSize, setViewSize] = useState({ width: 900, height: 600 });

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

    // ── Push lab data to store for Properties panel ──────────────────────────
    useEffect(() => {
        setLabData({
            type: 'orbital_mechanics',
            title: 'Orbital Mechanics Laboratory',
            snapshot: snapshot,
            config: { mu, centralMass, satelliteMass, centralRadius, r0, theta0, v0, velAngle, dt, timeScale },
        });
        return () => clearLabData();
    }, [snapshot, mu, centralMass, satelliteMass, centralRadius, r0, theta0, v0, velAngle, dt, timeScale, setLabData, clearLabData]);

    // ── Listen for config changes from Properties panel ──────────────────────
    useEffect(() => {
        const handleConfigChange = (event) => {
            const { type, key, value } = event.detail;
            if (type !== 'orbital_mechanics') return;
            if (key === 'mu') setMu(value);
            else if (key === 'centralMass') setCentralMass(value);
            else if (key === 'satelliteMass') setSatelliteMass(value);
            else if (key === 'centralRadius') setCentralRadius(value);
            else if (key === 'r0') setR0(value);
            else if (key === 'theta0') setTheta0(value);
            else if (key === 'v0') setV0(value);
            else if (key === 'velAngle') setVelAngle(value);
            else if (key === 'dt') setDt(value);
            else if (key === 'timeScale') setTimeScale(value);
        };
        window.addEventListener('lab-config-change', handleConfigChange);
        return () => window.removeEventListener('lab-config-change', handleConfigChange);
    }, []);

    // ── Sync configuration into the solver (resets on core-param change) ─────
    useEffect(() => {
        const th0 = theta0 * DEG;
        const va = velAngle * DEG;
        solverRef.current.updateConfig({
            mu,
            centralMass,
            satelliteMass,
            centralRadius,
            initialPosition: { x: r0 * Math.cos(th0), y: r0 * Math.sin(th0) },
            initialVelocity: { vx: v0 * Math.cos(va), vy: v0 * Math.sin(va) },
            dt,
            timeScale,
        });
        setSnapshot(solverRef.current.getSnapshot());
    }, [mu, centralMass, satelliteMass, centralRadius, r0, theta0, v0, velAngle, dt, timeScale]);

    // ── Camera helpers ───────────────────────────────────────────────────────
    const estimateExtent = () => {
        const snap = solverRef.current.getSnapshot();
        const ob = snap.orbit;
        if (ob.type === 'CIRCULAR' || ob.type === 'ELLIPTICAL') {
            if (Number.isFinite(ob.ra) && ob.ra > 0) return Math.max(ob.ra, snap.position.r) * 1.15;
        }
        let maxR = snap.position.r;
        for (const p of snap.trail) maxR = Math.max(maxR, Math.hypot(p.x, p.y));
        return Math.max(maxR, snap.config.centralRadius) * 1.25;
    };

    const fitOrbit = () => {
        if (viewSize.width <= 0) return;
        const extent = Math.max(estimateExtent(), 1e-6);
        const availW = viewSize.width * 0.8;
        const availH = viewSize.height * 0.8;
        const zoom = Math.min(availW, availH) / (2 * extent);
        setCamera({ cx: 0, cy: 0, zoom: Math.max(zoom, 1e-9) });
        setCameraMode('fit');
    };

    const followSatellite = () => {
        setCameraMode('follow');
    };

    const zoomIn = () => setCamera(c => ({ ...c, zoom: c.zoom * 1.3 }));
    const zoomOut = () => setCamera(c => ({ ...c, zoom: Math.max(c.zoom / 1.3, 1e-9) }));

    // Fit after mount / preset / reset
    useEffect(() => {
        if (needsFit && viewSize.width > 0) {
            fitOrbit();
            setNeedsFit(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [needsFit, viewSize]);

    // ── Presets ──────────────────────────────────────────────────────────────
    const applyPreset = (id) => {
        const p = ORBITAL_PRESETS[id];
        if (!p) return;
        let nextMu = mu;
        let nextR0 = r0;
        let nextTimeScale = timeScale;
        if (p.earth) {
            nextMu = 398600;
            nextR0 = 6871;
            nextTimeScale = 200;
        }
        const base = p.base === 'escape'
            ? Math.sqrt(2 * nextMu / nextR0)
            : Math.sqrt(nextMu / nextR0);
        setMu(nextMu);
        setR0(nextR0);
        setTheta0(0);
        setVelAngle(90);
        setV0(Number((base * p.factor).toFixed(4)));
        if (p.earth) setTimeScale(nextTimeScale);
        setNeedsFit(true);
    };

    // ── Playback ─────────────────────────────────────────────────────────────
    const reqRef = useRef(null);
    const lastTimeRef = useRef(0);
    const prevImpactRef = useRef(false);
    const [impactFlash, setImpactFlash] = useState(false);

    const handleReset = () => {
        resetPlayback();
        solverRef.current.reset();
        prevImpactRef.current = false;
        setSnapshot(solverRef.current.getSnapshot());
        setNeedsFit(true);
    };

    const handleStepForward = () => {
        if (!isPlaying) {
            const next = solverRef.current.step(0.016);
            if (next.impacted && !prevImpactRef.current) {
                prevImpactRef.current = true;
                setImpactFlash(true);
                setTimeout(() => setImpactFlash(false), 800);
            }
            setSnapshot({ ...next });
        }
    };

    // Main 60 FPS physics loop (frame-rate independent)
    useEffect(() => {
        if (!isPlaying) {
            cancelAnimationFrame(reqRef.current);
            return;
        }
        lastTimeRef.current = performance.now();
        const loop = (now) => {
            const elapsed = Math.min((now - lastTimeRef.current) / 1000, 0.05);
            lastTimeRef.current = now;
            const next = solverRef.current.step(elapsed);

            if (next.impacted && !prevImpactRef.current) {
                prevImpactRef.current = true;
                setImpactFlash(true);
                setTimeout(() => setImpactFlash(false), 800);
            }

            // Auto-follow for unbound (escaping) trajectories.
            if (cameraMode === 'fit' && (next.orbit.type === 'HYPERBOLIC' || next.orbit.type === 'PARABOLIC')) {
                setCameraMode('follow');
            }
            if (cameraMode === 'follow') {
                setCamera(c => ({ ...c, cx: next.position.x, cy: next.position.y }));
            }

            setSnapshot({ ...next });
            reqRef.current = requestAnimationFrame(loop);
        };
        reqRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(reqRef.current);
    }, [isPlaying, cameraMode]);

    // ── AI query bridge ──────────────────────────────────────────────────────
    useEffect(() => {
        window.REALIS_AI_QUERY = () => ({
            simulationType: 'OrbitalMechanicsExperiment',
            ...snapshot,
        });
        return () => { delete window.REALIS_AI_QUERY; };
    }, [snapshot]);

    // ── World → Screen projection ────────────────────────────────────────────
    const w2s = (wx, wy) => ({
        x: viewSize.width / 2 + (wx - camera.cx) * camera.zoom,
        y: viewSize.height / 2 - (wy - camera.cy) * camera.zoom,
    });

    const ob = snapshot.orbit;
    const orbitAccent = ORBIT_ACCENT[ob.type] || '#38bdf8';

    // Visual radii (physics units kept separate from visual scale)
    const centralPx = Math.max(20, snapshot.config.centralRadius * camera.zoom);
    const satellitePx = clamp(30 / Math.sqrt(Math.max(camera.zoom, 0.05)), 5, 15);

    // Vector arrow scaling (magnitude-adaptive, monotonic)
    const velLen = clamp(snapshot.velocity.v * camera.zoom * 14, 26, 220);
    const forceLen = clamp(Math.log10(snapshot.force.magnitude + 1) * camera.zoom * 90, 26, 220);
    const accelLen = clamp(Math.log10(snapshot.acceleration.magnitude + 1) * camera.zoom * 90, 26, 220);

    const sPos = w2s(snapshot.position.x, snapshot.position.y);
    const centerPos = w2s(0, 0);

    // World grid
    const worldW = viewSize.width / camera.zoom;
    const worldH = viewSize.height / camera.zoom;
    const gridStep = niceStep(worldW / 10);
    const gxMin = Math.floor((camera.cx - worldW / 2) / gridStep) * gridStep;
    const gxMax = camera.cx + worldW / 2;
    const gyMin = Math.floor((camera.cy - worldH / 2) / gridStep) * gridStep;
    const gyMax = camera.cy + worldH / 2;
    const gridXLines = [];
    const gridYLines = [];
    for (let gx = gxMin; gx <= gxMax; gx += gridStep) gridXLines.push(gx);
    for (let gy = gyMin; gy <= gyMax; gy += gridStep) gridYLines.push(gy);

    const trailPoints = snapshot.trail.map(p => {
        const s = w2s(p.x, p.y);
        return `${s.x.toFixed(1)},${s.y.toFixed(1)}`;
    }).join(' ');

    const recentTrail = snapshot.trail.slice(-160).map(p => {
        const s = w2s(p.x, p.y);
        return `${s.x.toFixed(1)},${s.y.toFixed(1)}`;
    }).join(' ');

    // Telemetry summaries
    const statusText = snapshot.impacted
        ? 'IMPACT'
        : (isPlaying ? (ob.type === 'CIRCULAR' ? 'ORBITING' : 'IN FLIGHT') : 'READY');
    const telemetrySummary = `t ${formatSimTime(snapshot.time)} · r ${fmt(snapshot.position.r, 3)} km · v ${fmt(snapshot.velocity.v, 3)} km/s · ${ob.type}`;
    const elementsSummary = `a ${fmt(ob.semiMajor, 3)} km · e ${fmt(ob.ecc, 3)} · ε ${fmt(ob.eps, 3)} km²/s² · h ${fmt(ob.h, 3)} km²/s`;
    const energySummary = `E = ${fmt(snapshot.totalEnergy, 3)} J · KE ${fmt(snapshot.kinetic, 3)} J · PE ${fmt(snapshot.potential, 3)} J`;
    const keplerSummary = `${snapshot.orbitCount.toFixed(2)} orbits · T ${formatSimTime(ob.period)} · swept ${snapshot.sectors.length} sectors`;
    const setupSummary = `μ ${fmt(mu, 3)} · r₀ ${fmt(r0, 3)} km · v₀ ${fmt(v0, 3)} km/s · Δt ${dt}s · ${timeScale}×`;

    return (
        <div ref={containerRef} className="relative w-full h-full bg-[#0a0f1a] overflow-hidden select-none font-sans flex flex-col">
            {/* Background vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_50%_0%,rgba(56,189,248,0.10),rgba(255,255,255,0))] pointer-events-none" />

            {/* ── Top Floating Header ─────────────────────────────────────────── */}
            <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none flex-wrap gap-2">
                <div className="flex items-center gap-3 pointer-events-auto">
                    <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-sky-500/30 shadow-lg shadow-sky-500/10">
                        <Satellite size={14} className="text-sky-400 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Orbital Mechanics Laboratory</span>
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-mono font-bold">{ob.type}</span>
                    </div>
                    {/* Preset Quick Buttons */}
                    <div className="flex bg-slate-900/80 backdrop-blur-md p-0.5 rounded-xl border border-white/10 flex-wrap">
                        {Object.values(ORBITAL_PRESETS).map(p => (
                            <button
                                key={p.id}
                                onClick={() => applyPreset(p.id)}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-white/5"
                                style={{ borderColor: p.accent }}
                                title={p.description}
                            >
                                <span style={{ color: p.accent }}>{p.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Visual Layer Toggles */}
                <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-white/10 pointer-events-auto flex-wrap">
                    <ToggleBtn on={showTrail} set={setShowTrail} label="Trail" color="#38bdf8" />
                    <ToggleBtn on={showVelocityVector} set={setShowVelocityVector} label="Velocity" color="#22d3ee" />
                    <ToggleBtn on={showForceVector} set={setShowForceVector} label="Gravity" color="#f59e0b" />
                    <ToggleBtn on={showAccelVector} set={setShowAccelVector} label="Acceleration" color="#e879f9" />
                    <ToggleBtn on={showSweptArea} set={setShowSweptArea} label="Swept Area" color="#fbbf24" />
                    <ToggleBtn on={showApsis} set={setShowApsis} label="Apsides" color="#34d399" />
                    <ToggleBtn on={showRadiusRing} set={setShowRadiusRing} label="Radius" color="#94a3b8" />
                </div>
            </div>

            {/* ── Camera Controls ─────────────────────────────────────────────── */}
            <div className="absolute top-20 left-4 z-20 flex flex-col gap-1 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-2xl">
                <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest text-center mb-0.5">Camera</span>
                <button onClick={fitOrbit} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer" title="Fit Orbit (frame whole system)">
                    <Maximize size={14} />
                </button>
                <button onClick={followSatellite} className={`p-2 rounded-lg transition-all cursor-pointer ${cameraMode === 'follow' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:text-white hover:bg-white/10'}`} title="Follow Satellite">
                    <Crosshair size={14} />
                </button>
                <button onClick={() => { setCameraMode('fit'); setNeedsFit(true); }} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer" title="Reset Camera">
                    <RotateCcw size={14} />
                </button>
                <button onClick={zoomIn} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer" title="Zoom In">
                    <ZoomIn size={14} />
                </button>
                <button onClick={zoomOut} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer" title="Zoom Out">
                    <ZoomOut size={14} />
                </button>
            </div>

            {/* ── Main Physics SVG Viewport ───────────────────────────────────── */}
            <div className="flex-1 relative w-full h-full">
                <svg
                    className="absolute inset-0 w-full h-full"
                    onWheel={(e) => {
                        e.preventDefault();
                        const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
                        setCamera(c => ({ ...c, zoom: clamp(c.zoom * factor, 1e-9, 1e12) }));
                    }}
                >
                    <defs>
                        <radialGradient id="orb-star-grad" cx="35%" cy="35%" r="65%">
                            <stop offset="0%" stopColor="#fef3c7" />
                            <stop offset="35%" stopColor="#fbbf24" />
                            <stop offset="75%" stopColor="#d97706" />
                            <stop offset="100%" stopColor="#92400e" />
                        </radialGradient>
                        <radialGradient id="orb-sat-grad" cx="35%" cy="35%" r="65%">
                            <stop offset="0%" stopColor="#e0f2fe" />
                            <stop offset="45%" stopColor="#38bdf8" />
                            <stop offset="100%" stopColor="#1d4ed8" />
                        </radialGradient>
                        <marker id="orb-vel-arrow" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 9 3, 0 6" fill="#22d3ee" />
                        </marker>
                        <marker id="orb-force-arrow" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 9 3, 0 6" fill="#f59e0b" />
                        </marker>
                        <marker id="orb-accel-arrow" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 9 3, 0 6" fill="#e879f9" />
                        </marker>
                    </defs>

                    {/* World-aligned grid (moves/zooms with camera) */}
                    {gridXLines.map((gx, i) => {
                        const a = w2s(gx, camera.cy - worldH / 2);
                        const b = w2s(gx, camera.cy + worldH / 2);
                        const isAxis = Math.abs(gx) < gridStep * 0.01;
                        return (
                            <g key={`gx-${i}`}>
                                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={isAxis ? "#334155" : "#1e293b"} strokeWidth={isAxis ? 1.4 : 1} />
                                <text x={a.x + 4} y={a.y + 10} fill="#334155" fontSize="9" fontFamily="monospace">{fmt(gx, 2)}</text>
                            </g>
                        );
                    })}
                    {gridYLines.map((gy, i) => {
                        const a = w2s(camera.cx - worldW / 2, gy);
                        const b = w2s(camera.cx + worldW / 2, gy);
                        const isAxis = Math.abs(gy) < gridStep * 0.01;
                        return (
                            <g key={`gy-${i}`}>
                                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={isAxis ? "#334155" : "#1e293b"} strokeWidth={isAxis ? 1.4 : 1} />
                                <text x={a.x + 4} y={a.y - 4} fill="#334155" fontSize="9" fontFamily="monospace">{fmt(gy, 2)}</text>
                            </g>
                        );
                    })}

                    {/* ── Trajectory (from actual physics history) ── */}
                    {showTrail && snapshot.trail.length > 2 && (
                        <polyline points={trailPoints} fill="none" stroke="#475569" strokeWidth="1.5" strokeLinejoin="round" opacity="0.85" />
                    )}
                    {showTrail && recentTrail && snapshot.trail.length > 2 && (
                        <polyline points={recentTrail} fill="none" stroke={orbitAccent} strokeWidth="2.4" strokeLinejoin="round" opacity="0.95" />
                    )}

                    {/* ── Kepler 2nd law swept-area sectors ── */}
                    {showSweptArea && snapshot.sectors.map((s, i) => {
                        const p0 = w2s(s.x0, s.y0);
                        const p1 = w2s(s.x1, s.y1);
                        return (
                            <polygon
                                key={`sector-${i}`}
                                points={`${centerPos.x},${centerPos.y} ${p0.x},${p0.y} ${p1.x},${p1.y}`}
                                fill="#fbbf24"
                                fillOpacity="0.10"
                                stroke="#fbbf24"
                                strokeWidth="0.6"
                                strokeOpacity="0.35"
                            />
                        );
                    })}

                    {/* ── Physics radius ring (collision boundary) ── */}
                    {showRadiusRing && snapshot.config.centralRadius > 0 && (
                        <circle
                            cx={centerPos.x}
                            cy={centerPos.y}
                            r={Math.max(snapshot.config.centralRadius * camera.zoom, 2)}
                            fill="none"
                            stroke="#f87171"
                            strokeWidth="1.2"
                            strokeDasharray="5 4"
                            opacity="0.5"
                        />
                    )}

                    {/* ── Apsides (periapsis / apoapsis) ── */}
                    {showApsis && ob.periapsis && (
                        <g>
                            <line
                                x1={centerPos.x} y1={centerPos.y}
                                x2={w2s(ob.periapsis.x, ob.periapsis.y).x} y2={w2s(ob.periapsis.x, ob.periapsis.y).y}
                                stroke="#34d399" strokeWidth="1" strokeDasharray="3 3" opacity="0.5"
                            />
                            <circle cx={w2s(ob.periapsis.x, ob.periapsis.y).x} cy={w2s(ob.periapsis.x, ob.periapsis.y).y} r="4" fill="#34d399" />
                            <text x={w2s(ob.periapsis.x, ob.periapsis.y).x + 8} y={w2s(ob.periapsis.x, ob.periapsis.y).y - 6} fill="#34d399" fontSize="9" fontWeight="bold" fontFamily="monospace">
                                PERIAPSIS r_p = {fmt(ob.rp, 3)} km
                            </text>
                        </g>
                    )}
                    {showApsis && ob.apoapsis && (
                        <g>
                            <line
                                x1={centerPos.x} y1={centerPos.y}
                                x2={w2s(ob.apoapsis.x, ob.apoapsis.y).x} y2={w2s(ob.apoapsis.x, ob.apoapsis.y).y}
                                stroke="#fb7185" strokeWidth="1" strokeDasharray="3 3" opacity="0.5"
                            />
                            <circle cx={w2s(ob.apoapsis.x, ob.apoapsis.y).x} cy={w2s(ob.apoapsis.x, ob.apoapsis.y).y} r="4" fill="#fb7185" />
                            <text x={w2s(ob.apoapsis.x, ob.apoapsis.y).x + 8} y={w2s(ob.apoapsis.x, ob.apoapsis.y).y - 6} fill="#fb7185" fontSize="9" fontWeight="bold" fontFamily="monospace">
                                APOAPSIS r_a = {fmt(ob.ra, 3)} km
                            </text>
                        </g>
                    )}

                    {/* ── Central massive body ── */}
                    <g>
                        <circle cx={centerPos.x} cy={centerPos.y} r={centralPx + 14} fill="#fbbf24" opacity="0.10" />
                        <circle cx={centerPos.x} cy={centerPos.y} r={centralPx + 7} fill="#fbbf24" opacity="0.16" />
                        <circle cx={centerPos.x} cy={centerPos.y} r={centralPx} fill="url(#orb-star-grad)" stroke="#fde68a" strokeWidth="1.5" />
                        <text x={centerPos.x} y={centerPos.y - centralPx - 12} textAnchor="middle" fill="#fde68a" fontSize="10" fontWeight="bold" fontFamily="monospace" letterSpacing="0.08em">
                            ☉ CENTRAL BODY
                        </text>
                        <text x={centerPos.x} y={centerPos.y + centralPx + 16} textAnchor="middle" fill="#fbbf24" fontSize="9" fontFamily="monospace">
                            M = {fmt(ob.centralMass, 3)} kg · μ = {fmt(ob.mu, 4)} km³/s²
                        </text>
                    </g>

                    {/* ── Vectors from the satellite ── */}
                    {showAccelVector && snapshot.acceleration.magnitude > 0 && (() => {
                        const dx = -snapshot.position.x / snapshot.position.r;
                        const dy = -snapshot.position.y / snapshot.position.r;
                        return (
                            <g>
                                <line x1={sPos.x} y1={sPos.y} x2={sPos.x + dx * accelLen} y2={sPos.y + dy * accelLen}
                                    stroke="#e879f9" strokeWidth="2.2" markerEnd="url(#orb-accel-arrow)" />
                                <text x={sPos.x + dx * accelLen + 4} y={sPos.y + dy * accelLen + 3} fill="#e879f9" fontSize="8" fontWeight="bold" fontFamily="monospace">
                                    a = {fmt(snapshot.acceleration.magnitude, 3)} km/s²
                                </text>
                            </g>
                        );
                    })()}

                    {showForceVector && snapshot.force.magnitude > 0 && (() => {
                        const dx = -snapshot.position.x / snapshot.position.r;
                        const dy = -snapshot.position.y / snapshot.position.r;
                        return (
                            <g>
                                <line x1={sPos.x} y1={sPos.y} x2={sPos.x + dx * forceLen} y2={sPos.y + dy * forceLen}
                                    stroke="#f59e0b" strokeWidth="2.2" markerEnd="url(#orb-force-arrow)" />
                                <text x={sPos.x + dx * forceLen + 4} y={sPos.y + dy * forceLen + 3} fill="#f59e0b" fontSize="8" fontWeight="bold" fontFamily="monospace">
                                    F = {fmt(snapshot.force.magnitude, 3)} N
                                </text>
                            </g>
                        );
                    })()}

                    {showVelocityVector && snapshot.velocity.v > 0 && (() => {
                        const inv = 1 / snapshot.velocity.v;
                        const dx = snapshot.velocity.x * inv;
                        const dy = snapshot.velocity.y * inv;
                        return (
                            <g>
                                <line x1={sPos.x} y1={sPos.y} x2={sPos.x + dx * velLen} y2={sPos.y + dy * velLen}
                                    stroke="#22d3ee" strokeWidth="2.4" markerEnd="url(#orb-vel-arrow)" />
                                <text x={sPos.x + dx * velLen + 4} y={sPos.y + dy * velLen + 3} fill="#22d3ee" fontSize="8" fontWeight="bold" fontFamily="monospace">
                                    v = {fmt(snapshot.velocity.v, 3)} km/s
                                </text>
                            </g>
                        );
                    })()}

                    {/* ── The orbiting body (position comes directly from physics) ── */}
                    <g transform={`translate(${sPos.x}, ${sPos.y})`}>
                        <circle cx="0" cy="0" r={satellitePx + 6} fill="#38bdf8" opacity="0.15" />
                        <circle cx="0" cy="0" r={satellitePx} fill="url(#orb-sat-grad)" stroke="#bae6fd" strokeWidth="1.5" />
                        <line x1="-3" y1="0" x2="3" y2="0" stroke="#ffffff" strokeWidth="0.8" opacity="0.7" />
                        <line x1="0" y1="-3" x2="0" y2="3" stroke="#ffffff" strokeWidth="0.8" opacity="0.7" />
                        <text x="0" y={-satellitePx - 8} textAnchor="middle" fill="#bae6fd" fontSize="9" fontWeight="bold" fontFamily="monospace">
                            SATELLITE
                        </text>
                    </g>

                    {/* ── Impact flash ── */}
                    {impactFlash && (
                        <g transform={`translate(${sPos.x}, ${sPos.y})`}>
                            <circle cx="0" cy="0" r="30" fill="none" stroke="#ef4444" strokeWidth="3" opacity="0.8" className="animate-ping" />
                            <text x="0" y="-40" textAnchor="middle" fill="#ef4444" fontSize="14" fontWeight="bold" fontFamily="monospace" letterSpacing="0.1em">IMPACT / COLLISION</text>
                        </g>
                    )}
                    {snapshot.impacted && !impactFlash && (
                        <text x={viewSize.width / 2} y={viewSize.height / 2 - 60} textAnchor="middle" fill="#ef4444" fontSize="14" fontWeight="bold" fontFamily="monospace" letterSpacing="0.1em">
                            IMPACT / COLLISION
                        </text>
                    )}

                    {/* ── Legend ── */}
                    <g transform={`translate(16, ${viewSize.height - 24})`}>
                        <circle cx="0" cy="-3" r="3" fill="#22d3ee" /><text x="8" y="0" fill="#64748b" fontSize="9" fontFamily="monospace">v</text>
                        <circle cx="38" cy="-3" r="3" fill="#f59e0b" /><text x="46" y="0" fill="#64748b" fontSize="9" fontFamily="monospace">F</text>
                        <circle cx="68" cy="-3" r="3" fill="#e879f9" /><text x="76" y="0" fill="#64748b" fontSize="9" fontFamily="monospace">a</text>
                        <circle cx="98" cy="-3" r="3" fill="#fbbf24" /><text x="106" y="0" fill="#64748b" fontSize="9" fontFamily="monospace">swept area</text>
                        <text x="180" y="0" fill="#475569" fontSize="9" fontFamily="monospace">grid = {fmt(gridStep, 2)} km</text>
                    </g>
                </svg>
            </div>

            {/* ── Collapsible Engineering Information Bars ─────────────────────── */}
            <div className="shrink-0 relative z-20 max-h-[38vh] overflow-y-auto">
                {/* LIVE TELEMETRY */}
                <InfoBar
                    icon={<Activity size={13} />}
                    accent="text-emerald-400"
                    title="Live Orbital Telemetry"
                    summary={telemetrySummary}
                    open={openSection === 'telemetry'}
                    onToggle={() => toggleSection('telemetry')}
                    status={
                        <span className={`shrink-0 text-[9px] font-mono font-bold px-2 py-0.5 rounded ${snapshot.impacted ? 'bg-red-500/20 text-red-400' : (isPlaying ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' : 'bg-amber-500/20 text-amber-400')}`}>
                            {statusText}
                        </span>
                    }
                >
                    <div className="px-5 py-4 border-t border-white/5 space-y-3">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <Stat label="Sim Time (t)" value={formatSimTime(snapshot.time)} color="text-white" />
                            <Stat label="Orbits Completed" value={snapshot.orbitCount.toFixed(2)} color="text-sky-400" />
                            <Stat label="Radius (r)" value={fmt(snapshot.position.r, 4)} unit="km" color="text-emerald-400" />
                            <Stat label="Speed (|v|)" value={fmt(snapshot.velocity.v, 4)} unit="km/s" color="text-cyan-400" />
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <Stat label="Position x" value={fmt(snapshot.position.x, 3)} unit="km" />
                            <Stat label="Position y" value={fmt(snapshot.position.y, 3)} unit="km" />
                            <Stat label="vx" value={fmt(snapshot.velocity.x, 3)} unit="km/s" />
                            <Stat label="vy" value={fmt(snapshot.velocity.y, 3)} unit="km/s" />
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <Stat label="Acceleration |a|" value={fmt(snapshot.acceleration.magnitude, 3)} unit="km/s²" color="text-fuchsia-400" />
                            <Stat label="Acceleration ax" value={fmt(snapshot.acceleration.x, 3)} unit="km/s²" />
                            <Stat label="Acceleration ay" value={fmt(snapshot.acceleration.y, 3)} unit="km/s²" />
                            <Stat label="Gravity g = μ/r²" value={fmt(snapshot.acceleration.magnitude, 3)} unit="km/s²" color="text-amber-400" />
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            <Stat label="Gravitational Force |F|" value={fmt(snapshot.force.magnitude, 3)} unit="N" color="text-amber-400" />
                            <Stat label="Force Fx" value={fmt(snapshot.force.x, 3)} unit="N" />
                            <Stat label="Force Fy" value={fmt(snapshot.force.y, 3)} unit="N" />
                        </div>
                        {snapshot.impacted && (
                            <div className="bg-red-950/40 border border-red-500/40 px-3 py-2 rounded-lg text-xs font-mono text-red-300">
                                ⚠ IMPACT — satellite reached the central body's physical radius (r ≤ R_c = {fmt(snapshot.config.centralRadius, 3)} km). Impact speed: {fmt(snapshot.impactSpeed, 3)} km/s at t = {formatSimTime(snapshot.impactTime)}.
                            </div>
                        )}
                    </div>
                </InfoBar>

                {/* ORBITAL ELEMENTS & ENERGY */}
                <InfoBar
                    icon={<Gauge size={13} />}
                    accent="text-purple-400"
                    title="Orbital Elements · Energy · Momentum"
                    summary={elementsSummary}
                    open={openSection === 'elements'}
                    onToggle={() => toggleSection('elements')}
                    status={<span className="shrink-0 text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">{ob.type}</span>}
                >
                    <div className="px-5 py-4 border-t border-white/5 space-y-3">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <Stat label="μ = GM" value={fmt(ob.mu, 5)} unit="km³/s²" color="text-amber-400" />
                            <Stat label="Circular Velocity" value={fmt(ob.vCirc, 4)} unit="km/s" color="text-sky-400" />
                            <Stat label="Escape Velocity" value={fmt(ob.vEsc, 4)} unit="km/s" color="text-rose-400" />
                            <Stat label="Current |v|" value={fmt(snapshot.velocity.v, 4)} unit="km/s" color="text-cyan-400" />
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                            <Stat label="Semi-major a" value={Number.isFinite(ob.semiMajor) ? fmt(ob.semiMajor, 4) : '∞'} unit="km" color="text-purple-400" />
                            <Stat label="Eccentricity e" value={fmt(ob.ecc, 4)} color="text-purple-300" />
                            <Stat label="Periapsis r_p" value={Number.isFinite(ob.rp) ? fmt(ob.rp, 4) : '—'} unit="km" color="text-emerald-400" />
                            <Stat label="Apoapsis r_a" value={Number.isFinite(ob.ra) ? fmt(ob.ra, 4) : '∞'} unit="km" color="text-rose-400" />
                            <Stat label="Period T" value={Number.isFinite(ob.period) ? formatSimTime(ob.period) : '∞'} color="text-sky-300" />
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <Stat label="Kinetic Energy" value={fmt(snapshot.kinetic, 4)} unit="J" color="text-emerald-400" />
                            <Stat label="Potential Energy" value={fmt(snapshot.potential, 4)} unit="J" color="text-sky-400" />
                            <Stat label="Total Energy E" value={fmt(snapshot.totalEnergy, 4)} unit="J" color="text-amber-400" />
                            <Stat label="Specific ε = v²/2−μ/r" value={fmt(ob.eps, 4)} unit="km²/s²" color={ob.eps < 0 ? 'text-emerald-400' : (ob.eps > 0 ? 'text-rose-400' : 'text-amber-400')} />
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                            <Stat label="Angular Mom. h (spec.)" value={fmt(ob.h, 4)} unit="km²/s" color="text-fuchsia-400" />
                            <Stat label="Angular Mom. H" value={fmt(ob.hMomentum, 4)} unit="kg·km²/s" color="text-fuchsia-300" />
                            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 flex flex-col justify-center">
                                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Orbit Classification</span>
                                <span className="text-sm font-bold font-mono" style={{ color: orbitAccent }}>{ob.type}</span>
                                <span className="text-[9px] font-mono text-slate-500">
                                    {ob.eps < 0 ? 'ε < 0 → bound' : (ob.eps > 0 ? 'ε > 0 → unbound' : 'ε = 0 → parabolic boundary')}
                                </span>
                            </div>
                        </div>
                        <div className="bg-slate-950/60 px-3 py-2 rounded-lg font-mono text-[9px] text-slate-400 space-y-0.5 border border-white/5">
                            <div className="text-slate-300 font-bold">CONSERVED QUANTITIES (ideal two-body)</div>
                            <div>ε = v²/2 − μ/r &nbsp;·&nbsp; h = x·v_y − y·v_x &nbsp;·&nbsp; E_total should remain constant</div>
                        </div>
                    </div>
                </InfoBar>

                {/* GRAPHS */}
                <InfoBar
                    icon={<TrendingUp size={13} />}
                    accent="text-sky-400"
                    title="Energy Graph (real sampled data)"
                    summary={energySummary}
                    open={openSection === 'graphs'}
                    onToggle={() => toggleSection('graphs')}
                >
                    <div className="px-5 py-4 border-t border-white/5">
                        <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5">
                            <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-1">
                                <span>ENERGY vs TIME</span>
                                <span>Total E drift: {snapshot.energyHistory.total.length > 1 ? `${fmt(Math.abs(snapshot.energyHistory.total[snapshot.energyHistory.total.length - 1] - snapshot.energyHistory.total[0]), 4)} J over window` : '—'}</span>
                            </div>
                            <EnergyGraph history={snapshot.energyHistory} />
                            <div className="text-[9px] font-mono text-slate-500 mt-1">
                                In an ideal two-body problem total orbital energy is conserved — the amber line stays flat.
                            </div>
                        </div>
                    </div>
                </InfoBar>

                {/* KEPLER */}
                <InfoBar
                    icon={<BookOpen size={13} />}
                    accent="text-amber-400"
                    title="Kepler's Laws"
                    summary={keplerSummary}
                    open={openSection === 'kepler'}
                    onToggle={() => toggleSection('kepler')}
                >
                    <div className="px-5 py-4 border-t border-white/5 space-y-3">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <Stat label="Orbit Count" value={snapshot.orbitCount.toFixed(2)} color="text-sky-400" />
                            <Stat label="Semi-major a" value={Number.isFinite(ob.semiMajor) ? fmt(ob.semiMajor, 4) : '∞'} unit="km" />
                            <Stat label="Period T" value={Number.isFinite(ob.period) ? formatSimTime(ob.period) : '∞'} />
                            <Stat label="T² ∝ a³" value={Number.isFinite(ob.period) && Number.isFinite(ob.semiMajor) ? fmt(Math.pow(ob.period, 2) / Math.pow(ob.semiMajor, 3), 3) : '—'} unit="s²/km³" color="text-amber-300" />
                        </div>
                        <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 space-y-1 font-mono text-[9px] text-slate-400">
                            <div className="text-amber-300 font-bold text-[10px]">1st LAW — Elliptical orbits with the central body at one focus</div>
                            <div>The central body sits at a focus, NOT the geometric center (see PERIAPSIS / APOAPSIS markers).</div>
                            <div className="text-emerald-300 font-bold text-[10px] mt-1">2nd LAW — Equal areas swept in equal times</div>
                            <div>
                                Consecutive swept sectors are recorded over equal time intervals ({formatSimTime(snapshot.sectors.length ? snapshot.sectors[snapshot.sectors.length - 1].t1 - snapshot.sectors[snapshot.sectors.length - 1].t0 : 0)} each).
                                Near periapsis the satellite moves faster; near apoapsis slower.
                            </div>
                            <div className="text-sky-300 font-bold text-[10px] mt-1">3rd LAW — T² ∝ a³</div>
                            <div>T = 2π√(a³/μ) → T²/a³ = 4π²/μ is constant for a fixed central body.</div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {snapshot.sectors.slice(-12).map((s, i) => (
                                <Stat key={i} label={`Sector t=${fmt(s.t0, 2)}s`} value={fmt(s.area, 3)} unit="km²" color="text-amber-400" />
                            ))}
                        </div>
                    </div>
                </InfoBar>

                {/* ORBIT SETUP */}
                <InfoBar
                    icon={<Sliders size={13} />}
                    accent="text-slate-300"
                    title="Orbit Setup (Initial Conditions)"
                    summary={setupSummary}
                    open={openSection === 'setup'}
                    onToggle={() => toggleSection('setup')}
                    status={
                        <button
                            onClick={(e) => { e.stopPropagation(); applyPreset('circular'); }}
                            className="shrink-0 text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 hover:bg-sky-500/40 cursor-pointer transition-colors"
                            title="Set v = √(μ/r) circular velocity"
                        >
                            ⨀ Circular v
                        </button>
                    }
                >
                    <div className="px-5 py-4 border-t border-white/5 max-h-[46vh] overflow-y-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-4">
                            <SliderField label="μ = GM (km³/s²)" value={mu} min={50} max={200000} step={10} onChange={setMu} fmt={fmt(mu, 4)} />
                            <SliderField label="Central radius R (km)" value={centralRadius} min={1} max={400} step={1} onChange={setCentralRadius} fmt={fmt(centralRadius, 3)} />
                            <SliderField label="Initial radius r₀ (km)" value={r0} min={20} max={2000} step={5} onChange={setR0} fmt={fmt(r0, 3)} />
                            <SliderField label="Initial angle θ₀ (deg)" value={theta0} min={0} max={359} step={1} onChange={setTheta0} fmt={`${theta0.toFixed(0)}°`} />
                            <SliderField label="Initial speed v₀ (km/s)" value={v0} min={0.1} max={30} step={0.01} onChange={setV0} fmt={fmt(v0, 4)} />
                            <SliderField label="Velocity direction φ (deg)" value={velAngle} min={0} max={359} step={1} onChange={setVelAngle} fmt={`${velAngle.toFixed(0)}°`} />
                            <SliderField label="Satellite mass m (kg)" value={satelliteMass} min={100} max={10000} step={100} onChange={setSatelliteMass} fmt={fmt(satelliteMass, 4)} />
                            <SliderField label="Central mass M (kg)" value={centralMass} min={1e20} max={1e25} step={1e20} onChange={setCentralMass} fmt={centralMass.toExponential(2)} />
                            <SliderField label="Physics Δt (s)" value={dt} min={0.01} max={2} step={0.01} onChange={setDt} fmt={`${dt.toFixed(2)} s`} />
                            <SliderField label="Simulation speed" value={timeScale} min={1} max={500} step={1} onChange={setTimeScale} fmt={`${timeScale}×`} />
                        </div>
                        <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-2">
                            <button onClick={() => { setV0(Number(Math.sqrt(mu / r0).toFixed(4))); }} className="px-3 py-2 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-bold uppercase tracking-wider hover:bg-sky-500/25 transition-colors cursor-pointer">
                                v = √(μ/r₀) — Circular
                            </button>
                            <button onClick={() => { setV0(Number(Math.sqrt(2 * mu / r0).toFixed(4))); }} className="px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider hover:bg-amber-500/25 transition-colors cursor-pointer">
                                v = √(2μ/r₀) — Escape
                            </button>
                            <div className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-[9px] font-mono text-slate-400 flex items-center justify-center">
                                v_c = {fmt(Math.sqrt(mu / r0), 3)} · v_esc = {fmt(Math.sqrt(2 * mu / r0), 3)} km/s
                            </div>
                        </div>
                    </div>
                </InfoBar>
            </div>

            {/* ── Bottom Playback & Timeline Bar ───────────────────────────────── */}
            <div className="h-16 bg-slate-950/95 border-t border-white/10 backdrop-blur-3xl px-6 flex items-center justify-between z-30 shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={handleReset} className="p-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer bg-white/5 hover:bg-white/10 rounded-xl" title="Reset Simulation">
                        <RefreshCw size={15} />
                    </button>
                    <button
                        onClick={togglePlayback}
                        className={`h-10 px-6 rounded-xl flex items-center justify-center font-bold tracking-wider uppercase text-xs transition-all cursor-pointer shadow-lg ${isPlaying ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20' : 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/30'}`}
                    >
                        {isPlaying ? <><Square size={13} fill="currentColor" className="mr-2" /> PAUSE</> : <><Play size={15} fill="currentColor" className="mr-2" /> RUN ORBIT</>}
                    </button>
                    <button onClick={handleStepForward} disabled={isPlaying} className="p-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer bg-white/5 hover:bg-white/10 rounded-xl disabled:opacity-30" title="Step Forward">
                        <SkipForward size={15} />
                    </button>
                </div>

                {/* Simulation Speed */}
                <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-white/10">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Speed</span>
                    {[0.1, 0.25, 0.5, 1, 2, 5, 10, 50, 100, 200].map(s => (
                        <button
                            key={s}
                            onClick={() => setTimeScale(s)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${timeScale === s ? 'bg-sky-500 text-white' : 'text-slate-500 hover:text-white'}`}
                        >
                            {s}x
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4 min-w-80">
                    <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-slate-400 font-bold">ORBIT PROGRESS</span>
                            <span className="text-sky-400">{snapshot.orbitCount.toFixed(2)} orbits</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                            <div className="h-full bg-gradient-to-r from-sky-500 to-purple-400 transition-all duration-75" style={{ width: `${clamp((snapshot.orbitCount % 1) * 100, 0, 100)}%` }} />
                        </div>
                    </div>
                    <div className="text-right font-mono">
                        <div className="text-xs font-bold text-white">t = {formatSimTime(snapshot.time)}</div>
                        <div className="text-[9px]" style={{ color: orbitAccent }}>{ob.type}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ToggleBtn({ on, set, label, color }) {
    return (
        <button
            onClick={() => set(!on)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${on ? 'text-white border' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
            style={on ? { color, borderColor: `${color}55`, backgroundColor: `${color}1a` } : {}}
        >
            <Zap size={10} style={{ color: on ? color : undefined }} /> {label}
        </button>
    );
}

function SliderField({ label, value, min, max, step, onChange, fmt }) {
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400">{label}</span>
                <span className="text-sky-400 font-bold">{fmt}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
        </div>
    );
}