import React, { useState, useEffect, useRef } from 'react';
import {
    Play, Square, RefreshCw, SkipForward, ChevronDown, Activity,
    Sliders, ZoomIn, ZoomOut, Maximize, Crosshair, RotateCcw,
    TrendingUp, BarChart3, Gauge, Zap, Move
} from 'lucide-react';
import useStore from '../store/useStore';
import InclinedRampSolver, { RAMP_PRESETS, GRAVITY_PRESETS, RAMP_STATES, clamp } from '../utils/solvers/inclinedRampSolver';

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

const STATE_COLOR = {
    'STATIONARY': '#34d399',
    'SLIDING DOWN': '#38bdf8',
    'SLIDING UP': '#fbbf24',
    'CRITICAL ANGLE': '#f472b6',
};

const GRAVITY_ACCENT = { earth: '#38bdf8', moon: '#94a3b8', mars: '#f87171', zero: '#a78bfa' };

// ── Scientific graph (real sampled data) ─────────────────────────────────────
function TrendGraph({ x, series, unit = '', height = 150 }) {
    if (!x || x.length < 2) {
        return (
            <div className="h-40 flex items-center justify-center text-[10px] font-mono text-slate-600">
                Collecting samples…
            </div>
        );
    }
    const W = 560, H = height, PAD = 12;
    const t0 = x[0], t1 = x[x.length - 1];
    let lo = Infinity, hi = -Infinity;
    for (const s of series) {
        for (let i = 0; i < x.length; i++) {
            const v = s.data[i];
            if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
        }
    }
    if (!Number.isFinite(lo)) { lo = 0; hi = 1; }
    if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
    const X = (t) => PAD + ((t - t0) / (t1 - t0 || 1)) * (W - PAD * 2);
    const Y = (v) => H - PAD - ((v - lo) / (hi - lo)) * (H - PAD * 2);
    const line = (data) => data.map((v, i) => `${X(x[i]).toFixed(1)},${Y(Number.isFinite(v) ? v : lo).toFixed(1)}`).join(' ');
    const gridY = [0, 0.25, 0.5, 0.75, 1].map(f => lo + f * (hi - lo));
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-h-40">
            {gridY.map((gv, i) => (
                <line key={i} x1={PAD} y1={Y(gv)} x2={W - PAD} y2={Y(gv)} stroke="#1e293b" strokeWidth="1" />
            ))}
            <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#334155" strokeWidth="1" />
            {series.map(s => (
                <polyline key={s.name} points={line(s.data)} fill="none" stroke={s.color} strokeWidth="1.6" />
            ))}
            <text x={W - PAD} y={H - 3} textAnchor="end" fill="#475569" fontSize="8" fontFamily="monospace">
                {series.map(s => `${s.name} ${unit}`).join(' · ')}
            </text>
        </svg>
    );
}

// ── Free-Body Diagram (compact, always perpendicular-to-ramp) ────────────────
function FreeBodyDiagram({ forces, thetaDeg, state }) {
    const W = 260, H = 210;
    const cx = W / 2, cy = H / 2;
    const th = thetaDeg * DEG;
    const fpx = 2.9; // px per newton (fixed local scale)
    const bw = 34, bh = 34; // block size px

    const ux = Math.cos(th), uy = Math.sin(th);       // up the ramp (world)
    const nx = -Math.sin(th), ny = Math.cos(th);      // outward normal (world)
    // Block centre sits one half-height above the ramp surface.
    const bx = cx - (bh / 2 + 6) * Math.sin(th);
    const by = cy - (bh / 2 + 6) * Math.cos(th);
    const fSig = forces.friction;
    const frictionLabel = state.includes('SLIDING') ? 'f_k' : 'f_s';

    const arrow = (fx, fy, color, label, dashed) => {
        const sx = fx * fpx, sy = -fy * fpx;
        const len = Math.hypot(sx, sy);
        if (len < 6) return null;
        const ex = bx + sx, ey = by + sy;
        return (
            <g key={label}>
                <line x1={bx} y1={by} x2={ex} y2={ey} stroke={color} strokeWidth="2.2"
                    strokeDasharray={dashed ? '4 3' : undefined}
                    markerEnd={`url(#fbd-${color.replace('#', '')})`} />
                <text x={ex + 6 * Math.sign(sx || 1)} y={ey - 5} fill={color} fontSize="10" fontWeight="bold" fontFamily="monospace">{label}</text>
            </g>
        );
    };

    const w = forces.weight;
    const N = forces.normal;
    const rLen = 84;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-h-52 border border-white/10 rounded-xl bg-black/30">
            <defs>
                {['f59e0b', '34d399', 'fb7185', '38bdf8', 'a78bfa'].map(c => (
                    <marker key={c} id={`fbd-${c}`} markerWidth="8" markerHeight="5" refX="7" refY="2.5" orient="auto">
                        <polygon points="0 0, 8 2.5, 0 5" fill={`#${c}`} />
                    </marker>
                ))}
            </defs>
            {/* ramp surface (rotates with θ) */}
            <line x1={cx - rLen * Math.cos(th)} y1={cy + rLen * Math.sin(th)}
                x2={cx + rLen * Math.cos(th)} y2={cy - rLen * Math.sin(th)}
                stroke="#334155" strokeWidth="6" />
            <line x1={cx - rLen * Math.cos(th)} y1={cy + rLen * Math.sin(th)}
                x2={cx + rLen * Math.cos(th)} y2={cy - rLen * Math.sin(th)}
                stroke="#64748b" strokeWidth="2" />
            {/* block (rotated with the ramp) */}
            <rect x={bx - bw / 2} y={by - bh / 2} width={bw} height={bh} rx="3"
                fill="#38bdf8" fillOpacity="0.25" stroke="#7dd3fc" strokeWidth="1.5"
                transform={`rotate(${-thetaDeg} ${bx} ${by})`} />
            <text x={cx} y={cy + 40} textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">θ = {fmt(thetaDeg, 3)}°</text>
            {/* force vectors from block centre */}
            {arrow(0, -w, '#f59e0b', 'mg', false)}
            {arrow(N * nx, N * ny, '#34d399', 'N', false)}
            {arrow(fSig * ux, fSig * uy, '#fb7185', frictionLabel, false)}
            {arrow(-forces.parallel * ux, -forces.parallel * uy, '#38bdf8', 'mg·sinθ', true)}
            {arrow(forces.perp * Math.sin(th), -forces.perp * Math.cos(th), '#a78bfa', 'mg·cosθ', true)}
        </svg>
    );
}

// ── Inclined Friction Ramp Laboratory ────────────────────────────────────────
export default function InclinedRampLab() {
    const isPlaying = useStore(state => state.isPlaying);
    const togglePlayback = useStore(state => state.togglePlayback);
    const resetPlayback = useStore(state => state.resetPlayback);
    const setLabData = useStore(state => state.setLabData);
    const clearLabData = useStore(state => state.clearLabData);

    // ── Laboratory configuration (SI units — physics scale ≠ visual scale) ──
    const [mass, setMass] = useState(2.0);            // kg
    const [g, setG] = useState(9.81);                 // m/s²
    const [thetaDeg, setThetaDeg] = useState(30.0);   // ramp incline
    const [muS, setMuS] = useState(0.5);              // static friction coefficient
    const [muK, setMuK] = useState(0.3);              // kinetic friction coefficient
    const [rampLength, setRampLength] = useState(5.0);// m
    const [s0, setS0] = useState(3.0);                // m initial position along ramp
    const [v0, setV0] = useState(0.0);                // m/s initial velocity along ramp
    const [dt, setDt] = useState(1 / 120);            // fixed physics timestep (s)
    const [timeScale, setTimeScale] = useState(1.0);  // sim-time multiplier

    // ── Visual overlay toggles ───────────────────────────────────────────────
    const [showTrail, setShowTrail] = useState(true);
    const [showGravity, setShowGravity] = useState(true);
    const [showNormal, setShowNormal] = useState(true);
    const [showFriction, setShowFriction] = useState(true);
    const [showComponents, setShowComponents] = useState(true);
    const [showNetForce, setShowNetForce] = useState(false);
    const [showVelocity, setShowVelocity] = useState(true);
    const [showCritical, setShowCritical] = useState(true);

    // ── Camera ───────────────────────────────────────────────────────────────
    const [camera, setCamera] = useState({ cx: 0, cy: 0, zoom: 60 });
    const [cameraMode, setCameraMode] = useState('fit'); // 'fit' | 'follow'
    const [needsFit, setNeedsFit] = useState(true);

    // ── Accordion state ──────────────────────────────────────────────────────
    const [openSection, setOpenSection] = useState('telemetry');
    const toggleSection = (key) => setOpenSection(prev => (prev === key ? null : key));

    // ── Graph tab ────────────────────────────────────────────────────────────
    const [graphTab, setGraphTab] = useState('position');

    // ── Physics solver ───────────────────────────────────────────────────────
    const solverRef = useRef(new InclinedRampSolver({
        mass: 2.0, g: 9.81, thetaDeg: 30, muS: 0.5, muK: 0.3,
        rampLength: 5.0, initialPosition: 3.0, initialVelocity: 0,
        dt: 1 / 120, timeScale: 1.0, blockSize: 0.45,
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
            type: 'inclined_friction_ramp',
            title: 'Inclined Friction Ramp Laboratory',
            snapshot: snapshot,
            config: { mass, g, thetaDeg, muS, muK, rampLength, s0, v0, dt, timeScale },
        });
        return () => clearLabData();
    }, [snapshot, mass, g, thetaDeg, muS, muK, rampLength, s0, v0, dt, timeScale, setLabData, clearLabData]);

    // ── Listen for config changes from Properties panel ──────────────────────
    useEffect(() => {
        const handleConfigChange = (event) => {
            const { type, key, value } = event.detail;
            if (type !== 'inclined_friction_ramp') return;
            if (key === 'mass') setMass(value);
            else if (key === 'g') setG(value);
            else if (key === 'thetaDeg') { setThetaDeg(value); setNeedsFit(true); }
            else if (key === 'muS') setMuS(value);
            else if (key === 'muK') setMuK(value);
            else if (key === 'rampLength') setRampLength(value);
            else if (key === 's0') setS0(value);
            else if (key === 'v0') setV0(value);
            else if (key === 'dt') setDt(value);
            else if (key === 'timeScale') setTimeScale(value);
        };
        window.addEventListener('lab-config-change', handleConfigChange);
        return () => window.removeEventListener('lab-config-change', handleConfigChange);
    }, []);

    // ── Sync configuration into the solver (core changes reset) ──────────────
    useEffect(() => {
        solverRef.current.updateConfig({
            mass, g, thetaDeg, muS, muK, rampLength,
            initialPosition: clamp(s0, 0, rampLength),
            initialVelocity: v0,
            dt, timeScale,
        });
        setSnapshot(solverRef.current.getSnapshot());
    }, [mass, g, thetaDeg, muS, muK, rampLength, s0, v0, dt, timeScale]);

    // ── Camera helpers ───────────────────────────────────────────────────────
    const fitRamp = () => {
        if (viewSize.width <= 0) return;
        const th = thetaDeg * DEG;
        const L = rampLength;
        const xmin = -1.2;
        const xmax = L * Math.cos(th) + 1.2;
        const ymin = -1.6;
        const ymax = L * Math.sin(th) + 1.5;
        const w = Math.max(xmax - xmin, 1e-6);
        const h = Math.max(ymax - ymin, 1e-6);
        const zoom = Math.min((viewSize.width * 0.78) / w, (viewSize.height * 0.78) / h);
        setCamera({ cx: (xmin + xmax) / 2, cy: (ymin + ymax) / 2, zoom: Math.max(zoom, 1e-9) });
        setCameraMode('fit');
    };

    const followBlock = () => setCameraMode('follow');
    const zoomIn = () => setCamera(c => ({ ...c, zoom: c.zoom * 1.3 }));
    const zoomOut = () => setCamera(c => ({ ...c, zoom: Math.max(c.zoom / 1.3, 1e-9) }));

    // Fit after mount / reset / angle change
    useEffect(() => {
        if (needsFit && viewSize.width > 0) {
            fitRamp();
            setNeedsFit(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [needsFit, viewSize]);

    // ── Presets ──────────────────────────────────────────────────────────────
    const applyPreset = (id) => {
        const p = RAMP_PRESETS.find(x => x.id === id);
        if (!p) return;
        let th = p.thetaDeg;
        if (th === 'below') th = Math.atan(p.muS) / DEG - 1.0;
        else if (th === 'critical') th = Math.atan(p.muS) / DEG;
        else if (th === 'above') th = Math.atan(p.muS) / DEG + 5.0;
        setThetaDeg(th);
        setMuS(p.muS);
        setMuK(p.muK);
        setV0(p.v0 ?? 0);
        if (p.g !== undefined) setG(p.g);
        setNeedsFit(true);
    };

    const applyGravity = (id) => {
        const p = GRAVITY_PRESETS.find(x => x.id === id);
        if (p) setG(p.g);
    };

    // ── Playback ─────────────────────────────────────────────────────────────
    const reqRef = useRef(null);
    const lastTimeRef = useRef(0);

    const handleReset = () => {
        resetPlayback();
        solverRef.current.reset();
        setSnapshot(solverRef.current.getSnapshot());
        setNeedsFit(true);
    };

    const handleStepForward = () => {
        if (!isPlaying) {
            setSnapshot({ ...solverRef.current.step(1 / 60) });
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
            simulationType: 'InclinedFrictionRampExperiment',
            ...snapshot,
        });
        return () => { delete window.REALIS_AI_QUERY; };
    }, [snapshot]);

    // ── World → Screen projection ────────────────────────────────────────────
    const w2s = (wx, wy) => ({
        x: viewSize.width / 2 + (wx - camera.cx) * camera.zoom,
        y: viewSize.height / 2 - (wy - camera.cy) * camera.zoom,
    });

    const p = snapshot.params;
    const th = p.thetaDeg * DEG;
    const cos = Math.cos(th), sin = Math.sin(th);
    const L = p.rampLength;
    const state = snapshot.state;
    const stateColor = STATE_COLOR[state] || '#34d399';
    const f = snapshot.forces;
    const e = snapshot.energy;

    // Ramp geometry (world → screen)
    const baseW = { x: 0, y: 0 };
    const topW = { x: L * cos, y: L * sin };
    const thick = 0.38;
    const bodyQuad = [
        baseW,
        topW,
        { x: topW.x + thick * sin, y: topW.y - thick * cos },
        { x: baseW.x + thick * sin, y: baseW.y - thick * cos },
    ].map(w2s);
    const baseS = w2s(baseW.x, baseW.y);
    const topS = w2s(topW.x, topW.y);

    // Block geometry
    const bHalf = p.blockSize / 2;
    const blockCenterW = { x: snapshot.rampState.s * cos - bHalf * sin, y: snapshot.rampState.s * sin + bHalf * cos };
    const blockS = w2s(blockCenterW.x, blockCenterW.y);
    const contactS = w2s(snapshot.rampState.s * cos, snapshot.rampState.s * sin);
    const blockPx = p.blockSize * camera.zoom;

    // Force vector scaling (px per newton — linear, so magnitudes stay honest)
    const fpx = 0.045 * camera.zoom;
    // velocity scaling (px per m/s)
    const vpx = 0.5 * camera.zoom;

    // Vector screen deltas
    const vecD = (fx, fy) => ({ x: fx * fpx, y: -fy * fpx });
    const wVec = vecD(0, -f.weight);
    const nVec = vecD(f.normal * (-sin), f.normal * cos);
    const fDir = f.friction;                 // signed along ramp (+ = up)
    const fVec = vecD(fDir * cos, fDir * sin);
    const parVec = vecD(-f.parallel * cos, -f.parallel * sin);
    const perpVec = vecD(f.perp * sin, -f.perp * cos);
    const netVec = vecD(f.netForce * cos, f.netForce * sin);
    const velVec = { x: snapshot.rampState.v * cos * vpx, y: -snapshot.rampState.v * sin * vpx };

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

    // Trail (actual historical positions)
    const trailPts = snapshot.trail.map(pt => {
        const s = w2s(pt.x, pt.y);
        return `${s.x.toFixed(1)},${s.y.toFixed(1)}`;
    }).join(' ');

    // Angle arc (0 → θ) at the base
    const arcR = 0.55;
    const arcPts = [];
    for (let i = 0; i <= 14; i++) {
        const phi = (i / 14) * th;
        const a = w2s(arcR * Math.cos(phi), arcR * Math.sin(phi));
        arcPts.push(`${a.x.toFixed(1)},${a.y.toFixed(1)}`);
    }
    const arcEndW = { x: arcR * cos, y: arcR * sin };
    const arcEndS = w2s(arcEndW.x, arcEndW.y);

    // Critical-angle ray at θ_c
    const thetaC = snapshot.thetaCDeg * DEG;
    const critLen = 0.7 * L;
    const critRayW = { x: critLen * Math.cos(thetaC), y: critLen * Math.sin(thetaC) };
    const critRayS = w2s(critRayW.x, critRayW.y);

    // Hatch marks along the ramp surface (friction visual)
    const hatchCount = Math.max(4, Math.floor(L / 0.6));
    const hatches = [];
    for (let i = 1; i < hatchCount; i++) {
        const sPos = (i / hatchCount) * L;
        const aW = { x: sPos * cos, y: sPos * sin };
        const bW = { x: aW.x + 0.16 * sin, y: aW.y - 0.16 * cos };
        hatches.push({ a: w2s(aW.x, aW.y), b: w2s(bW.x, bW.y) });
    }

    // Up-ramp direction arrow near the top
    const dirStartW = { x: (L - 0.8) * cos, y: (L - 0.8) * sin };
    const dirEndW = { x: (L - 0.35) * cos, y: (L - 0.35) * sin };
    const dirStartS = w2s(dirStartW.x, dirStartW.y);
    const dirEndS = w2s(dirEndW.x, dirEndW.y);

    // Telemetry summaries
    const telemetrySummary = `t ${formatSimTime(snapshot.time)} · s ${fmt(snapshot.rampState.s, 3)} m · v ${fmt(snapshot.rampState.v, 3)} m/s · ${state}`;
    const forceSummary = `N ${fmt(f.normal, 3)} N · f ${fmt(f.frictionMagnitude, 3)} N · F_net ${fmt(f.netForce, 3)} N`;
    const energySummary = `E ${fmt(e.total, 3)} J · KE ${fmt(e.kinetic, 3)} J · lost ${fmt(e.lost, 3)} J`;
    const setupSummary = `m ${fmt(mass, 3)} kg · θ ${fmt(thetaDeg, 2)}° · μ_s ${fmt(muS, 3)} · μ_k ${fmt(muK, 3)}`;

    const frictionLabel = Math.abs(snapshot.rampState.v) > 1e-6 ? 'f_k' : (f.frictionKind === 'static' ? 'f_s' : 'f_k');
    const atCritical = Math.abs(snapshot.criticalAngleDeg - p.thetaDeg) < 0.35;
    const stateNote = snapshot.hitEnd
        ? `Block reached the ${snapshot.hitEnd === 'top' ? 'top' : 'bottom'} end of the ramp and is held at rest.`
        : (state === 'CRITICAL ANGLE'
            ? 'θ = arctan(μ_s) — the block is exactly on the boundary of slipping.'
            : (state === 'STATIONARY'
                ? (p.g === 0
                    ? 'Zero gravity — no weight, no friction. The block stays put (inertia).'
                    : `Static friction balances mg·sinθ = ${fmt(f.parallel, 3)} N (≤ μ_s·N = ${fmt(f.fStaticMax, 3)} N).`)
                : (state === 'SLIDING UP'
                    ? `Friction opposes motion: a = −g(sinθ + μ_k·cosθ) = ${fmt(snapshot.rampState.a, 3)} m/s²`
                    : `Net force mg·sinθ − μ_k·mg·cosθ: a = ${fmt(snapshot.rampState.a, 3)} m/s²`)));

    return (
        <div ref={containerRef} className="relative w-full h-full bg-[#0a0f1a] overflow-hidden select-none font-sans flex flex-col">
            {/* Background vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_50%_0%,rgba(56,189,248,0.10),rgba(255,255,255,0))] pointer-events-none" />

            {/* ── Top Floating Header ─────────────────────────────────────────── */}
            <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none flex-wrap gap-2">
                <div className="flex items-center gap-3 pointer-events-auto">
                    <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-sky-500/30 shadow-lg shadow-sky-500/10">
                        <Move size={14} className="text-sky-400 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Inclined Friction Ramp</span>
                        <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: `${stateColor}22`, color: stateColor }}>
                            <span className="text-[10px] font-mono font-bold">{state}</span>
                        </span>
                    </div>
                    {/* Preset Quick Buttons */}
                    <div className="flex bg-slate-900/80 backdrop-blur-md p-0.5 rounded-xl border border-white/10 flex-wrap">
                        {RAMP_PRESETS.map(p => (
                            <button
                                key={p.id}
                                onClick={() => applyPreset(p.id)}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer text-slate-400 hover:text-white hover:bg-white/5"
                                title={p.name}
                            >
                                <span style={{ color: p.accent }}>{p.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Visual Layer Toggles */}
                <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-white/10 pointer-events-auto flex-wrap">
                    <ToggleBtn on={showTrail} set={setShowTrail} label="Trail" color="#475569" />
                    <ToggleBtn on={showGravity} set={setShowGravity} label="mg" color="#f59e0b" />
                    <ToggleBtn on={showNormal} set={setShowNormal} label="N" color="#34d399" />
                    <ToggleBtn on={showFriction} set={setShowFriction} label="f" color="#fb7185" />
                    <ToggleBtn on={showComponents} set={setShowComponents} label="Components" color="#38bdf8" />
                    <ToggleBtn on={showNetForce} set={setShowNetForce} label="F_net" color="#f472b6" />
                    <ToggleBtn on={showVelocity} set={setShowVelocity} label="v" color="#22d3ee" />
                    <ToggleBtn on={showCritical} set={setShowCritical} label="θ_c" color="#fbbf24" />
                </div>
            </div>

            {/* ── Camera Controls ─────────────────────────────────────────────── */}
            <div className="absolute top-20 left-4 z-20 flex flex-col gap-1 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-2xl">
                <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest text-center mb-0.5">Camera</span>
                <button onClick={fitRamp} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer" title="Fit Ramp (frame whole system)">
                    <Maximize size={14} />
                </button>
                <button onClick={followBlock} className={`p-2 rounded-lg transition-all cursor-pointer ${cameraMode === 'follow' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:text-white hover:bg-white/10'}`} title="Follow Block">
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
                        <marker id="ramp-w-arrow" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 9 3, 0 6" fill="#f59e0b" />
                        </marker>
                        <marker id="ramp-n-arrow" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 9 3, 0 6" fill="#34d399" />
                        </marker>
                        <marker id="ramp-f-arrow" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 9 3, 0 6" fill="#fb7185" />
                        </marker>
                        <marker id="ramp-p-arrow" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 9 3, 0 6" fill="#38bdf8" />
                        </marker>
                        <marker id="ramp-q-arrow" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 9 3, 0 6" fill="#a78bfa" />
                        </marker>
                        <marker id="ramp-net-arrow" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 9 3, 0 6" fill="#f472b6" />
                        </marker>
                        <marker id="ramp-v-arrow" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 9 3, 0 6" fill="#22d3ee" />
                        </marker>
                    </defs>

                    {/* World-aligned grid (metres) */}
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

                    {/* ── Ground ── */}
                    <g>
                        <line x1={w2s(-1.1, 0).x} y1={w2s(-1.1, 0).y} x2={w2s(L * cos + 1.1, 0).x} y2={w2s(L * cos + 1.1, 0).y}
                            stroke="#475569" strokeWidth="3" />
                        <line x1={w2s(-1.1, 0).x} y1={w2s(-1.1, 0).y + 3} x2={w2s(L * cos + 1.1, 0).x} y2={w2s(L * cos + 1.1, 0).y + 3}
                            stroke="#1e293b" strokeWidth="6" />
                        <text x={w2s(-0.4, -0.28).x} y={w2s(-0.4, -0.28).y} fill="#475569" fontSize="9" fontFamily="monospace">ground</text>
                    </g>

                    {/* ── The Ramp ── */}
                    <g>
                        <polygon points={bodyQuad.map(pt => `${pt.x},${pt.y}`).join(' ')}
                            fill="rgba(71,85,105,0.35)" stroke="#475569" strokeWidth="1" />
                        <line x1={baseS.x} y1={baseS.y} x2={topS.x} y2={topS.y} stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round" />
                        {hatches.map((h, i) => (
                            <line key={i} x1={h.a.x} y1={h.a.y} x2={h.b.x} y2={h.b.y} stroke="#94a3b8" strokeWidth="1" opacity="0.6" />
                        ))}
                        {/* Ramp label */}
                        <text x={w2s(L * cos / 2, L * sin / 2 - 0.35).x} y={w2s(L * cos / 2, L * sin / 2 - 0.35).y}
                            textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold" fontFamily="monospace" letterSpacing="0.1em">
                            RAMP · L = {fmt(L, 3)} m
                        </text>
                        {/* θ angle arc + label */}
                        <polyline points={arcPts.join(' ')} fill="none" stroke="#94a3b8" strokeWidth="1.2" />
                        <line x1={baseS.x} y1={baseS.y} x2={w2s(arcR * 1.3, 0).x} y2={w2s(arcR * 1.3, 0).y} stroke="#94a3b8" strokeWidth="1" />
                        <text x={arcEndS.x + 10} y={arcEndS.y - 8} fill="#7dd3fc" fontSize="11" fontWeight="bold" fontFamily="monospace">
                            θ = {fmt(p.thetaDeg, 2)}°
                        </text>
                    </g>

                    {/* ── Critical angle marker θ_c ── */}
                    {showCritical && thetaC > 0.01 && thetaC < Math.PI / 2.2 && (
                        <g>
                            <line x1={baseS.x} y1={baseS.y} x2={critRayS.x} y2={critRayS.y}
                                stroke="#fbbf24" strokeWidth="1.4" strokeDasharray="5 4" opacity="0.85" />
                            <circle cx={critRayS.x} cy={critRayS.y} r="3" fill="#fbbf24" />
                            <text x={critRayS.x + 8} y={critRayS.y - 6} fill="#fbbf24" fontSize="10" fontWeight="bold" fontFamily="monospace">
                                θ_c = {fmt(snapshot.thetaCDeg, 3)}°
                            </text>
                        </g>
                    )}

                    {/* ── Up-ramp direction arrow (coordinate reference) ── */}
                    <g>
                        <line x1={dirStartS.x} y1={dirStartS.y} x2={dirEndS.x} y2={dirEndS.y}
                            stroke="#64748b" strokeWidth="1.4" markerEnd="url(#ramp-v-arrow)" />
                        <text x={dirStartS.x - 8} y={dirStartS.y + 14} fill="#64748b" fontSize="9" fontFamily="monospace">s+</text>
                    </g>

                    {/* ── Motion trail (actual historical positions) ── */}
                    {showTrail && snapshot.trail.length > 1 && (
                        <polyline points={trailPts} fill="none" stroke="#475569" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
                    )}

                    {/* ── Force vectors (all real magnitudes from physics) ── */}
                    {showComponents && showGravity && (
                        <g>
                            {/* parallelogram construction: mg = mg·sinθ ⊥ mg·cosθ */}
                            <line x1={blockS.x} y1={blockS.y} x2={blockS.x + wVec.x} y2={blockS.y + wVec.y}
                                stroke="#f59e0b" strokeWidth="2.2" markerEnd="url(#ramp-w-arrow)" />
                            <text x={blockS.x + wVec.x + 6} y={blockS.y + wVec.y + 4} fill="#f59e0b" fontSize="9" fontWeight="bold" fontFamily="monospace">
                                mg = {fmt(f.weight, 3)} N
                            </text>
                            <line x1={blockS.x} y1={blockS.y} x2={blockS.x + parVec.x} y2={blockS.y + parVec.y}
                                stroke="#38bdf8" strokeWidth="2" markerEnd="url(#ramp-p-arrow)" />
                            <text x={blockS.x + parVec.x + 6} y={blockS.y + parVec.y - 4} fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                                mg·sinθ = {fmt(f.parallel, 3)} N
                            </text>
                            <line x1={blockS.x} y1={blockS.y} x2={blockS.x + perpVec.x} y2={blockS.y + perpVec.y}
                                stroke="#a78bfa" strokeWidth="2" markerEnd="url(#ramp-q-arrow)" />
                            <text x={blockS.x + perpVec.x + 6} y={blockS.y + perpVec.y - 4} fill="#a78bfa" fontSize="9" fontWeight="bold" fontFamily="monospace">
                                mg·cosθ = {fmt(f.perp, 3)} N
                            </text>
                            {/* dashed closing segments of the parallelogram */}
                            <line x1={blockS.x + wVec.x} y1={blockS.y + wVec.y} x2={blockS.x + parVec.x} y2={blockS.y + parVec.y}
                                stroke="#38bdf8" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.5" />
                            <line x1={blockS.x + wVec.x} y1={blockS.y + wVec.y} x2={blockS.x + perpVec.x} y2={blockS.y + perpVec.y}
                                stroke="#a78bfa" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.5" />
                        </g>
                    )}

                    {showNormal && f.normal > 0 && (
                        <g>
                            <line x1={blockS.x} y1={blockS.y} x2={blockS.x + nVec.x} y2={blockS.y + nVec.y}
                                stroke="#34d399" strokeWidth="2.2" markerEnd="url(#ramp-n-arrow)" />
                            <text x={blockS.x + nVec.x + 6} y={blockS.y + nVec.y + 4} fill="#34d399" fontSize="9" fontWeight="bold" fontFamily="monospace">
                                N = {fmt(f.normal, 3)} N
                            </text>
                        </g>
                    )}

                    {showFriction && f.frictionMagnitude > 0.01 && (
                        <g>
                            <line x1={blockS.x} y1={blockS.y} x2={blockS.x + fVec.x} y2={blockS.y + fVec.y}
                                stroke="#fb7185" strokeWidth="2.2" markerEnd="url(#ramp-f-arrow)" />
                            <text x={blockS.x + fVec.x + 6} y={blockS.y + fVec.y + 4} fill="#fb7185" fontSize="9" fontWeight="bold" fontFamily="monospace">
                                {frictionLabel} = {fmt(f.frictionMagnitude, 3)} N
                            </text>
                        </g>
                    )}

                    {showGravity && !showComponents && f.weight > 0 && (
                        <g>
                            <line x1={blockS.x} y1={blockS.y} x2={blockS.x + wVec.x} y2={blockS.y + wVec.y}
                                stroke="#f59e0b" strokeWidth="2.2" markerEnd="url(#ramp-w-arrow)" />
                            <text x={blockS.x + wVec.x + 6} y={blockS.y + wVec.y + 4} fill="#f59e0b" fontSize="9" fontWeight="bold" fontFamily="monospace">
                                mg = {fmt(f.weight, 3)} N
                            </text>
                        </g>
                    )}

                    {showNetForce && Math.abs(f.netForce) > 0.01 && (
                        <g>
                            <line x1={blockS.x} y1={blockS.y} x2={blockS.x + netVec.x} y2={blockS.y + netVec.y}
                                stroke="#f472b6" strokeWidth="2" markerEnd="url(#ramp-net-arrow)" />
                            <text x={blockS.x + netVec.x + 6} y={blockS.y + netVec.y + 4} fill="#f472b6" fontSize="9" fontWeight="bold" fontFamily="monospace">
                                F_net = {fmt(f.netForce, 3)} N
                            </text>
                        </g>
                    )}

                    {showVelocity && Math.abs(snapshot.rampState.v) > 1e-4 && (
                        <g>
                            <line x1={blockS.x} y1={blockS.y} x2={blockS.x + velVec.x} y2={blockS.y + velVec.y}
                                stroke="#22d3ee" strokeWidth="2.2" markerEnd="url(#ramp-v-arrow)" />
                            <text x={blockS.x + velVec.x + 6} y={blockS.y + velVec.y - 4} fill="#22d3ee" fontSize="9" fontWeight="bold" fontFamily="monospace">
                                v = {fmt(snapshot.rampState.v, 3)} m/s
                            </text>
                        </g>
                    )}

                    {/* ── The block (position comes directly from physics) ── */}
                    <g>
                        <circle cx={contactS.x} cy={contactS.y} r="3" fill="#e2e8f0" opacity="0.5" />
                        <rect x={-blockPx / 2} y={-blockPx / 2} width={blockPx} height={blockPx} rx="3"
                            fill="#38bdf8" fillOpacity="0.3" stroke="#7dd3fc" strokeWidth="1.8"
                            transform={`translate(${blockS.x}, ${blockS.y}) rotate(${-p.thetaDeg})`} />
                        <rect x={-blockPx / 2 + 3} y={-blockPx / 2 + 3} width={blockPx * 0.3} height={blockPx * 0.14} rx="1"
                            fill="#bae6fd" opacity="0.6"
                            transform={`translate(${blockS.x}, ${blockS.y}) rotate(${-p.thetaDeg})`} />
                        <text x={blockS.x} y={blockS.y + blockPx / 2 + 16} textAnchor="middle" fill="#7dd3fc" fontSize="10" fontWeight="bold" fontFamily="monospace" letterSpacing="0.06em">
                            BLOCK · m = {fmt(p.mass, 2)} kg
                        </text>
                    </g>

                    {/* ── State / impact overlay ── */}
                    {snapshot.hitEnd && (
                        <text x={viewSize.width / 2} y={viewSize.height / 2 - 20} textAnchor="middle"
                            fill={stateColor} fontSize="13" fontWeight="bold" fontFamily="monospace" letterSpacing="0.1em">
                            REACHED {snapshot.hitEnd === 'top' ? 'TOP' : 'BOTTOM'} END — AT REST
                        </text>
                    )}

                    {/* ── Legend ── */}
                    <g transform={`translate(16, ${viewSize.height - 24})`}>
                        <circle cx="0" cy="-3" r="3" fill="#f59e0b" /><text x="8" y="0" fill="#64748b" fontSize="9" fontFamily="monospace">mg</text>
                        <circle cx="34" cy="-3" r="3" fill="#34d399" /><text x="42" y="0" fill="#64748b" fontSize="9" fontFamily="monospace">N</text>
                        <circle cx="64" cy="-3" r="3" fill="#fb7185" /><text x="72" y="0" fill="#64748b" fontSize="9" fontFamily="monospace">f</text>
                        <circle cx="92" cy="-3" r="3" fill="#38bdf8" /><text x="100" y="0" fill="#64748b" fontSize="9" fontFamily="monospace">mg·sinθ</text>
                        <text x="170" y="0" fill="#475569" fontSize="9" fontFamily="monospace">grid = {fmt(gridStep, 2)} m</text>
                    </g>
                </svg>
            </div>

            {/* ── Collapsible Engineering Information Bars ─────────────────────── */}
            <div className="shrink-0 relative z-20 max-h-[38vh] overflow-y-auto">
                {/* LIVE TELEMETRY */}
                <InfoBar
                    icon={<Activity size={13} />}
                    accent="text-emerald-400"
                    title="Live Telemetry"
                    summary={telemetrySummary}
                    open={openSection === 'telemetry'}
                    onToggle={() => toggleSection('telemetry')}
                    status={
                        <span
                            className="shrink-0 text-[9px] font-mono font-bold px-2 py-0.5 rounded"
                            style={isPlaying
                                ? { backgroundColor: 'rgba(16,185,129,0.2)', color: '#34d399' }
                                : { backgroundColor: `${stateColor}22`, color: stateColor }}
                        >
                            {isPlaying ? 'RUNNING' : 'PAUSED'}
                        </span>
                    }
                >
                    <div className="px-5 py-4 border-t border-white/5 space-y-3">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <Stat label="Sim Time (t)" value={formatSimTime(snapshot.time)} color="text-white" />
                            <Stat label="Position along ramp (s)" value={fmt(snapshot.rampState.s, 4)} unit="m" color="text-sky-400" />
                            <Stat label="Horizontal x" value={fmt(snapshot.position.x, 3)} unit="m" />
                            <Stat label="Vertical y / height h" value={fmt(snapshot.height, 3)} unit="m" color="text-emerald-400" />
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <Stat label="Velocity (along ramp)" value={fmt(snapshot.rampState.v, 4)} unit="m/s" color="text-cyan-400" />
                            <Stat label="Acceleration (along ramp)" value={fmt(snapshot.rampState.a, 4)} unit="m/s²" color="text-fuchsia-400" />
                            <Stat label="Ramp angle θ" value={fmt(p.thetaDeg, 2)} unit="°" color="text-sky-300" />
                            <Stat label="Critical angle θ_c" value={fmt(snapshot.thetaCDeg, 2)} unit="°" color={atCritical ? 'text-pink-400' : 'text-amber-400'} />
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <Stat label="Mass m" value={fmt(p.mass, 3)} unit="kg" />
                            <Stat label="Gravity g" value={fmt(p.g, 3)} unit="m/s²" color="text-amber-400" />
                            <Stat label="μ_s (static)" value={fmt(p.muS, 3)} color="text-slate-300" />
                            <Stat label="μ_k (kinetic)" value={fmt(p.muK, 3)} color="text-slate-300" />
                        </div>
                        <div className="bg-slate-950/60 border border-white/5 rounded-lg px-3 py-2 font-mono text-[10px] flex items-start gap-2">
                            <span style={{ color: stateColor }} className="font-bold whitespace-nowrap">● {state}</span>
                            <span className="text-slate-400">{stateNote}</span>
                        </div>
                    </div>
                </InfoBar>

                {/* FORCES */}
                <InfoBar
                    icon={<Gauge size={13} />}
                    accent="text-purple-400"
                    title="Forces · Free-Body Diagram"
                    summary={forceSummary}
                    open={openSection === 'forces'}
                    onToggle={() => toggleSection('forces')}
                    status={
                        <span className="shrink-0 text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400">
                            {Math.abs(f.friction) < 1e-6 ? 'f_s balances mg·sinθ' : `friction opposes motion`}
                        </span>
                    }
                >
                    <div className="px-5 py-4 border-t border-white/5 space-y-3">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="grid grid-cols-2 gap-2 content-start">
                                <Stat label="Weight mg" value={fmt(f.weight, 3)} unit="N" color="text-amber-400" />
                                <Stat label="Normal N = mg·cosθ" value={fmt(f.normal, 3)} unit="N" color="text-emerald-400" />
                                <Stat label="Parallel mg·sinθ" value={fmt(f.parallel, 3)} unit="N" color="text-sky-400" />
                                <Stat label="Perp. mg·cosθ" value={fmt(f.perp, 3)} unit="N" color="text-violet-400" />
                                <Stat label="f_s,max = μ_s·N" value={fmt(f.fStaticMax, 3)} unit="N" color="text-amber-300" />
                                <Stat label="f_k = μ_k·N" value={fmt(f.kineticFriction, 3)} unit="N" color="text-rose-300" />
                                <Stat label={f.frictionKind === 'static' ? 'Actual friction (static)' : 'Actual friction (kinetic)'}
                                    value={fmt(f.friction, 3)} unit="N" color="text-rose-400" />
                                <Stat label="Net force (along ramp)" value={fmt(f.netForce, 3)} unit="N" color="text-fuchsia-400" />
                            </div>
                            <FreeBodyDiagram forces={f} thetaDeg={p.thetaDeg} state={state} />
                        </div>
                        <div className="bg-slate-950/60 px-3 py-2 rounded-lg font-mono text-[9px] text-slate-400 space-y-1 border border-white/5">
                            <div className="text-slate-300 font-bold text-[10px]">FRICTION MODEL</div>
                            <div>Static: f_s = required value up to f_s,max = μ_s·N = {fmt(f.fStaticMax, 3)} N</div>
                            <div>Critical angle θ_c = arctan(μ_s) = {fmt(snapshot.thetaCDeg, 3)}° — block slips when tanθ &gt; μ_s</div>
                            <div>Kinetic: f_k = μ_k·N = {fmt(f.kineticFriction, 3)} N, always opposing relative motion</div>
                        </div>
                    </div>
                </InfoBar>

                {/* ENERGY */}
                <InfoBar
                    icon={<TrendingUp size={13} />}
                    accent="text-sky-400"
                    title="Energy · Friction Work"
                    summary={energySummary}
                    open={openSection === 'energy'}
                    onToggle={() => toggleSection('energy')}
                >
                    <div className="px-5 py-4 border-t border-white/5 space-y-3">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <Stat label="Kinetic Energy ½mv²" value={fmt(e.kinetic, 4)} unit="J" color="text-emerald-400" />
                            <Stat label="Potential mgh" value={fmt(e.potential, 4)} unit="J" color="text-sky-400" />
                            <Stat label="Total E = KE + PE" value={fmt(e.total, 4)} unit="J" color="text-amber-400" />
                            <Stat label="Energy lost to friction" value={fmt(e.lost, 4)} unit="J" color="text-rose-400" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Stat label="Sliding distance (kinetic)" value={fmt(snapshot.slidingDistance, 3)} unit="m" color="text-slate-300" />
                            <Stat label="W_f = −μ_k·N·d" value={`−${fmt(e.lost, 3)}`} unit="J" color="text-rose-300" />
                        </div>
                        <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5">
                            <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-1">
                                <span>ENERGY vs TIME (real samples)</span>
                                <span>E + lost ≈ const: {fmt(e.total + e.lost, 4)} J</span>
                            </div>
                            <TrendGraph
                                x={snapshot.history.t}
                                unit="J"
                                height={140}
                                series={[
                                    { name: 'KE', data: snapshot.history.ke, color: '#34d399' },
                                    { name: 'PE', data: snapshot.history.pe, color: '#38bdf8' },
                                    { name: 'E_total', data: snapshot.history.e, color: '#fbbf24' },
                                    { name: 'lost', data: snapshot.history.lost, color: '#fb7185' },
                                ]}
                            />
                            <div className="text-[9px] font-mono text-slate-500 mt-1">
                                With kinetic friction, total mechanical energy decreases — the dissipated amount (rose) is W_f = μ_k·N·d.
                            </div>
                        </div>
                    </div>
                </InfoBar>

                {/* GRAPHS */}
                <InfoBar
                    icon={<BarChart3 size={13} />}
                    accent="text-fuchsia-400"
                    title="Scientific Graphs"
                    summary="position · velocity · acceleration · energy · friction · net force · phase"
                    open={openSection === 'graphs'}
                    onToggle={() => toggleSection('graphs')}
                >
                    <div className="px-5 py-4 border-t border-white/5 space-y-2">
                        <div className="flex flex-wrap gap-1">
                            {[['position', 's(t)'], ['velocity', 'v(t)'], ['acceleration', 'a(t)'], ['energy', 'E(t)'], ['friction', 'f(t)'], ['netforce', 'F_net(t)'], ['phase', 's–v']].map(([id, label]) => (
                                <button
                                    key={id}
                                    onClick={() => setGraphTab(id)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${graphTab === id ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40' : 'text-slate-500 border border-white/10 hover:text-white'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5">
                            {graphTab === 'position' && <TrendGraph x={snapshot.history.t} unit="m" series={[{ name: 's', data: snapshot.history.s, color: '#38bdf8' }]} />}
                            {graphTab === 'velocity' && <TrendGraph x={snapshot.history.t} unit="m/s" series={[{ name: 'v', data: snapshot.history.v, color: '#22d3ee' }]} />}
                            {graphTab === 'acceleration' && <TrendGraph x={snapshot.history.t} unit="m/s²" series={[{ name: 'a', data: snapshot.history.a, color: '#e879f9' }]} />}
                            {graphTab === 'energy' && <TrendGraph x={snapshot.history.t} unit="J" series={[
                                { name: 'KE', data: snapshot.history.ke, color: '#34d399' },
                                { name: 'PE', data: snapshot.history.pe, color: '#38bdf8' },
                                { name: 'E', data: snapshot.history.e, color: '#fbbf24' },
                                { name: 'lost', data: snapshot.history.lost, color: '#fb7185' },
                            ]} />}
                            {graphTab === 'friction' && <TrendGraph x={snapshot.history.t} unit="N" series={[{ name: 'f (along ramp)', data: snapshot.history.friction, color: '#fb7185' }]} />}
                            {graphTab === 'netforce' && <TrendGraph x={snapshot.history.t} unit="N" series={[{ name: 'F_net', data: snapshot.history.netForce, color: '#f472b6' }]} />}
                            {graphTab === 'phase' && (
                                <TrendGraph x={snapshot.history.s} unit="s = pos (m)" series={[{ name: 'v', data: snapshot.history.v, color: '#34d399' }]} />
                            )}
                            <div className="text-[9px] font-mono text-slate-500 mt-1">
                                All curves are sampled directly from the RK4 integration (rolling {snapshot.history.t.length} points).
                            </div>
                        </div>
                    </div>
                </InfoBar>

                {/* SETUP */}
                <InfoBar
                    icon={<Sliders size={13} />}
                    accent="text-slate-300"
                    title="Setup (Parameters — SI units)"
                    summary={setupSummary}
                    open={openSection === 'setup'}
                    onToggle={() => toggleSection('setup')}
                    status={
                        <button
                            onClick={(e) => { e.stopPropagation(); applyPreset('above_critical'); }}
                            className="shrink-0 text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 hover:bg-sky-500/40 cursor-pointer transition-colors"
                            title="Set θ above critical so the block slides"
                        >
                            θ &gt; θ_c
                        </button>
                    }
                >
                    <div className="px-5 py-4 border-t border-white/5 max-h-[46vh] overflow-y-auto space-y-4">
                        {/* Gravity presets */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Gravity</span>
                            {GRAVITY_PRESETS.map(gp => (
                                <button
                                    key={gp.id}
                                    onClick={() => applyGravity(gp.id)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${Math.abs(g - gp.g) < 1e-9 ? 'text-white border' : 'text-slate-500 border border-transparent hover:text-white'}`}
                                    style={Math.abs(g - gp.g) < 1e-9 ? { color: gp.accent, borderColor: `${gp.accent}55`, backgroundColor: `${gp.accent}1a` } : {}}
                                >
                                    {gp.name} · {fmt(gp.g, 2)}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-4">
                            <SliderField label="Mass m (kg)" value={mass} min={0.1} max={10} step={0.1} onChange={setMass} fmt={fmt(mass, 3)} />
                            <SliderField label="Gravity g (m/s²)" value={g} min={0} max={25} step={0.05} onChange={setG} fmt={fmt(g, 3)} />
                            <SliderField label="Ramp angle θ (deg)" value={thetaDeg} min={0} max={75} step={1} onChange={(v) => { setThetaDeg(v); setNeedsFit(true); }} fmt={`${thetaDeg.toFixed(0)}°`} />
                            <SliderField label="Ramp length L (m)" value={rampLength} min={1} max={12} step={0.1} onChange={(v) => { setRampLength(v); setS0(cur => Math.min(cur, v)); }} fmt={fmt(rampLength, 2)} />
                            <SliderField label="Static friction μ_s" value={muS} min={0} max={1} step={0.01} onChange={(v) => { setMuS(v); if (muK > v) setMuK(v); }} fmt={fmt(muS, 2)} />
                            <SliderField label="Kinetic friction μ_k" value={muK} min={0} max={1} step={0.01} onChange={(v) => setMuK(Math.min(v, muS))} fmt={fmt(muK, 2)} />
                            <SliderField label="Initial position s₀ (m)" value={s0} min={0} max={rampLength} step={0.1} onChange={setS0} fmt={fmt(s0, 2)} />
                            <SliderField label="Initial velocity v₀ (m/s, + = up)" value={v0} min={-6} max={6} step={0.05} onChange={setV0} fmt={fmt(v0, 2)} />
                            <SliderField label="Physics Δt (s)" value={dt} min={0.001} max={0.05} step={0.0005} onChange={setDt} fmt={`${(dt * 1000).toFixed(1)} ms`} />
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-mono">
                                    <span className="text-slate-400">θ_c = arctan(μ_s)</span>
                                    <span className="text-amber-400 font-bold">{fmt(snapshot.thetaCDeg, 3)}°</span>
                                </div>
                                <div className="text-[9px] font-mono text-slate-500">
                                    tanθ = {fmt(Math.tan(thetaDeg * DEG), 3)} · μ_s = {fmt(muS, 3)} → {snapshot.rampState.v === 0 && p.muS > 0 ? (Math.tan(thetaDeg * DEG) <= p.muS ? 'static holds' : 'block slips') : '—'}
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-950/60 px-3 py-2 rounded-lg font-mono text-[9px] text-slate-400 space-y-0.5 border border-white/5">
                            <div className="text-slate-300 font-bold">REFERENCE EQUATIONS</div>
                            <div>N = mg·cosθ &nbsp;·&nbsp; F_par = mg·sinθ &nbsp;·&nbsp; θ_c = arctan(μ_s)</div>
                            <div>sliding down: a = g(sinθ − μ_k·cosθ) &nbsp;·&nbsp; sliding up: a = −g(sinθ + μ_k·cosθ)</div>
                        </div>
                    </div>
                </InfoBar>
            </div>

            {/* ── Bottom Playback & Timeline Bar ───────────────────────────────── */}
            <div className="h-16 bg-slate-950/95 border-t border-white/10 backdrop-blur-3xl px-6 flex items-center justify-between z-30 shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={handleReset} className="p-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer bg-white/5 hover:bg-white/10 rounded-xl" title="Reset Simulation (restore exact initial state)">
                        <RefreshCw size={15} />
                    </button>
                    <button
                        onClick={togglePlayback}
                        className={`h-10 px-6 rounded-xl flex items-center justify-center font-bold tracking-wider uppercase text-xs transition-all cursor-pointer shadow-lg ${isPlaying ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20' : 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/30'}`}
                    >
                        {isPlaying ? <><Square size={13} fill="currentColor" className="mr-2" /> PAUSE</> : <><Play size={15} fill="currentColor" className="mr-2" /> RUN SIM</>}
                    </button>
                    <button onClick={handleStepForward} disabled={isPlaying} className="p-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer bg-white/5 hover:bg-white/10 rounded-xl disabled:opacity-30" title="Step Forward (one physics step)">
                        <SkipForward size={15} />
                    </button>
                </div>

                {/* Simulation Speed */}
                <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-white/10">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Speed</span>
                    {[0.1, 0.25, 0.5, 1, 2, 5, 10].map(sp => (
                        <button
                            key={sp}
                            onClick={() => setTimeScale(sp)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${timeScale === sp ? 'bg-sky-500 text-white' : 'text-slate-500 hover:text-white'}`}
                        >
                            {sp}x
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4 min-w-80">
                    <div className="flex-1 space-y-1">
                        <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-slate-400 font-bold">BLOCK ON RAMP</span>
                            <span style={{ color: stateColor }}>{state}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/10">
                            <div className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-75" style={{ width: `${clamp((snapshot.rampState.s / L) * 100, 0, 100)}%` }} />
                        </div>
                    </div>
                    <div className="text-right font-mono">
                        <div className="text-xs font-bold text-white">t = {formatSimTime(snapshot.time)}</div>
                        <div className="text-[9px]" style={{ color: stateColor }}>θ {fmt(p.thetaDeg, 1)}° · θ_c {fmt(snapshot.thetaCDeg, 1)}°</div>
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