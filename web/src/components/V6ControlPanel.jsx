

import React, { useRef, useEffect, useState, useCallback } from 'react';
import useStore from '../store/useStore';

const STROKE_COLORS = {
    INTAKE:      '#60a5fa', 
    COMPRESSION: '#facc15', 
    POWER:       '#ef4444', 
    EXHAUST:     '#6b7280', 
};
const STROKE_NAMES = ['INTAKE', 'COMPRESSION', 'POWER', 'EXHAUST'];


function Sparkline({ data, width = 220, height = 44, color = '#22c55e', label }) {
    if (!data || data.length < 2) return (
        <div className="w-full bg-slate-900 rounded" style={{ width, height }}>
            <div className="text-slate-600 text-[9px] flex items-center justify-center h-full">{label}</div>
        </div>
    );

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * (height - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    return (
        <div>
            {label && <div className="text-[9px] text-slate-500 mb-0.5 pl-1">{label}</div>}
            <svg width={width} height={height} className="rounded overflow-hidden bg-slate-900">
                <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                {}
                {data.length > 0 && (() => {
                    const last = data[data.length - 1];
                    const y = height - ((last - min) / range) * (height - 6) - 3;
                    return <circle cx={width} cy={y} r="2.5" fill={color} />;
                })()}
            </svg>
        </div>
    );
}


function RPMGauge({ rpm }) {
    const MAX = 8000;
    const pct = Math.min(rpm / MAX, 1);
    const isRedline = rpm > 6500;
    const arcLen = pct * 220; 

    return (
        <div className="relative flex flex-col items-center">
            <svg width="90" height="55" viewBox="0 0 90 60">
                {}
                <path d="M 10 50 A 35 35 0 0 1 80 50" stroke="#1e293b" strokeWidth="7" fill="none" strokeLinecap="round" />
                {}
                <path d="M 10 50 A 35 35 0 0 1 80 50"
                    stroke={isRedline ? '#ef4444' : '#22c55e'}
                    strokeWidth="7" fill="none" strokeLinecap="round"
                    strokeDasharray={`${arcLen} 220`}
                    style={{ transition: 'stroke-dasharray 0.1s ease' }}
                />
                {}
                <circle
                    cx={45 + 32 * Math.cos(Math.PI - pct * Math.PI)}
                    cy={50 - 32 * Math.sin(pct * Math.PI)}
                    r="3" fill="white"
                />
            </svg>
            <div className={`text-lg font-bold font-mono -mt-2 ${isRedline ? 'text-red-400' : 'text-emerald-400'}`}>
                {Math.round(rpm).toLocaleString()}
            </div>
            <div className="text-[9px] text-slate-500">RPM</div>
        </div>
    );
}


function CylinderMatrix({ cylinders }) {
    return (
        <div className="grid grid-cols-3 gap-1.5">
            {cylinders?.map((cyl, i) => {
                const glow = cyl.combustionGlow ?? 0;
                const color = STROKE_COLORS[STROKE_NAMES[cyl.stroke]] ?? '#374151';
                return (
                    <div
                        key={i}
                        className="rounded flex flex-col items-center gap-0.5 py-1 px-1 border transition-all duration-75"
                        style={{
                            borderColor: glow > 0.1 ? '#ef4444' : '#1e293b',
                            backgroundColor: `rgba(${glow > 0.05 ? '239,68,68' : '15,23,42'},${Math.max(0.08, glow * 0.5)})`,
                            boxShadow: glow > 0.2 ? `0 0 ${(glow * 12).toFixed(0)}px rgba(239,68,68,0.6)` : 'none',
                        }}
                    >
                        <div
                            className="w-2.5 h-2.5 rounded-full transition-all duration-75"
                            style={{ backgroundColor: glow > 0.05 ? '#ef4444' : '#1e293b', opacity: 0.3 + glow * 0.7 }}
                        />
                        <div className="text-[7px] font-mono text-slate-500">C{i + 1}</div>
                        <div className="text-[6px] font-bold" style={{ color }}>
                            {(STROKE_NAMES[cyl.stroke] || '').slice(0, 3)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}


export default function V6ControlPanel({ solver, engineState, isVisible, onClose }) {
    const updateModelControl = useStore(s => s.updateModelControl);

    const [targetRPM, setTargetRPM] = useState(800);
    const [loadTorque, setLoadTorque] = useState(0);
    const [crankRadius, setCrankRadius] = useState(45);
    const [rodLength, setRodLength] = useState(130);
    const [vAngle, setVAngle] = useState(60);
    const [showDebug, setShowDebug] = useState(false);
    const [showWireframe, setShowWireframe] = useState(false);
    const [gravityEnabled, setGravityEnabled] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    
    const pistonHistory = engineState?.history?.map(h => h.piston0) ?? [];
    const rpmHistory    = engineState?.history?.map(h => h.rpm)     ?? [];
    const torqueHistory = engineState?.history?.map(h => h.torque / 1000).map(v => Math.abs(v)) ?? [];

    const handleRPMChange = useCallback((val) => {
        const rpm = Number(val);
        setTargetRPM(rpm);
        if (solver) solver.setTargetRPM(rpm);
        updateModelControl('v6_rpm', rpm);
    }, [solver]);

    const handleVAngle = useCallback((deg) => {
        setVAngle(deg);
        if (solver) solver.updateConfig({ vAngleDeg: deg });
    }, [solver]);

    const handleCrankRadius = useCallback((val) => {
        setCrankRadius(Number(val));
        if (solver) solver.updateConfig({ crankRadius: Number(val) });
    }, [solver]);

    const handleRodLength = useCallback((val) => {
        setRodLength(Number(val));
        if (solver) solver.updateConfig({ rodLength: Number(val) });
    }, [solver]);

    const handleGravity = useCallback((enabled) => {
        setGravityEnabled(enabled);
        if (solver) solver.updateConfig({ gravityEnabled: enabled });
    }, [solver]);

    if (!isVisible) return null;

    return (
        <div
            className="absolute bottom-4 left-4 z-50 rounded-xl border border-emerald-500/20 bg-slate-950/95 backdrop-blur-sm shadow-2xl shadow-black/60 select-none"
            style={{ width: 280, fontFamily: "'Inter', sans-serif" }}
        >
            {}
            <div
                className="flex items-center justify-between px-3 py-2 border-b border-slate-800 cursor-pointer"
                onClick={() => setCollapsed(c => !c)}
            >
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">V6 Engine</span>
                    <span className="text-[9px] text-slate-500">60° · 3.5L</span>
                </div>
                <div className="flex items-center gap-2">
                    {engineState && (
                        <span className={`text-[10px] font-mono font-bold ${engineState.RPM > 6500 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {Math.round(engineState.RPM)} RPM
                        </span>
                    )}
                    <button className="text-slate-500 hover:text-slate-300 text-xs">{collapsed ? '▼' : '▲'}</button>
                    <button onClick={(e) => { e.stopPropagation(); onClose?.(); }} className="text-slate-600 hover:text-red-400 text-xs">✕</button>
                </div>
            </div>

            {!collapsed && (
                <div className="p-3 space-y-3">

                    {}
                    <div className="flex items-start gap-3">
                        <RPMGauge rpm={engineState?.RPM ?? 0} />
                        <div className="flex-1">
                            <div className="text-[9px] text-slate-500 mb-1 uppercase tracking-wider">Cylinders</div>
                            <CylinderMatrix cylinders={engineState?.cylinders} />
                        </div>
                    </div>

                    {}
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                        {[
                            { label: 'Torque', val: `${Math.abs(engineState?.totalTorque ?? 0).toFixed(0)} N·m` },
                            { label: 'Power',  val: `${(engineState?.powerOutput ?? 0).toFixed(1)} kW` },
                            { label: 'Angle',  val: `${(engineState?.crankAngleDeg ?? 0).toFixed(0)}°` },
                        ].map(({ label, val }) => (
                            <div key={label} className="bg-slate-900 rounded px-1.5 py-1.5">
                                <div className="text-[8px] text-slate-500">{label}</div>
                                <div className="text-[10px] font-mono text-slate-200">{val}</div>
                            </div>
                        ))}
                    </div>

                    {}
                    <div className="border-t border-slate-800" />

                    {}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] text-slate-400">Engine Speed</label>
                            <div className="flex items-center gap-1">
                                <input
                                    type="number" min={0} max={8000} step={50}
                                    value={targetRPM}
                                    onChange={e => handleRPMChange(e.target.value)}
                                    className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-mono text-emerald-400 text-right"
                                />
                                <span className="text-[9px] text-slate-500">RPM</span>
                            </div>
                        </div>
                        <input
                            type="range" min={0} max={8000} step={50}
                            value={targetRPM}
                            onChange={e => handleRPMChange(e.target.value)}
                            className="w-full h-1.5 appearance-none bg-slate-800 rounded-full cursor-pointer accent-emerald-500"
                        />
                        {}
                        <div className="flex justify-between text-[8px] text-slate-600">
                            <span>IDLE</span>
                            <span className="text-yellow-600">6500 REDLINE</span>
                            <span className="text-red-600">8000</span>
                        </div>
                    </div>

                    {}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] text-slate-400">Load Torque</label>
                            <span className="text-[10px] font-mono text-slate-300">{loadTorque} N·m</span>
                        </div>
                        <input
                            type="range" min={0} max={500} step={10}
                            value={loadTorque}
                            onChange={e => { setLoadTorque(Number(e.target.value)); solver?.updateConfig({ frictionTorque: 20 + Number(e.target.value) }); }}
                            className="w-full h-1.5 appearance-none bg-slate-800 rounded-full cursor-pointer accent-blue-500"
                        />
                    </div>

                    {}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-[9px] text-slate-500">Crank Radius (mm)</label>
                            <input
                                type="number" min={20} max={80} step={5}
                                value={crankRadius}
                                onChange={e => handleCrankRadius(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] font-mono"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] text-slate-500">Rod Length (mm)</label>
                            <input
                                type="number" min={80} max={200} step={5}
                                value={rodLength}
                                onChange={e => handleRodLength(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] font-mono"
                            />
                        </div>
                    </div>

                    {}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">V-Angle:</span>
                        {[60, 90].map(deg => (
                            <button
                                key={deg}
                                onClick={() => handleVAngle(deg)}
                                className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${vAngle === deg ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                            >
                                {deg}°
                            </button>
                        ))}
                    </div>

                    {}
                    <div className="grid grid-cols-3 gap-1.5">
                        {[
                            { label: 'Debug', val: showDebug, set: setShowDebug },
                            { label: 'Wireframe', val: showWireframe, set: setShowWireframe },
                            { label: 'Gravity', val: gravityEnabled, set: handleGravity },
                        ].map(({ label, val, set }) => (
                            <button
                                key={label}
                                onClick={() => set(!val)}
                                className={`px-2 py-1.5 rounded text-[9px] font-bold transition-colors border ${val ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {}
                    <div className="space-y-2 border-t border-slate-800 pt-2">
                        <Sparkline data={pistonHistory} width={254} height={36} color="#22c55e" label="Piston 1 Position" />
                        <Sparkline data={rpmHistory}    width={254} height={32} color="#60a5fa" label="RPM History" />
                    </div>

                </div>
            )}
        </div>
    );
}