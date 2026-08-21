import { useState, useEffect } from 'react'
import { Settings, Maximize, Palette, Trash2, SlidersHorizontal, Activity, Link, Plus, Layers, ChevronDown, Activity as ActivityIcon, SlidersHorizontal as SlidersIcon, Wrench, BookOpen, Compass, Gauge, ArrowDown, Sparkles, TrendingUp } from 'lucide-react'
import useStore from '../store/useStore'
import { isClosedProfile } from '../utils/ProfileValidator'
import { PLANETARY_GRAVITY } from '../utils/solvers/freeFallSolver'

const MATERIALS = {
    custom: { name: 'Custom' },
    aluminum: { name: 'Aluminum', color: '#d1d5db', roughness: 0.3, metalness: 0.8, friction: 0.1, restitution: 0.2 },
    steel: { name: 'Steel', color: '#9ca3af', roughness: 0.4, metalness: 0.9, friction: 0.3, restitution: 0.3 },
    cast_iron: { name: 'Cast Iron', color: '#4b5563', roughness: 0.6, metalness: 0.6, friction: 0.2, restitution: 0.1 },
    structural_steel: { name: 'Structural Steel', color: '#eab308', roughness: 0.7, metalness: 0.8, friction: 0.4, restitution: 0.1 },
    plastic: { name: 'Generic Plastic', color: '#3b82f6', roughness: 0.8, metalness: 0.1, friction: 0.5, restitution: 0.6 },
    rubber: { name: 'Rubber', color: '#1f2937', roughness: 0.9, metalness: 0.0, friction: 0.9, restitution: 0.8 },
    titanium: { name: 'Titanium', color: '#e5e7eb', roughness: 0.2, metalness: 0.8, friction: 0.3, restitution: 0.4 }
}

// Compact stat tile used inside expanded sections
function Stat({ label, value, unit, color = 'text-white' }) {
    return (
        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">{label}</span>
            <div className={`text-base font-bold font-mono ${color}`}>
                {value} <span className="text-xs font-normal text-slate-500">{unit}</span>
            </div>
        </div>
    )
}

// PropertySection component for accordion sections (matching LayerPanel visual style)
function PropertySection({ title, icon, accent, summary, children, sectionKey, openSections, toggleSection }) {
    const isOpen = openSections[sectionKey] || false
    return (
        <div className="border-t border-slate-700/50 transition-colors duration-200 bg-slate-800/30">
            <button
                onClick={() => toggleSection(sectionKey)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors duration-200 group hover:bg-slate-800/50"
                aria-expanded={isOpen}
            >
                <span className={`shrink-0 transition-colors ${isOpen ? accent : 'text-slate-500 group-hover:text-slate-300'}`}>
                    {icon}
                </span>
                <span className={`text-[10px] font-bold tracking-widest uppercase shrink-0 transition-colors ${isOpen ? 'text-slate-200' : 'text-slate-400 group-hover:text-slate-200'}`}>
                    {title}
                </span>
                <span className="flex-1 min-w-0 text-xs font-mono text-slate-400 truncate">{summary}</span>
                <ChevronDown
                    size={12}
                    className={`shrink-0 transition-transform duration-200 ${openSections[sectionKey] ? 'rotate-180 text-slate-300' : 'text-slate-500 group-hover:text-slate-300'}`}
                />
            </button>
            <div
                className="grid"
                style={{ gridTemplateRows: openSections[sectionKey] ? '1fr' : '0fr', transition: 'grid-template-rows 0.2s ease-out' }}
            >
                <div className="overflow-hidden min-h-0 px-4 pb-3">
                    {children}
                </div>
            </div>
        </div>
    )
}

// Lab Properties component - renders lab data in Properties panel
function LabProperties({ labData, openSections, toggleSection, handleLabConfigChange }) {
    if (!labData) return null
    
    return (
        <div className="space-y-4">
            <div className="px-1 py-1 text-[10px] uppercase font-bold text-slate-500 mb-2">
                {labData.title}
            </div>
            
            {/* LIVE TELEMETRY */}
            {labData.snapshot && (
                <PropertySection
                    sectionKey="telemetry"
                    openSections={openSections}
                    toggleSection={toggleSection}
                    title="LIVE TELEMETRY"
                    icon={<Activity size={13} />}
                    accent="text-emerald-400"
                    summary={labData.type === 'free_fall' 
                        ? `t ${labData.snapshot.time.toFixed(2)}s · y ${labData.snapshot.height.toFixed(1)}m · v ${labData.snapshot.velocity.toFixed(1)}m/s`
                        : labData.type === 'single_pendulum'
                        ? `t ${labData.snapshot.time.toFixed(2)}s · θ ${labData.snapshot.angle.toFixed(1)}° · ω ${labData.snapshot.omega.toFixed(1)} rad/s`
                        : labData.type === 'double_pendulum'
                        ? `t ${labData.snapshot.time.toFixed(2)}s · θ₁ ${labData.snapshot.angle1.toFixed(1)}° · θ₂ ${labData.snapshot.angle2.toFixed(1)}°`
                        : labData.type === 'spring_oscillator'
                        ? `t ${labData.snapshot.time.toFixed(2)}s · x ${labData.snapshot.x.toFixed(2)}m · v ${labData.snapshot.v.toFixed(2)}m/s · ω₀ ${labData.snapshot.omega0.toFixed(1)} rad/s`
                        : labData.type === 'orbital_mechanics'
                        ? `t ${labData.snapshot.time.toFixed(2)}s · r ${labData.snapshot.position.r.toFixed(1)}km · v ${labData.snapshot.velocity.v.toFixed(2)}km/s · ${labData.snapshot.orbit.type.toLowerCase()}`
                        : labData.type === 'inclined_friction_ramp'
                        ? `t ${labData.snapshot.time.toFixed(2)}s · s ${labData.snapshot.rampState?.s.toFixed(2) ?? 0}m · v ${labData.snapshot.rampState?.v.toFixed(2) ?? 0}m/s · ${labData.snapshot.state}`
                        : `t ${(labData.snapshot.time ?? 0).toFixed(2)}s · x ${(labData.snapshot.x ?? 0).toFixed(1)}m · y ${(labData.snapshot.y ?? 0).toFixed(1)}m · v ${(labData.snapshot.speed ?? 0).toFixed(1)}m/s`
                    }
                >
                    <div className="space-y-3">
                        {labData.type === 'free_fall' && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <Stat label="Altitude (y)" value={labData.snapshot.height.toFixed(2)} unit="m" color="text-sky-400" />
                                <Stat label="Time (t)" value={labData.snapshot.time.toFixed(2)} unit="s" />
                                <Stat label="Velocity (v)" value={labData.snapshot.velocity.toFixed(2)} unit="m/s" color={labData.snapshot.velocity < 0 ? 'text-cyan-400' : 'text-emerald-400'} />
                                <Stat label="Acceleration (g)" value={labData.snapshot.config.gravity.toFixed(2)} unit="m/s²" color="text-amber-400" />
                            </div>
                        )}
                        {labData.type === 'single_pendulum' && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <Stat label="Angle (θ)" value={labData.snapshot.angle.toFixed(2)} unit="°" color="text-sky-400" />
                                <Stat label="Angular Vel. (ω)" value={labData.snapshot.omega.toFixed(2)} unit="rad/s" />
                                <Stat label="Tangential Speed" value={labData.snapshot.speed.toFixed(2)} unit="m/s" color="text-emerald-400" />
                                <Stat label="Rod Tension" value={labData.snapshot.tension.toFixed(2)} unit="N" color="text-amber-400" />
                            </div>
                        )}
                        {labData.type === 'projectile_motion' && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <Stat label="Time (t)" value={labData.snapshot.time.toFixed(2)} unit="s" />
                                <Stat label="Position X" value={labData.snapshot.x.toFixed(2)} unit="m" />
                                <Stat label="Position Y" value={labData.snapshot.y.toFixed(2)} unit="m" />
                                <Stat label="Speed" value={labData.snapshot.speed.toFixed(2)} unit="m/s" />
                            </div>
                        )}
                        {labData.type === 'double_pendulum' && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <Stat label="θ₁ / ω₁" value={`${labData.snapshot.angle1.toFixed(1)}° / ${labData.snapshot.omega1.toFixed(2)}`} unit="rad/s" color="text-indigo-400" />
                                <Stat label="θ₂ / ω₂" value={`${labData.snapshot.angle2.toFixed(1)}° / ${labData.snapshot.omega2.toFixed(2)}`} unit="rad/s" color="text-fuchsia-400" />
                                <Stat label="α₁" value={labData.snapshot.alpha1.toFixed(2)} unit="rad/s²" color="text-cyan-400" />
                                <Stat label="α₂" value={labData.snapshot.alpha2.toFixed(2)} unit="rad/s²" color="text-cyan-400" />
                            </div>
                        )}
                        {labData.type === 'inclined_friction_ramp' && labData.snapshot.rampState && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <Stat label="Ramp Pos (s)" value={labData.snapshot.rampState.s.toFixed(2)} unit="m" color="text-sky-400" />
                                <Stat label="Time (t)" value={labData.snapshot.time.toFixed(2)} unit="s" />
                                <Stat label="Velocity (v)" value={labData.snapshot.rampState.v.toFixed(2)} unit="m/s" color="text-cyan-400" />
                                <Stat label="Critical θ_c" value={labData.snapshot.thetaCDeg ? labData.snapshot.thetaCDeg.toFixed(1) : '—'} unit="°" color="text-amber-400" />
                            </div>
                        )}
                        
                        {labData.snapshot.energy && (
                            <div className="bg-slate-950/60 px-3 py-2 rounded-lg flex justify-between items-center text-xs font-mono border border-white/5">
                                <span className="text-slate-400 text-[10px]">TOTAL ENERGY:</span>
                                <span className="text-amber-400 font-bold">{Math.round(labData.snapshot.energy.total).toLocaleString()} J</span>
                            </div>
                        )}
                    </div>
                </PropertySection>
            )}
            
            {/* LAUNCH PARAMETERS / INITIAL CONDITIONS */}
            {labData.config && (
                <PropertySection
                    sectionKey="params"
                    openSections={openSections}
                    toggleSection={toggleSection}
                    title={labData.type === 'projectile_motion' ? 'LAUNCH PARAMETERS' : labData.type === 'orbital_mechanics' ? 'ORBIT SETUP' : labData.type === 'inclined_friction_ramp' ? 'RAMP PARAMETERS' : 'INITIAL CONDITIONS'}
                    icon={<SlidersHorizontal size={13} />}
                    accent="text-amber-400"
                    summary={labData.type === 'free_fall' 
                        ? `h₀ ${labData.config.initialHeight}m · e ${labData.config.restitution?.toFixed(2)} · m ${labData.config.mass}kg · g ${PLANETARY_GRAVITY[labData.config.selectedPlanet]?.g ?? 9.81}m/s²`
                        : labData.type === 'single_pendulum'
                        ? `L ${labData.config.length}m · θ₀ ${labData.config.angle0}° · m ${labData.config.mass}kg · g ${labData.config.gravity}m/s²`
                        : labData.type === 'double_pendulum'
                        ? `m₁ ${labData.config.mass1}kg · m₂ ${labData.config.mass2}kg · θ₁ ${labData.config.theta1}° · θ₂ ${labData.config.theta2}°`
                        : labData.type === 'spring_oscillator'
                        ? `m ${labData.config.mass}kg · k ${labData.config.springConstant}N/m · x₀ ${labData.config.x0}m · g ${labData.config.gravity}m/s²`
                        : labData.type === 'orbital_mechanics'
                        ? `r₀ ${labData.config.r0}km · v₀ ${labData.config.v0}km/s · θ₀ ${labData.config.theta0}° · μ ${labData.config.mu}`
                        : labData.type === 'inclined_friction_ramp'
                        ? `m ${labData.config.mass}kg · θ ${labData.config.thetaDeg}° · μ_s ${labData.config.muS} · μ_k ${labData.config.muK}`
                        : `v₀ ${labData.config.v0}m/s · θ ${labData.config.angle}° · y₀ ${labData.config.y0}m · g ${labData.config.gravity}m/s²`
                    }
                >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-5">
                        {labData.type === 'free_fall' && (
                            <>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">DROP HEIGHT (h₀)</span>
                                        <span className="text-sky-400 font-bold">{labData.config.initialHeight} m</span>
                                    </div>
                                    <input type="range" min="10" max="250" step="5" value={labData.config.initialHeight}
                                        onChange={(e) => handleLabConfigChange('initialHeight', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">SURFACE BOUNCE (e)</span>
                                        <span className="text-amber-400 font-bold">{labData.config.restitution.toFixed(2)}</span>
                                    </div>
                                    <input type="range" min="0.0" max="0.85" step="0.05" value={labData.config.restitution}
                                        onChange={(e) => handleLabConfigChange('restitution', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                                    <div className="flex justify-between text-[8px] font-mono text-slate-500">
                                        <span>0.0 (Steel Plop)</span>
                                        <span>0.45 (Concrete)</span>
                                        <span>0.85 (Superball)</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">SPHERE MASS (m)</span>
                                        <span className="text-white font-bold">{labData.config.mass} kg</span>
                                    </div>
                                    <input type="range" min="1" max="50" step="1" value={labData.config.mass}
                                        onChange={(e) => handleLabConfigChange('mass', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">PLANET</span>
                                        <span className="text-sky-400 font-bold">{PLANETARY_GRAVITY[labData.config.selectedPlanet]?.name ?? labData.config.selectedPlanet}</span>
                                    </div>
                                    <select
                                        value={labData.config.selectedPlanet}
                                        onChange={(e) => handleLabConfigChange('selectedPlanet', e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300 cursor-pointer"
                                    >
                                        {Object.entries(PLANETARY_GRAVITY).map(([key, data]) => (
                                            <option key={key} value={key}>{data.name} (g = {data.g} m/s²)</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}
                        {labData.type === 'single_pendulum' && (
                            <>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">LENGTH (L)</span>
                                        <span className="text-sky-400 font-bold">{labData.config.length} m</span>
                                    </div>
                                    <input type="range" min="0.5" max="5" step="0.1" value={labData.config.length}
                                        onChange={(e) => handleLabConfigChange('length', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">INITIAL ANGLE (θ₀)</span>
                                        <span className="text-amber-400 font-bold">{labData.config.angle0}°</span>
                                    </div>
                                    <input type="range" min="10" max="170" step="5" value={labData.config.angle0}
                                        onChange={(e) => handleLabConfigChange('angle0', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">MASS (m)</span>
                                        <span className="text-white font-bold">{labData.config.mass} kg</span>
                                    </div>
                                    <input type="range" min="0.1" max="20" step="0.1" value={labData.config.mass}
                                        onChange={(e) => handleLabConfigChange('mass', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">GRAVITY (g)</span>
                                        <span className="text-emerald-400 font-bold">{labData.config.gravity} m/s²</span>
                                    </div>
                                    <input type="range" min="1" max="30" step="0.1" value={labData.config.gravity}
                                        onChange={(e) => handleLabConfigChange('gravity', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">DAMPING</span>
                                        <span className="text-rose-400 font-bold">{labData.config.damping}</span>
                                    </div>
                                    <input type="range" min="0" max="0.5" step="0.01" value={labData.config.damping}
                                        onChange={(e) => handleLabConfigChange('damping', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">TIME SCALE</span>
                                        <span className="text-purple-400 font-bold">{labData.config.timeScale}x</span>
                                    </div>
                                    <input type="range" min="0.1" max="5" step="0.1" value={labData.config.timeScale}
                                        onChange={(e) => handleLabConfigChange('timeScale', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                                </div>
                            </>
                        )}
                        {labData.type === 'double_pendulum' && (
                            <>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">MASS 1 (m₁)</span>
                                        <span className="text-indigo-400 font-bold">{labData.config.mass1} kg</span>
                                    </div>
                                    <input type="range" min="0.1" max="10" step="0.1" value={labData.config.mass1}
                                        onChange={(e) => handleLabConfigChange('mass1', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">MASS 2 (m₂)</span>
                                        <span className="text-fuchsia-400 font-bold">{labData.config.mass2} kg</span>
                                    </div>
                                    <input type="range" min="0.1" max="10" step="0.1" value={labData.config.mass2}
                                        onChange={(e) => handleLabConfigChange('mass2', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">LENGTH 1 (L₁)</span>
                                        <span className="text-indigo-400 font-bold">{labData.config.length1} m</span>
                                    </div>
                                    <input type="range" min="0.3" max="3" step="0.05" value={labData.config.length1}
                                        onChange={(e) => handleLabConfigChange('length1', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">LENGTH 2 (L₂)</span>
                                        <span className="text-fuchsia-400 font-bold">{labData.config.length2} m</span>
                                    </div>
                                    <input type="range" min="0.3" max="3" step="0.05" value={labData.config.length2}
                                        onChange={(e) => handleLabConfigChange('length2', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">ANGLE 1 (θ₁)</span>
                                        <span className="text-indigo-400 font-bold">{labData.config.theta1}°</span>
                                    </div>
                                    <input type="range" min="-180" max="180" step="1" value={labData.config.theta1}
                                        onChange={(e) => handleLabConfigChange('theta1', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">ANGLE 2 (θ₂)</span>
                                        <span className="text-fuchsia-400 font-bold">{labData.config.theta2}°</span>
                                    </div>
                                    <input type="range" min="-180" max="180" step="1" value={labData.config.theta2}
                                        onChange={(e) => handleLabConfigChange('theta2', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">ANGULAR VEL. 1 (ω₁)</span>
                                        <span className="text-cyan-400 font-bold">{labData.config.omega1} rad/s</span>
                                    </div>
                                    <input type="range" min="-10" max="10" step="0.1" value={labData.config.omega1}
                                        onChange={(e) => handleLabConfigChange('omega1', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">ANGULAR VEL. 2 (ω₂)</span>
                                        <span className="text-cyan-400 font-bold">{labData.config.omega2} rad/s</span>
                                    </div>
                                    <input type="range" min="-10" max="10" step="0.1" value={labData.config.omega2}
                                        onChange={(e) => handleLabConfigChange('omega2', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">GRAVITY (g)</span>
                                        <span className="text-emerald-400 font-bold">{labData.config.gravity} m/s²</span>
                                    </div>
                                    <input type="range" min="0" max="30" step="0.1" value={labData.config.gravity}
                                        onChange={(e) => handleLabConfigChange('gravity', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">DAMPING (c)</span>
                                        <span className="text-rose-400 font-bold">{labData.config.damping}</span>
                                    </div>
                                    <input type="range" min="0" max="0.5" step="0.01" value={labData.config.damping}
                                        onChange={(e) => handleLabConfigChange('damping', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">TIME SCALE</span>
                                        <span className="text-purple-400 font-bold">{labData.config.timeScale}x</span>
                                    </div>
                                    <input type="range" min="0.1" max="5" step="0.1" value={labData.config.timeScale}
                                        onChange={(e) => handleLabConfigChange('timeScale', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                                </div>
                            </>
                        )}
                        {labData.type === 'spring_oscillator' && (
                            <>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">MASS (m)</span>
                                        <span className="text-white font-bold">{labData.config.mass} kg</span>
                                    </div>
                                    <input type="range" min="0.1" max="20" step="0.1" value={labData.config.mass}
                                        onChange={(e) => handleLabConfigChange('mass', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">SPRING CONSTANT (k)</span>
                                        <span className="text-sky-400 font-bold">{labData.config.springConstant} N/m</span>
                                    </div>
                                    <input type="range" min="0.5" max="100" step="0.5" value={labData.config.springConstant}
                                        onChange={(e) => handleLabConfigChange('springConstant', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">NATURAL LENGTH (L₀)</span>
                                        <span className="text-violet-400 font-bold">{labData.config.naturalLength} m</span>
                                    </div>
                                    <input type="range" min="0.3" max="3" step="0.05" value={labData.config.naturalLength}
                                        onChange={(e) => handleLabConfigChange('naturalLength', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">DISPLACEMENT (x₀)</span>
                                        <span className="text-emerald-400 font-bold">{labData.config.x0} m</span>
                                    </div>
                                    <input type="range" min="-1.5" max="1.5" step="0.05" value={labData.config.x0}
                                        onChange={(e) => handleLabConfigChange('x0', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">INITIAL VELOCITY (v₀)</span>
                                        <span className="text-cyan-400 font-bold">{labData.config.v0} m/s</span>
                                    </div>
                                    <input type="range" min="-5" max="5" step="0.1" value={labData.config.v0}
                                        onChange={(e) => handleLabConfigChange('v0', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">DAMPING (c)</span>
                                        <span className="text-rose-400 font-bold">{labData.config.damping}</span>
                                    </div>
                                    <input type="range" min="0" max="20" step="0.05" value={labData.config.damping}
                                        onChange={(e) => handleLabConfigChange('damping', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">GRAVITY (g)</span>
                                        <span className="text-emerald-400 font-bold">{labData.config.gravity} m/s²</span>
                                    </div>
                                    <input type="range" min="0" max="30" step="0.1" value={labData.config.gravity}
                                        onChange={(e) => handleLabConfigChange('gravity', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">TIME SCALE</span>
                                        <span className="text-purple-400 font-bold">{labData.config.timeScale}x</span>
                                    </div>
                                    <input type="range" min="0.1" max="10" step="0.1" value={labData.config.timeScale}
                                        onChange={(e) => handleLabConfigChange('timeScale', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[10px] font-mono">
                                        <span className="text-amber-400">FORCED OSCILLATION</span>
                                        <button onClick={() => handleLabConfigChange('forced', !labData.config.forced)}
                                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${labData.config.forced ? 'bg-amber-500/30 text-amber-300' : 'bg-slate-800 text-slate-500'}`}>
                                            {labData.config.forced ? 'ON' : 'OFF'}
                                        </button>
                                    </div>
                                    {labData.config.forced && (
                                        <div className="mt-1 flex gap-2">
                                            <input type="number" min="0" max="50" step="0.1" value={labData.config.forceAmplitude}
                                                onChange={(e) => handleLabConfigChange('forceAmplitude', parseFloat(e.target.value))}
                                                className="w-1/2 bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs font-mono text-amber-200" title="F₀ (N)" />
                                            <input type="number" min="0" max="20" step="0.1" value={labData.config.drivingFrequency}
                                                onChange={(e) => handleLabConfigChange('drivingFrequency', parseFloat(e.target.value))}
                                                className="w-1/2 bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs font-mono text-amber-200" title="ω_d (rad/s)" />
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                        {labData.type === 'orbital_mechanics' && (
                            <>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">GRAVITATIONAL PARAMETER (μ)</span>
                                        <span className="text-sky-400 font-bold">{labData.config.mu}</span>
                                    </div>
                                    <input type="range" min="10" max="400000" step="10" value={labData.config.mu}
                                        onChange={(e) => handleLabConfigChange('mu', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">INITIAL RADIUS (r₀)</span>
                                        <span className="text-emerald-400 font-bold">{labData.config.r0} km</span>
                                    </div>
                                    <input type="range" min="30" max="20000" step="10" value={labData.config.r0}
                                        onChange={(e) => handleLabConfigChange('r0', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">INITIAL ANGLE (θ₀)</span>
                                        <span className="text-amber-400 font-bold">{labData.config.theta0}°</span>
                                    </div>
                                    <input type="range" min="-360" max="360" step="5" value={labData.config.theta0}
                                        onChange={(e) => handleLabConfigChange('theta0', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">INITIAL SPEED (v₀)</span>
                                        <span className="text-violet-400 font-bold">{labData.config.v0} km/s</span>
                                    </div>
                                    <input type="range" min="0" max="15" step="0.001" value={labData.config.v0}
                                        onChange={(e) => handleLabConfigChange('v0', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">VELOCITY ANGLE (φ)</span>
                                        <span className="text-cyan-400 font-bold">{labData.config.velAngle}°</span>
                                    </div>
                                    <input type="range" min="0" max="360" step="5" value={labData.config.velAngle}
                                        onChange={(e) => handleLabConfigChange('velAngle', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">CENTRAL BODY MASS (M)</span>
                                        <span className="text-white font-bold">{labData.config.centralMass} kg</span>
                                    </div>
                                    <input type="range" min="1e21" max="1e24" step="1e21" value={labData.config.centralMass}
                                        onChange={(e) => handleLabConfigChange('centralMass', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">SATELLITE MASS (m)</span>
                                        <span className="text-slate-300 font-bold">{labData.config.satelliteMass} kg</span>
                                    </div>
                                    <input type="range" min="10" max="100000" step="10" value={labData.config.satelliteMass}
                                        onChange={(e) => handleLabConfigChange('satelliteMass', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-300" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">CENTRAL RADIUS</span>
                                        <span className="text-sky-400 font-bold">{labData.config.centralRadius} km</span>
                                    </div>
                                    <input type="range" min="5" max="500" step="1" value={labData.config.centralRadius}
                                        onChange={(e) => handleLabConfigChange('centralRadius', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">TIME SCALE</span>
                                        <span className="text-purple-400 font-bold">{labData.config.timeScale}x</span>
                                    </div>
                                    <input type="range" min="0.1" max="1000" step="0.1" value={labData.config.timeScale}
                                        onChange={(e) => handleLabConfigChange('timeScale', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">INTEGRATION STEP Δt</span>
                                        <span className="text-rose-400 font-bold">{labData.config.dt}s</span>
                                    </div>
                                    <input type="range" min="0.001" max="10" step="0.001" value={labData.config.dt}
                                        onChange={(e) => handleLabConfigChange('dt', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => {
                                            handleLabConfigChange('v0', Math.sqrt(labData.config.mu / labData.config.r0))
                                            handleLabConfigChange('velAngle', 90)
                                            handleLabConfigChange('needsFit', true)
                                        }}
                                        className="px-3 py-2 rounded-lg bg-sky-500/20 border border-sky-500/50 hover:bg-sky-500/30 text-sky-300 font-mono text-[10px] transition-colors cursor-pointer"
                                    >CIRCULAR (v = √(μ/r))</button>
                                    <button
                                        onClick={() => {
                                            handleLabConfigChange('v0', Math.sqrt(2 * labData.config.mu / labData.config.r0))
                                            handleLabConfigChange('velAngle', 90)
                                            handleLabConfigChange('needsFit', true)
                                        }}
                                        className="px-3 py-2 rounded-lg bg-rose-500/20 border border-rose-500/50 hover:bg-rose-500/30 text-rose-300 font-mono text-[10px] transition-colors cursor-pointer"
                                    >ESCAPE (v = √(2μ/r))</button>
                                </div>
                                <div className="px-3 py-2 rounded-lg bg-slate-950 border border-white/5 text-[9px] font-mono text-slate-400 grid grid-cols-2 gap-1">
                                    <span className="text-sky-300">V_circ = {Number.isFinite(Math.sqrt(labData.config.mu / labData.config.r0)) ? Math.sqrt(labData.config.mu / labData.config.r0).toFixed(3) : '∞'} km/s</span>
                                    <span className="text-rose-300">V_esc = {Number.isFinite(Math.sqrt(2 * labData.config.mu / labData.config.r0)) ? Math.sqrt(2 * labData.config.mu / labData.config.r0).toFixed(3) : '∞'} km/s</span>
                                </div>
                            </>
                        )}
                        {labData.type === 'projectile_motion' && (
                            <>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">INITIAL VELOCITY (v₀)</span>
                                        <span className="text-sky-400 font-bold">{labData.config.v0} m/s</span>
                                    </div>
                                    <input type="range" min="5" max="50" step="1" value={labData.config.v0}
                                        onChange={(e) => handleLabConfigChange('v0', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">LAUNCH ANGLE (θ)</span>
                                        <span className="text-amber-400 font-bold">{labData.config.angle}°</span>
                                    </div>
                                    <input type="range" min="0" max="90" step="1" value={labData.config.angle}
                                        onChange={(e) => handleLabConfigChange('angle', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">INITIAL HEIGHT (y₀)</span>
                                        <span className="text-emerald-400 font-bold">{labData.config.y0} m</span>
                                    </div>
                                    <input type="range" min="0" max="50" step="1" value={labData.config.y0}
                                        onChange={(e) => handleLabConfigChange('y0', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">GRAVITY (g)</span>
                                        <span className="text-emerald-400 font-bold">{labData.config.gravity} m/s²</span>
                                    </div>
                                    <input type="range" min="1" max="30" step="0.1" value={labData.config.gravity}
                                        onChange={(e) => handleLabConfigChange('gravity', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                </div>
                            </>
                        )}
                        {labData.type === 'inclined_friction_ramp' && (
                            <>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">RAMP ANGLE (θ)</span>
                                        <span className="text-sky-400 font-bold">{labData.config.thetaDeg}°</span>
                                    </div>
                                    <input type="range" min="0" max="75" step="1" value={labData.config.thetaDeg}
                                        onChange={(e) => handleLabConfigChange('thetaDeg', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">STATIC FRICTION (μ_s)</span>
                                        <span className="text-amber-400 font-bold">{labData.config.muS?.toFixed(2)}</span>
                                    </div>
                                    <input type="range" min="0" max="1" step="0.01" value={labData.config.muS}
                                        onChange={(e) => handleLabConfigChange('muS', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">KINETIC FRICTION (μ_k)</span>
                                        <span className="text-rose-400 font-bold">{labData.config.muK?.toFixed(2)}</span>
                                    </div>
                                    <input type="range" min="0" max="1" step="0.01" value={labData.config.muK}
                                        onChange={(e) => handleLabConfigChange('muK', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">BLOCK MASS (m)</span>
                                        <span className="text-white font-bold">{labData.config.mass} kg</span>
                                    </div>
                                    <input type="range" min="0.1" max="10" step="0.1" value={labData.config.mass}
                                        onChange={(e) => handleLabConfigChange('mass', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">GRAVITY (g)</span>
                                        <span className="text-emerald-400 font-bold">{labData.config.g} m/s²</span>
                                    </div>
                                    <input type="range" min="0" max="25" step="0.1" value={labData.config.g}
                                        onChange={(e) => handleLabConfigChange('g', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">RAMP LENGTH (L)</span>
                                        <span className="text-violet-400 font-bold">{labData.config.rampLength} m</span>
                                    </div>
                                    <input type="range" min="1" max="12" step="0.1" value={labData.config.rampLength}
                                        onChange={(e) => handleLabConfigChange('rampLength', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">INITIAL POS (s₀)</span>
                                        <span className="text-cyan-400 font-bold">{labData.config.s0} m</span>
                                    </div>
                                    <input type="range" min="0" max={labData.config.rampLength} step="0.1" value={labData.config.s0}
                                        onChange={(e) => handleLabConfigChange('s0', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-mono">
                                        <span className="text-slate-400">INITIAL VELOCITY (v₀)</span>
                                        <span className="text-indigo-400 font-bold">{labData.config.v0} m/s</span>
                                    </div>
                                    <input type="range" min="-6" max="6" step="0.1" value={labData.config.v0}
                                        onChange={(e) => handleLabConfigChange('v0', parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                                </div>
                            </>
                        )}
                    </div>
                </PropertySection>
            )}

            {/* ENGINEERING INSPECTOR */}
            {labData.snapshot && (
                <PropertySection
                    sectionKey="inspector"
                    openSections={openSections}
                    toggleSection={toggleSection}
                    title="ENGINEERING INSPECTOR"
                    icon={<Wrench size={13} />}
                    accent="text-purple-400"
                    summary={labData.type === 'free_fall'
                        ? `Falling sphere · Semi-implicit Euler · Δt ${labData.snapshot.config?.dt ?? 0.016}s`
                        : labData.type === 'single_pendulum'
                        ? `Simple pendulum · Semi-implicit Euler · Δt ${labData.snapshot.config?.dt ?? 0.016}s`
                        : labData.type === 'double_pendulum'
                        ? `Coupled pendula · RK4 · Δt ${labData.snapshot.config?.dt ?? 0.016}s`
                        : labData.type === 'spring_oscillator'
                        ? `Spring oscillator · RK4 · Δt ${labData.snapshot.config?.dt ?? 0.016}s · frame-rate independent`
                        : labData.type === 'orbital_mechanics'
                        ? `Orbital mechanics · RK4 · Δt ${labData.snapshot.config?.dt ?? 0.016}s · ${labData.snapshot.orbit?.type?.toLowerCase()}`
                        : labData.type === 'inclined_friction_ramp'
                        ? `Block on Incline · RK4 Solver · Δt ${labData.config?.dt ?? 0.008}s`
                        : `Projectile · Analytical · Δt ${labData.snapshot.config?.dt ?? 0.016}s`
                    }
                >
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="bg-black/40 p-3 rounded-xl border border-white/5 font-mono text-[9px] text-slate-400 space-y-1">
                            <div className="text-purple-400 font-bold text-[10px]">SIMULATION</div>
                            {labData.type === 'free_fall' && (
                                <>
                                    <div>• Object: <span className="text-slate-200">Falling sphere ({labData.snapshot.config?.mass} kg)</span></div>
                                    <div>• Radius: <span className="text-slate-200">{labData.snapshot.config?.radius} m</span></div>
                                    <div>• Solver: <span className="text-slate-200">Semi-implicit Euler (4 substeps)</span></div>
                                    <div>• Timestep: <span className="text-slate-200">Δt = {labData.snapshot.config?.dt}s</span></div>
                                    <div>• Restitution: <span className="text-slate-200">e = {labData.snapshot.config?.restitution?.toFixed(2)}</span></div>
                                </>
                            )}
                            {labData.type === 'single_pendulum' && (
                                <>
                                    <div>• Object: <span className="text-slate-200">Simple pendulum ({labData.snapshot.config?.mass} kg)</span></div>
                                    <div>• Length: <span className="text-slate-200">{labData.snapshot.config?.length} m</span></div>
                                    <div>• Solver: <span className="text-slate-200">Semi-implicit Euler (8 substeps)</span></div>
                                    <div>• Timestep: <span className="text-slate-200">Δt = {labData.snapshot.config?.dt}s</span></div>
                                    <div>• Damping: <span className="text-slate-200">{labData.snapshot.config?.damping}</span></div>
                                </>
                            )}
                            {labData.type === 'projectile_motion' && (
                                <>
                                    <div>• Object: <span className="text-slate-200">Projectile ({labData.snapshot.config?.mass} kg)</span></div>
                                    <div>• Solver: <span className="text-slate-200">Analytical closed-form</span></div>
                                    <div>• Timestep: <span className="text-slate-200">Δt = {labData.snapshot.config?.dt}s</span></div>
                                </>
                            )}
                            {labData.type === 'double_pendulum' && (
                                <>
                                    <div>• Objects: <span className="text-slate-200">m₁ {labData.snapshot.config?.mass1} kg / m₂ {labData.snapshot.config?.mass2} kg</span></div>
                                    <div>• Rods: <span className="text-slate-200">L₁ {labData.snapshot.config?.length1} m / L₂ {labData.snapshot.config?.length2} m</span></div>
                                    <div>• Solver: <span className="text-slate-200">Runge-Kutta 4 (8 substeps)</span></div>
                                    <div>• Timestep: <span className="text-slate-200">Δt = {labData.snapshot.config?.dt}s · frame-rate independent</span></div>
                                    <div>• Damping: <span className="text-slate-200">c = {labData.snapshot.config?.damping}</span></div>
                                </>
                            )}
                            {labData.type === 'spring_oscillator' && (
                                <>
                                    <div>• Object: <span className="text-slate-200">Oscillator mass ({labData.snapshot.config?.mass} kg)</span></div>
                                    <div>• Spring: <span className="text-slate-200">k = {labData.snapshot.config?.springConstant} N/m · L₀ = {labData.snapshot.config?.naturalLength} m</span></div>
                                    <div>• Solver: <span className="text-slate-200">Runge-Kutta 4 (fixed timestep)</span></div>
                                    <div>• Timestep: <span className="text-slate-200">Δt = {labData.snapshot.config?.dt}s · frame-rate independent</span></div>
                                    <div>• Damping: <span className="text-slate-200">c = {labData.snapshot.config?.damping} N·s/m</span></div>
                                </>
                            )}
                            {labData.type === 'orbital_mechanics' && (
                                <>
                                    <div>• Central body: <span className="text-slate-200">μ = {labData.snapshot.orbit?.mu} km³/s² · M = {labData.snapshot.orbit?.centralMass} kg</span></div>
                                    <div>• Satellite: <span className="text-slate-200">m = {labData.snapshot.orbit?.satelliteMass} kg</span></div>
                                    <div>• Orbit: <span className="text-slate-200">{labData.snapshot.orbit?.type?.toLowerCase()} · e = {labData.snapshot.orbit?.ecc?.toFixed(4)}</span></div>
                                    <div>• Solver: <span className="text-slate-200">Runge-Kutta 4 (fixed timestep)</span></div>
                                    <div>• Timestep: <span className="text-slate-200">Δt = {labData.snapshot.config?.dt}s · frame-rate independent</span></div>
                                </>
                            )}
                            {labData.type === 'inclined_friction_ramp' && (
                                <>
                                    <div>• Object: <span className="text-slate-200">Ramp block ({labData.config.mass} kg)</span></div>
                                    <div>• Ramp: <span className="text-slate-200">L = {labData.config.rampLength}m · θ = {labData.config.thetaDeg}°</span></div>
                                    <div>• Friction: <span className="text-slate-200">μ_s = {labData.config.muS} · μ_k = {labData.config.muK}</span></div>
                                    <div>• Solver: <span className="text-slate-200">Runge-Kutta 4 (exact stick/slip)</span></div>
                                    <div>• Timestep: <span className="text-slate-200">Δt = {labData.config.dt}s</span></div>
                                </>
                            )}
                            <div>• State: <span className="text-slate-200">{labData.snapshot.isResting ? 'AT REST' : 'RUNNING'}</span></div>
                        </div>

                        <div className="bg-black/40 p-3 rounded-xl border border-white/5 font-mono text-[9px] text-slate-400 space-y-1">
                            <div className="text-amber-400 font-bold text-[10px]">ANALYTICAL SOLUTION</div>
                            {labData.type === 'free_fall' && (
                                <>
                                    <div>• Height law: <span className="text-slate-200">y(t) = h₀ - ½gt²</span></div>
                                    <div>• Velocity law: <span className="text-slate-200">v(t) = -g·t</span></div>
                                    <div>• Time to ground: <span className="text-white font-bold">{labData.snapshot.theoretical?.firstImpactTime ?? 'N/A'} s</span></div>
                                    <div>• Impact velocity: <span className="text-white font-bold">{labData.snapshot.theoretical?.impactVelocity ?? 'N/A'} m/s</span></div>
                                </>
                            )}
                            {labData.type === 'single_pendulum' && (
                                <>
                                    <div>• Period (small angle): <span className="text-slate-200">{labData.snapshot.analytics?.smallAnglePeriod?.toFixed(3) ?? 'N/A'} s</span></div>
                                    <div>• Period (exact): <span className="text-slate-200">{labData.snapshot.analytics?.exactPeriod?.toFixed(3) ?? 'N/A'} s</span></div>
                                    <div>• Small-angle freq: <span className="text-slate-200">{labData.snapshot.analytics?.smallAngleFrequency?.toFixed(3) ?? 'N/A'} Hz</span></div>
                                    <div>• Max speed: <span className="text-slate-200">{labData.snapshot.analytics?.speedAtBottom?.toFixed(2) ?? 'N/A'} m/s</span></div>
                                </>
                            )}
                            {labData.type === 'projectile_motion' && (
                                <>
                                    <div>• Time of flight: <span className="text-white font-bold">{labData.snapshot.analytics?.timeOfFlight?.toFixed(3) ?? 'N/A'} s</span></div>
                                    <div>• Range: <span className="text-white font-bold">{labData.snapshot.analytics?.range?.toFixed(3) ?? 'N/A'} m</span></div>
                                    <div>• Max height: <span className="text-white font-bold">{labData.snapshot.analytics?.maxHeight?.toFixed(3) ?? 'N/A'} m</span></div>
                                </>
                            )}
                            {labData.type === 'double_pendulum' && (
                                <>
                                    <div>• θ–ω portrait: <span className="text-slate-200">phase-space plot in lab overlay</span></div>
                                    <div>• Small-angle estimate: <span className="text-slate-200">ω ≈ √(g/L₁) = {(9.81 / (labData.snapshot.config?.length1 || 1)).toFixed(2)} rad/s (m₂→L₁)</span></div>
                                    <div>• Chaotic signature: <span className="text-slate-200">2 ICs, δθ₀ = 0.01 rad → exponential divergence</span></div>
                                    <div>• Exact closed form: <span className="text-slate-200">none (coupled nonlinear ODEs)</span></div>
                                </>
                            )}
                            {labData.type === 'spring_oscillator' && (
                                <>
                                    <div>• Solution: <span className="text-slate-200">x(t) = A·cos(ω₀t + φ)</span></div>
                                    <div>• Period: <span className="text-white font-bold">{labData.snapshot.period?.toFixed(3) ?? 'N/A'} s</span></div>
                                    <div>• Natural freq: <span className="text-slate-200">{labData.snapshot.naturalFrequency?.toFixed(3) ?? 'N/A'} Hz</span></div>
                                    <div>• ω₀ = √(k/m): <span className="text-slate-200">{labData.snapshot.omega0?.toFixed(3) ?? 'N/A'} rad/s</span></div>
                                    <div>• num − ana: <span className="text-orange-300">{labData.snapshot.analyticalError?.toFixed(5) ?? 'N/A'} m</span></div>
                                </>
                            )}
                            {labData.type === 'orbital_mechanics' && (
                                <>
                                    <div>• Orbit: <span className="text-slate-200">{labData.snapshot.orbit?.type?.toLowerCase()}</span></div>
                                    <div>• Semi-major (a): <span className="text-white font-bold">{Number.isFinite(labData.snapshot.orbit?.semiMajor) ? labData.snapshot.orbit.semiMajor.toFixed(1) : '∞'} km</span></div>
                                    <div>• Peri / Apoapsis: <span className="text-slate-200">{labData.snapshot.orbit?.rp?.toFixed(1)} / {Number.isFinite(labData.snapshot.orbit?.ra) ? labData.snapshot.orbit.ra.toFixed(1) : '∞'} km</span></div>
                                    <div>• Period: <span className="text-slate-200">{Number.isFinite(labData.snapshot.orbit?.period) ? labData.snapshot.orbit.period.toFixed(2) : '∞'} s</span></div>
                                    <div>• v_circ / v_esc: <span className="text-slate-200">{labData.snapshot.orbit?.vCirc?.toFixed(2)} / {labData.snapshot.orbit?.vEsc?.toFixed(2)} km/s</span></div>
                                </>
                            )}
                            {labData.type === 'inclined_friction_ramp' && (
                                <>
                                    <div>• Critical angle (θ_c): <span className="text-white font-bold">{labData.snapshot.thetaCDeg?.toFixed(2)}°</span></div>
                                    <div>• Normal force (N): <span className="text-slate-200">{labData.snapshot.forces?.normal?.toFixed(2)} N</span></div>
                                    <div>• Static max (f_s,max): <span className="text-slate-200">{labData.snapshot.forces?.fStaticMax?.toFixed(2)} N</span></div>
                                    <div>• Kinetic friction (f_k): <span className="text-slate-200">{labData.snapshot.forces?.kineticFriction?.toFixed(2)} N</span></div>
                                </>
                            )}
                        </div>

                        <div className="bg-black/40 p-3 rounded-xl border border-white/5 font-mono text-[9px] text-slate-400 space-y-1">
                            <div className="text-emerald-400 font-bold text-[10px]">ENERGY / VALIDATION</div>
                            {labData.type === 'spring_oscillator' && (
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    <Stat label="Displacement (x)" value={labData.snapshot.x.toFixed(2)} unit="m" color="text-emerald-400" />
                                    <Stat label="Velocity (v)" value={labData.snapshot.v.toFixed(2)} unit="m/s" color="text-sky-400" />
                                    <Stat label="Acceleration (a)" value={labData.snapshot.a.toFixed(2)} unit="m/s²" color="text-amber-400" />
                                    <Stat label="ω₀ = √(k/m)" value={labData.snapshot.omega0.toFixed(2)} unit="rad/s" color="text-violet-400" />
                                </div>
                            )}
                            {labData.type === 'orbital_mechanics' && (
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    <Stat label="Radius (r)" value={labData.snapshot.position.r.toFixed(1)} unit="km" color="text-sky-400" />
                                    <Stat label="Speed (v)" value={labData.snapshot.velocity.v.toFixed(2)} unit="km/s" color="text-emerald-400" />
                                    <Stat label="Orbit Type" value={labData.snapshot.orbit.type} unit="" color={labData.snapshot.orbit.type === 'CIRCULAR' ? 'text-sky-400' : 'text-violet-400'} />
                                    <Stat label="Orbits" value={labData.snapshot.orbitCount.toFixed(2)} unit="n" color="text-amber-400" />
                                </div>
                            )}
                            
                            {labData.snapshot.energy && (
                                <>
                                    <div>• Total: <span className="text-slate-200">{Math.round(labData.snapshot.energy.total).toLocaleString()} J</span></div>
                                    <div>• Initial: <span className="text-slate-200">{Math.round(labData.snapshot.energy.initialTotal || 0).toLocaleString()} J</span></div>
                                    {labData.snapshot.energy.dissipated !== undefined && (
                                        <div>• Dissipated: <span className="text-rose-400 font-bold">{Math.round(labData.snapshot.energy.dissipated).toLocaleString()} J</span></div>
                                    )}
                                    <div>• Bounces: <span className="text-slate-200">{labData.snapshot.bounceCount ?? labData.snapshot.swingCount ?? 0}</span></div>
                                </>
                            )}
                            {labData.type === 'spring_oscillator' && (
                                <>
                                    <div>• Damping ratio (ζ): <span className="text-rose-300">{labData.snapshot.dampingRatio ?? '—'} · {labData.snapshot.dampingClass ?? '—'}</span></div>
                                    <div>• Spring force: <span className="text-sky-300">F_s = −kx = {labData.snapshot.fSpring ?? '—'} N</span></div>
                                    <div>• Energy drift: <span className="text-amber-300">ΔE/E ≈ {labData.snapshot.energyErrorPct ?? '—'} %</span></div>
                                </>
                            )}
                            {labData.type === 'orbital_mechanics' && (
                                <>
                                    <div>• KE: <span className="text-emerald-300">{labData.snapshot.kinetic.toExponential(3)} J</span></div>
                                    <div>• PE: <span className="text-sky-300">{labData.snapshot.potential.toExponential(3)} J</span></div>
                                    <div>• Specific energy (ε): <span className="text-amber-300">{labData.snapshot.orbit.eps.toExponential(3)} km²/s²</span></div>
                                    <div>• Ang. momentum (h): <span className="text-violet-300">{labData.snapshot.orbit.h.toExponential(3)} km²/s</span></div>
                                    <div>• Apsis rp / ra: <span className="text-slate-300">{labData.snapshot.orbit.rp.toFixed(1)} / {Number.isFinite(labData.snapshot.orbit.ra) ? labData.snapshot.orbit.ra.toFixed(1) : '∞'} km</span></div>
                                </>
                            )}
                        </div>
                    </div>
                </PropertySection>
            )}
        {labData.type === 'orbital_mechanics' && (
                <OrbitalLabPanels
                    labData={labData}
                    openSections={openSections}
                    toggleSection={toggleSection}
                />
            )}
        </div>
    )
}

function fmtOrb(v, digits = 4) {
    if (!Number.isFinite(v)) return '∞'
    if (v === 0) return '0'
    if (Math.abs(v) >= 1e6 || Math.abs(v) < 1e-4) return v.toExponential(2)
    return v.toFixed(digits)
}

function formatOrbTime(sec) {
    if (!Number.isFinite(sec)) return '∞'
    if (sec < 1) return `${(sec * 1000).toFixed(0)} ms`
    if (sec < 120) return `${sec.toFixed(1)} s`
    const min = Math.floor(sec / 60)
    const rem = sec % 60
    if (min < 60) return `${min}m ${rem.toFixed(0)}s`
    const hrs = Math.floor(min / 60)
    const mins = min % 60
    return `${hrs}h ${mins}m`
}

const ORBIT_ACCENT = {
    CIRCULAR: '#38bdf8',
    ELLIPTICAL: '#a78bfa',
    PARABOLIC: '#fbbf24',
    HYPERBOLIC: '#f472b6',
}

function OrbEnergyGraph({ history }) {
    if (!history || !history.time || history.time.length < 2) {
        return (
            <div className="h-24 bg-slate-950 rounded-lg border border-white/5 flex items-center justify-center font-mono text-[10px] text-slate-500">
                Collecting energy samples…
            </div>
        )
    }
    const KE = '63, 240, 250'
    const PE = '251, 191, 36'
    const TE = '251, 113, 133'
    const t = history.time
    const kes = history.kinetic
    const pes = history.potential
    const tes = history.total
    let keMax = 0, peMax = 0, teMax = 0
    const keMin = Math.min(...kes), peMin = Math.min(...pes), teMin = Math.min(...tes)
    const tMin = Math.min(...t), tMax = Math.max(...t)
    kes.forEach(v => { if (Math.abs(v) > keMax) keMax = Math.abs(v) })
    pes.forEach(v => { if (Math.abs(v) > peMax) peMax = Math.abs(v) })
    tes.forEach(v => { if (Math.abs(v) > teMax) teMax = Math.abs(v) })
    const keRng = Math.max(keMax - keMin, 1e-9)
    const peRng = Math.max(peMax - peMin, 1e-9)
    const teRng = Math.max(teMax - teMin, 1e-9)
    const tRng = Math.max(tMax - tMin, 1e-9)
    const x = i => 0 + (t[i] - tMin) / tRng * 300
    const y = (v, rng, mn) => 92 - (v - mn) / rng * 72
    const pth = (vals, rng, mn) => vals.map((v, i) => `${x(i).toFixed(1)},${y(v, rng, mn).toFixed(1)}`).join(' ')
    const keP = pth(kes, keRng, keMin)
    const peP = pth(pes, peRng, peMin)
    const teP = pth(tes, teRng, teMin)
    return (
        <div className="w-full">
            <svg width="300" height="92" viewBox="0 0 300 92" className="w-full h-auto">
                <line x1="0" y1="0" x2="0" y2="92" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="1" />
                <line x1="300" y1="0" x2="300" y2="92" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="1" />
                <line x1="0" y1="92" x2="300" y2="92" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="1" />
                <line x1="0" y1="0" x2="300" y2="0" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="1" />
                <line x1="0" y1="46" x2="300" y2="46" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1" />
                <polyline points={teP} fill="none" stroke={`rgb(${TE})`} strokeWidth="1.5" opacity="0.95" />
                <polyline points={keP} fill="none" stroke={`rgb(${KE})`} strokeWidth="1.5" opacity="0.9" />
                <polyline points={peP} fill="none" stroke={`rgb(${PE})`} strokeWidth="1.5" opacity="0.9" />
            </svg>
            <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                <span className="text-cyan-500">t {fmtOrb(tMin, 2)}s</span>
                <span className="text-slate-500">ENERGY vs TIME</span>
                <span className="text-rose-400">t {fmtOrb(tMax, 2)}s</span>
            </div>
            <div className="flex gap-3 text-[9px] font-mono mt-1">
                <span className="text-cyan-400">— KE</span>
                <span className="text-amber-400">— PE</span>
                <span className="text-rose-400">— Total E</span>
            </div>
        </div>
    )
}

function OrbitalLabPanels({ labData, openSections, toggleSection }) {
    const sc = labData.snapshot
    const ob = sc.orbit
    const statusText = sc.impacted ? 'IMPACT' : (ob.type === 'CIRCULAR' ? 'ORBITING' : 'IN FLIGHT')
    const telemetrySummary = `t ${formatOrbTime(sc.time)} · r ${fmtOrb(sc.position.r, 3)} km · v ${fmtOrb(sc.velocity.v, 3)} km/s · ${statusText}`
    const elementsSummary = `a ${fmtOrb(ob.semiMajor, 3)} km · e ${fmtOrb(ob.ecc, 3)} · ε ${fmtOrb(ob.eps, 3)} km²/s² · h ${fmtOrb(ob.h, 3)} km²/s`
    const energySummary = `E = ${fmtOrb(sc.totalEnergy, 3)} J · KE ${fmtOrb(sc.kinetic, 3)} J · PE ${fmtOrb(sc.potential, 3)} J`
    const keplerSummary = `${sc.orbitCount.toFixed(2)} orbits · T ${formatOrbTime(ob.period)} · swept ${sc.sectors.length} sectors`
    const orbitAccent = ORBIT_ACCENT[ob.type] || ORBIT_ACCENT.CIRCULAR
    const sectionHeader = (title, icon, accent, summary) => ({ title, icon, accent, summary })
    return (
        <>
            <PropertySection
                {...sectionHeader('Live Orbital Telemetry', <Activity size={13} />, 'text-emerald-400', telemetrySummary)}
                sectionKey="orbital-telemetry"
                openSections={openSections}
                toggleSection={toggleSection}
            >
                <div className="space-y-3">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <Stat label="Sim Time (t)" value={formatOrbTime(sc.time)} color="text-white" />
                        <Stat label="Orbits Completed" value={sc.orbitCount.toFixed(2)} color="text-sky-400" />
                        <Stat label="Radius (r)" value={fmtOrb(sc.position.r, 4)} unit="km" color="text-emerald-400" />
                        <Stat label="Speed (|v|)" value={fmtOrb(sc.velocity.v, 4)} unit="km/s" color="text-cyan-400" />
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <Stat label="Position x" value={fmtOrb(sc.position.x, 3)} unit="km" />
                        <Stat label="Position y" value={fmtOrb(sc.position.y, 3)} unit="km" />
                        <Stat label="vx" value={fmtOrb(sc.velocity.x, 3)} unit="km/s" />
                        <Stat label="vy" value={fmtOrb(sc.velocity.y, 3)} unit="km/s" />
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <Stat label="Acceleration |a|" value={fmtOrb(sc.acceleration.magnitude, 3)} unit="km/s²" color="text-fuchsia-400" />
                        <Stat label="Acceleration ax" value={fmtOrb(sc.acceleration.x, 3)} unit="km/s²" />
                        <Stat label="Acceleration ay" value={fmtOrb(sc.acceleration.y, 3)} unit="km/s²" />
                        <Stat label="Gravity g = μ/r²" value={fmtOrb(sc.acceleration.magnitude, 3)} unit="km/s²" color="text-amber-400" />
                    </div>
                    {sc.impacted && (
                        <div className="bg-red-950/40 border border-red-500/40 px-3 py-2 rounded-lg text-xs font-mono text-red-300">
                            ⚠ IMPACT — satellite reached the central body's physical radius (r ≤ R_c = {fmtOrb(sc.config.centralRadius, 3)} km). Impact speed: {fmtOrb(sc.impactSpeed, 3)} km/s at t = {formatOrbTime(sc.impactTime)}.
                        </div>
                    )}
                </div>
            </PropertySection>
            <PropertySection
                {...sectionHeader('Orbital Elements · Energy · Momentum', <Gauge size={13} />, 'text-sky-400', elementsSummary)}
                sectionKey="orbital-elements"
                openSections={openSections}
                toggleSection={toggleSection}
            >
                <div className="space-y-3">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <Stat label="μ = GM" value={fmtOrb(ob.mu, 5)} unit="km³/s²" color="text-amber-400" />
                        <Stat label="Circular Velocity" value={fmtOrb(ob.vCirc, 4)} unit="km/s" color="text-sky-400" />
                        <Stat label="Escape Velocity" value={fmtOrb(ob.vEsc, 4)} unit="km/s" color="text-rose-400" />
                        <Stat label="Current |v|" value={fmtOrb(sc.velocity.v, 4)} unit="km/s" color="text-cyan-400" />
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        <Stat label="Semi-major a" value={Number.isFinite(ob.semiMajor) ? fmtOrb(ob.semiMajor, 4) : '∞'} unit="km" color="text-purple-400" />
                        <Stat label="Eccentricity e" value={fmtOrb(ob.ecc, 4)} color="text-purple-300" />
                        <Stat label="Periapsis rp" value={Number.isFinite(ob.rp) ? fmtOrb(ob.rp, 4) : '∞'} unit="km" color="text-emerald-400" />
                        <Stat label="Apoapsis ra" value={Number.isFinite(ob.ra) ? fmtOrb(ob.ra, 4) : '∞'} unit="km" color="text-rose-400" />
                        <Stat label="Orbital Period T" value={Number.isFinite(ob.period) ? formatOrbTime(ob.period) : '∞'} color="text-amber-400" />
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <Stat label="Kinetic Energy" value={fmtOrb(sc.kinetic, 4)} unit="J" color="text-emerald-400" />
                        <Stat label="Potential Energy" value={fmtOrb(sc.potential, 4)} unit="J" color="text-sky-400" />
                        <Stat label="Specific Energy ε" value={fmtOrb(ob.eps, 4)} unit="km²/s²" color={ob.eps < 0 ? 'text-emerald-400' : ob.eps > 0 ? 'text-rose-400' : 'text-amber-400'} />
                        <Stat label="Angular Mom. h" value={fmtOrb(ob.h, 4)} unit="km²/s" color="text-violet-400" />
                    </div>
                    <div className="bg-slate-950/60 px-3 py-2 rounded-lg font-mono text-[9px] text-slate-500 border border-white/5">
                        <span className="text-slate-300 font-bold">ORBIT CLASSIFICATION → </span>
                        <span style={{ color: orbitAccent }} className="font-bold">{ob.type}</span>
                        <span className="text-slate-500"> · {ob.eps < 0 ? 'ε < 0 → bound orbit' : ob.eps > 0 ? 'ε > 0 → unbound' : 'ε = 0 → parabolic escape boundary'}</span>
                    </div>
                </div>
            </PropertySection>
            <PropertySection
                {...sectionHeader('Energy Graph (real sampled data)', <TrendingUp size={13} />, 'text-emerald-400', energySummary)}
                sectionKey="orbital-energy-graph"
                openSections={openSections}
                toggleSection={toggleSection}
            >
                <div className="space-y-1">
                    <OrbEnergyGraph history={sc.energyHistory} />
                    <div className="flex justify-between text-[9px] font-mono text-slate-500">
                        <span>KE {fmtOrb(sc.kinetic, 5)} J</span>
                        <span>PE {fmtOrb(sc.potential, 5)} J</span>
                        <span className="text-rose-400">E = KE + PE {fmtOrb(sc.totalEnergy, 5)} J</span>
                    </div>
                </div>
            </PropertySection>
            <PropertySection
                {...sectionHeader('Kepler’s Laws', <BookOpen size={13} />, 'text-amber-400', keplerSummary)}
                sectionKey="orbital-kepler"
                openSections={openSections}
                toggleSection={toggleSection}
            >
                <div className="space-y-3">
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 font-mono text-[10px] text-slate-400 space-y-1">
                        <div><span className="text-amber-300 font-bold">1st Law — </span>Elliptical orbits with the central body at one focus. Here a = {Number.isFinite(ob.semiMajor) ? fmtOrb(ob.semiMajor, 3) : '∞'} km, e = {ob.ecc.toFixed(4)}.</div>
                        <div><span className="text-amber-300 font-bold">2nd Law — </span>Equal areas are swept in equal times: the sector shading in the canvas shows {sc.sectors.length} consecutive equal-time areas. Near periapsis the satellite moves faster.</div>
                        <div><span className="text-amber-300 font-bold">3rd Law — </span>T² = (4π²/μ)·a³. Numerical: T²/a³ = {Number.isFinite(ob.period) && Number.isFinite(ob.semiMajor) ? (ob.period ** 2 / ob.semiMajor ** 3).toExponential(3) : '∞'} s²/km³.</div>
                        <div className="text-slate-500 pt-1 border-t border-white/5">Points: {sc.trail.length} · Sectors: {sc.sectors.length} · Orbit count: {sc.orbitCount.toFixed(2)}</div>
                    </div>
                    {sc.sectors.slice(-8).map((s, i) => (
                        <Stat key={i} label={`Sector ${sc.sectors.length - 8 + i + 1}`} value={fmtOrb(s.area, 3)} unit="km²" color="text-amber-400" />
                    ))}
                </div>
            </PropertySection>
        </>
    )
}

export default function PropertiesPanel() {
    const objects = useStore(s => s.objects)
    const setObjects = useStore(s => s.setObjects)
    const activeFileId = useStore(s => s.activeFileId)
    const selectedIds = useStore(s => s.selectedIds)
    const groupObjects = useStore(s => s.groupObjects)
    const ungroupObjects = useStore(s => s.ungroupObjects)
    const constraints = useStore(s => s.constraints)
    const setConstraints = useStore(s => s.setConstraints)

    const shapes3D = useStore(s => s.shapes3D)
    const setShapes3D = useStore(s => s.setShapes3D)
    const addShape3D = useStore(s => s.addShape3D)

    const active3DTool = useStore(s => s.active3DTool)
    const extrudeOperation = useStore(s => s.extrudeOperation)
    const setExtrudeOperation = useStore(s => s.setExtrudeOperation)

const [selectedObject, setSelectedObject] = useState(null)

    // Lab data for simulation properties
    const labData = useStore(s => s.labData)
    const [openSections, setOpenSections] = useState({})

    const toggleSection = (key) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
    }

    // Handle lab configuration changes from Properties panel
    const handleLabConfigChange = (key, value) => {
        if (!labData) return
        // Update the lab's internal state by triggering a config update
        // The labs watch their config state and will update the solver
        // We need to trigger the labs' config update by simulating the store changes
        // Since labs watch their own state, we'll use a custom event
        window.dispatchEvent(new CustomEvent('lab-config-change', { 
            detail: { type: labData.type, key, value } 
        }))
    }

    const [jointType, setJointType] = useState('distance')
    const [jointTargetA, setJointTargetA] = useState('')
    const [jointTargetB, setJointTargetB] = useState('')
    const [jointDistance, setJointDistance] = useState(100)

    useEffect(() => {
        if (activeFileId) {
            let obj = objects.find(o => o.id === activeFileId)
            let is3D = false;
            if (!obj) {
                obj = shapes3D.find(o => o.id === activeFileId);
                is3D = !!obj;
            }
            setSelectedObject(obj ? { ...obj, is3D } : null)
            if (obj) setJointTargetA(obj.id)
        } else {
            setSelectedObject(null)
        }
    }, [activeFileId, objects, shapes3D])

    const Layers = Maximize 

    // PropertySection component for accordion sections (matching LayerPanel visual style)
    function PropertySection({ title, icon, accent, summary, children, key: sectionKey }) {
        const isOpen = openSections[sectionKey] || false
        return (
            <div className="border-t border-slate-700/50 transition-colors duration-200 bg-slate-800/30">
                <button
                    onClick={() => toggleSection(sectionKey)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer transition-colors duration-200 group hover:bg-slate-800/50"
                    aria-expanded={isOpen}
                >
                    <span className={`shrink-0 transition-colors ${isOpen ? accent : 'text-slate-500 group-hover:text-slate-300'}`}>
                        {icon}
                    </span>
                    <span className={`text-[10px] font-bold tracking-widest uppercase shrink-0 transition-colors ${isOpen ? 'text-slate-200' : 'text-slate-400 group-hover:text-slate-200'}`}>
                        {title}
                    </span>
                    <span className="flex-1 min-w-0 text-xs font-mono text-slate-400 truncate">{summary}</span>
                    <ChevronDown
                        size={12}
                        className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-slate-300' : 'text-slate-500 group-hover:text-slate-300'}`}
                    />
                </button>
                <div
                    className="grid"
                    style={{ gridTemplateRows: isOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.2s ease-out' }}
                >
                    <div className="overflow-hidden min-h-0 px-4 pb-3">
                        {children}
                    </div>
                </div>
            </div>
        )
    }

    if (!selectedObject) {
        // Determine what to show in the empty state
        const showLabData = labData && !selectedObject
        
        return (
            <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-background-light dark:bg-background-dark flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
                    <SlidersHorizontal size={14} className="text-slate-500" />
                    <h3 className="font-bold text-sm text-slate-500">Properties</h3>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
{showLabData ? (
                        <LabProperties
                            labData={labData}
                            openSections={openSections}
                            toggleSection={toggleSection}
                            handleLabConfigChange={handleLabConfigChange}
                        />
                    ) : (
                        <>
                            <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500">
                                <p className="text-xs">Select an object to view its properties.</p>
                            </div>
                            {constraints.length > 0 && (
                                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 mb-2">
                                        <Link size={12} /> Joints ({constraints.length})
                                    </h4>
                                    <div className="space-y-1">
                                        {constraints.map(c => (
                                            <div key={c.id} className="flex items-center justify-between bg-slate-800/50 px-2 py-1 rounded text-[10px] font-mono">
                                                <span className="text-primary">{c.type}</span>
                                                <span className="text-slate-400 truncate mx-1">{c.targetA} ↔ {c.targetB || '⚓'}</span>
                                                <button onClick={() => setConstraints(constraints.filter(x => x.id !== c.id))} className="text-red-400 hover:text-red-300 transition-colors shrink-0">
                                                    <Trash2 size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </aside>
        )
    }

    const handleChange = (field, value, subfield = null) => {
        if (selectedObject.is3D) {
            setShapes3D(prev => prev.map(o => {
                if (o.id === selectedObject.id) {
                    if (subfield !== null) {
                        const val = value === '' ? '' : parseFloat(value);
                        const safeVal = isNaN(val) && value !== '' ? 0 : val;
                        const idx = subfield === 'x' ? 0 : subfield === 'y' ? 1 : 2;

                        if (Array.isArray(o[field])) {
                            const newArr = [...o[field]];
                            newArr[idx] = safeVal;
                            return { ...o, [field]: newArr }
                        }
                        return { ...o, [field]: { ...o[field], [subfield]: safeVal } }
                    }
                    if (field === 'params') {
                        const newParams = { ...o.params };
                        Object.entries(value).forEach(([k, v]) => {
                            const val = v === '' ? 0 : parseFloat(v);
                            newParams[k] = isNaN(val) ? 0 : val;
                        });
                        return { ...o, params: newParams }
                    }

                    
                    if (field === 'isStatic') {
                        return { ...o, [field]: !!value }
                    }

                    if (field === 'color' || field === 'name') {
                        return { ...o, [field]: value }
                    }

                    const val = value === '' ? 0 : parseFloat(value);
                    return { ...o, [field]: isNaN(val) ? 0 : val }
                }
                return o;
            }))
        } else {
            const parsedValue =
                (field === 'stroke' || field === 'name' || field === 'points') ? value
                    : field === 'isStatic' ? !!value
                        : parseFloat(value) || 0;
            setObjects(prev => prev.map(o => o.id === selectedObject.id ? { ...o, [field]: parsedValue } : o))
        }
    }

    const handleDelete = () => {
        if (selectedObject.is3D) {
            setShapes3D(prev => prev.filter(o => o.id !== selectedObject.id))
        } else {
            setObjects(prev => prev.filter(o => o.id !== selectedObject.id))
        }
        useStore.setState({ activeFileId: null })
    }

    const handleAddJoint = () => {
        if (!jointTargetA) return;
        if (jointType === 'distance' && !jointTargetB) return;

        const newConstraint = {
            id: `joint_${Math.random().toString(36).substring(2, 7)}`,
            type: jointType,
            targetA: jointTargetA,
            targetB: jointTargetB || null,
            distance: parseFloat(jointDistance),
        };
        setConstraints([...(constraints || []), newConstraint]);
    };

    return (
        <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-background-light dark:bg-background-dark flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {selectedIds.length > 1 && (
                        <button
                            onClick={groupObjects}
                            className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-md transition-colors"
                            title="Group Selected"
                        >
                            <Layers size={14} />
                        </button>
                    )}
                    {(selectedObject.groupId || (selectedIds.length === 1 && objects.find(o => o.id === selectedIds[0])?.groupId)) && (
                        <button
                            onClick={ungroupObjects}
                            className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-md transition-colors"
                            title="Ungroup"
                        >
                            <Maximize size={14} />
                        </button>
                    )}
                    <button onClick={handleDelete} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-md transition-colors" title="Delete Object">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {}
                {active3DTool === 'extrude' && selectedObject && !selectedObject.is3D && isClosedProfile(selectedObject) && (
                    <div className="space-y-3 bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                            <Layers size={12} /> Extrude Profile
                        </h4>
                        
                        <div className="space-y-2">
                            <label className="text-xs text-slate-300">Distance</label>
                            <input
                                type="number"
                                value={extrudeOperation.distance}
                                onChange={e => setExtrudeOperation({ distance: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-slate-300">Direction</label>
                            <select
                                value={extrudeOperation.direction}
                                onChange={e => setExtrudeOperation({ direction: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300"
                            >
                                <option value="positive">+Z Direction</option>
                                <option value="negative">-Z Direction</option>
                                <option value="symmetric">Symmetric (Both)</option>
                            </select>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-xs text-slate-300">Operation</label>
                            <select
                                value={extrudeOperation.type}
                                onChange={e => setExtrudeOperation({ type: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300"
                            >
                                <option value="new">New Solid</option>
                                <option value="join" disabled>Join (CSG TBD)</option>
                                <option value="cut" disabled>Cut (CSG TBD)</option>
                            </select>
                        </div>

                        <button 
                            className="w-full py-1.5 mt-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-md transition-colors"
                            onClick={() => {
                                const solidId = `extsolid_${Math.random().toString(36).substring(2, 7)}`;
                                addShape3D({
                                    id: solidId,
                                    type: 'extruded_solid',
                                    profileId: selectedObject.id,
                                    distance: extrudeOperation.distance,
                                    direction: extrudeOperation.direction,
                                    operation: extrudeOperation.type,
                                    position: [0, 0, 0],
                                    rotation: [0, 0, 0],
                                    scale: [1, 1, 1],
                                    color: selectedObject.stroke || '#3b82f6',
                                    params: { ...extrudeOperation }
                                });
                                useStore.setState({ active3DTool: 'select', selectedIds: [], selected3DIds: [solidId], activeFileId: solidId });
                            }}
                        >
                            Generate 3D Solid
                        </button>
                    </div>
                )}
                
                {active3DTool === 'extrude' && selectedObject && !selectedObject.is3D && !isClosedProfile(selectedObject) && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-xs text-red-500">
                        <strong>Invalid Profile</strong><br/>
                        Extrude requires a closed 2D profile. The selected {selectedObject.type} is not properly closed.
                    </div>
                )}

                {}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Settings size={12} /> General
                    </h4>

                    <div className="grid grid-cols-3 items-center gap-2 mb-2">
                        <label className="text-xs text-slate-400">Name</label>
                        <div className="col-span-2">
                            <input
                                type="text"
                                value={selectedObject.name || ''}
                                placeholder={`${selectedObject.type}_${selectedObject.id.substring(0, 4)}`}
                                onChange={e => handleChange('name', e.target.value)}
                                className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 items-center gap-2">
                        <label className="text-xs text-slate-400">Type</label>
                        <div className="col-span-2 text-xs font-mono uppercase bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded">
                            {selectedObject.type}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 items-center gap-2">
                        <label className="text-xs text-slate-400">ID</label>
                        <div className="col-span-2 text-[10px] font-mono text-slate-500 truncate">
                            {selectedObject.id}
                        </div>
                    </div>
                </div>

                {}
                {selectedObject.is3D && (
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Maximize size={12} /> 3D Transform
                        </h4>

                        <div className="space-y-3">
                            <label className="text-[10px] text-slate-400 pl-1 uppercase tracking-tight font-bold">Position</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['x', 'y', 'z'].map(axis => (
                                    <div key={axis} className="space-y-1">
                                        <label className="text-[9px] text-slate-500 pl-1 uppercase">{axis}</label>
                                        <input
                                            type="number"
                                            value={Array.isArray(selectedObject.position) ? selectedObject.position[['x','y','z'].indexOf(axis)] : (selectedObject.position?.[axis] ?? 0)}
                                            onChange={e => handleChange('position', e.target.value, axis)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-1 text-[10px] font-mono"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] text-slate-400 pl-1 uppercase tracking-tight font-bold">Rotation (rad)</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['x', 'y', 'z'].map(axis => (
                                    <div key={axis} className="space-y-1">
                                        <label className="text-[9px] text-slate-500 pl-1 uppercase">{axis}</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={Array.isArray(selectedObject.rotation) ? selectedObject.rotation[['x','y','z'].indexOf(axis)] : (selectedObject.rotation?.[axis] ?? 0)}
                                            onChange={e => handleChange('rotation', e.target.value, axis)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-1 text-[10px] font-mono"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] text-slate-400 pl-1 uppercase tracking-tight font-bold">Scale</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['x', 'y', 'z'].map(axis => (
                                    <div key={axis} className="space-y-1">
                                        <label className="text-[9px] text-slate-500 pl-1 uppercase">{axis}</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={Array.isArray(selectedObject.scale) ? selectedObject.scale[['x','y','z'].indexOf(axis)] : (selectedObject.scale?.[axis] ?? 1)}
                                            onChange={e => handleChange('scale', e.target.value, axis)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-1 text-[10px] font-mono"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {}
                {!selectedObject.is3D && (
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Maximize size={12} /> Transform
                        </h4>

                        {selectedObject.type === 'rect' && (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">X Pos</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.x)}
                                            onChange={e => handleChange('x', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Y Pos</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.y)}
                                            onChange={e => handleChange('y', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Width</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.width)}
                                            onChange={e => handleChange('width', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Height</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.height)}
                                            onChange={e => handleChange('height', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Rotation (deg)</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.rotation || 0)}
                                            onChange={e => handleChange('rotation', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1 font-bold text-primary">3D Depth</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.depth || 20)}
                                            onChange={e => handleChange('depth', e.target.value)}
                                            className="w-full bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-md px-2 py-1 text-xs text-primary font-bold"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {selectedObject.type === 'path' && (
                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-400 pl-1">Vertices ({selectedObject.points?.length || 0})</label>
                                <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                    {selectedObject.points?.map((pt, i) => (
                                        <div key={i} className="flex gap-1 items-center bg-slate-100 dark:bg-slate-800/50 p-1 rounded">
                                            <span className="text-[9px] text-slate-500 w-3">{i}</span>
                                            <div className="flex-1 grid grid-cols-2 gap-1">
                                                <input
                                                    type="number"
                                                    value={Math.round(pt.x)}
                                                    onChange={e => {
                                                        const newPoints = [...selectedObject.points];
                                                        newPoints[i] = { ...newPoints[i], x: parseFloat(e.target.value) || 0 };
                                                        handleChange('points', newPoints)
                                                    }}
                                                    className="w-full bg-slate-200 dark:bg-slate-900 border-none rounded px-1 py-0.5 text-[10px]"
                                                />
                                                <input
                                                    type="number"
                                                    value={Math.round(pt.y)}
                                                    onChange={e => {
                                                        const newPoints = [...selectedObject.points];
                                                        newPoints[i] = { ...newPoints[i], y: parseFloat(e.target.value) || 0 };
                                                        handleChange('points', newPoints)
                                                    }}
                                                    className="w-full bg-slate-200 dark:bg-slate-900 border-none rounded px-1 py-0.5 text-[10px]"
                                                />
                                            </div>
                                            {selectedObject.points.length > 2 && (
                                                <button
                                                    onClick={() => {
                                                        const newPoints = selectedObject.points.filter((_, index) => index !== i);
                                                        handleChange('points', newPoints)
                                                    }}
                                                    className="text-slate-400 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 size={10} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-1 mt-2">
                                    <label className="text-[10px] text-slate-400 pl-1 font-bold text-primary">3D Depth</label>
                                    <input
                                        type="number"
                                        value={Math.round(selectedObject.depth || 20)}
                                        onChange={e => handleChange('depth', e.target.value)}
                                        className="w-full bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-md px-2 py-1 text-xs text-primary font-bold"
                                    />
                                </div>
                            </div>
                        )}

                        {selectedObject.type === 'circle' && (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Center X</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.cx)}
                                            onChange={e => handleChange('cx', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Center Y</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.cy)}
                                            onChange={e => handleChange('cy', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Radius</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.r)}
                                            onChange={e => handleChange('r', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1 font-bold text-primary">3D Depth</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.depth || 20)}
                                            onChange={e => handleChange('depth', e.target.value)}
                                            className="w-full bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-md px-2 py-1 text-xs text-primary font-bold"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {selectedObject.type === 'ruler' && (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">X1</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.x1)}
                                            onChange={e => handleChange('x1', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Y1</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.y1)}
                                            onChange={e => handleChange('y1', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">X2</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.x2)}
                                            onChange={e => handleChange('x2', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Y2</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.y2)}
                                            onChange={e => handleChange('y2', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {selectedObject.type === 'polygon' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Radius</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.r)}
                                            onChange={e => handleChange('r', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Sides</label>
                                        <input
                                            type="number"
                                            value={selectedObject.sides}
                                            onChange={e => handleChange('sides', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-400 pl-1 font-bold text-primary">3D Depth</label>
                                    <input
                                        type="number"
                                        value={Math.round(selectedObject.depth || 0)}
                                        onChange={e => handleChange('depth', e.target.value)}
                                        className="w-full bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-md px-2 py-1 text-xs text-primary font-bold"
                                    />
                                </div>
                            </div>
                        )}

                        {selectedObject.type === 'arc' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Radius</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.radius)}
                                            onChange={e => handleChange('radius', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1 font-bold text-primary">3D Depth</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.depth || 0)}
                                            onChange={e => handleChange('depth', e.target.value)}
                                            className="w-full bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-md px-2 py-1 text-xs text-primary font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {}
                {selectedObject.is3D && (
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Settings size={12} /> Parameters
                        </h4>

                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(selectedObject.params || {}).map(([key, val]) => (
                                <div key={key} className="space-y-1">
                                    <label className="text-[10px] text-slate-400 pl-1 capitalize">{key}</label>
                                    <input
                                        type="number"
                                        value={val}
                                        onChange={e => handleChange('params', { [key]: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs font-mono"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Palette size={12} /> Appearance
                    </h4>

                    <div className="space-y-3 pt-1">
                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 pl-1">Material</label>
                            <select
                                value={selectedObject.material || 'custom'}
                                onChange={e => {
                                    const mat = e.target.value;
                                    handleChange('material', mat);
                                    if (mat !== 'custom') {
                                        const props = MATERIALS[mat];
                                        if (selectedObject.is3D) {
                                            handleChange('color', props.color);
                                            handleChange('roughness', props.roughness);
                                            handleChange('metalness', props.metalness);
                                        } else {
                                            handleChange('stroke', props.color);
                                        }
                                        handleChange('friction', props.friction);
                                        handleChange('restitution', props.restitution);
                                    }
                                }}
                                className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300 cursor-pointer mb-2"
                            >
                                {Object.entries(MATERIALS).map(([key, m]) => (
                                    <option key={key} value={key}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={selectedObject.is3D ? (selectedObject.color || '#ffffff') : (selectedObject.stroke || '#ffffff')}
                                onChange={e => {
                                    handleChange('material', 'custom');
                                    handleChange(selectedObject.is3D ? 'color' : 'stroke', e.target.value);
                                }}
                                className="size-6 p-0 border-0 rounded overflow-hidden cursor-pointer"
                            />
                            <label className="text-xs text-slate-300">{selectedObject.is3D ? 'Base Color' : 'Stroke Color'}</label>
                        </div>

                        {selectedObject.is3D && (
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[9px] text-slate-500 pl-1">Roughness</label>
                                    <input
                                        type="range" min="0" max="1" step="0.01"
                                        value={selectedObject.roughness || 0.5}
                                        onChange={e => handleChange('roughness', e.target.value)}
                                        className="w-full accent-primary h-1 bg-slate-700 rounded-full appearance-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] text-slate-500 pl-1">Metalness</label>
                                    <input
                                        type="range" min="0" max="1" step="0.01"
                                        value={selectedObject.metalness || 0.1}
                                        onChange={e => handleChange('metalness', e.target.value)}
                                        className="w-full accent-primary h-1 bg-slate-700 rounded-full appearance-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Activity size={12} /> Physics
                    </h4>

                    <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={selectedObject.isStatic || false}
                                onChange={e => handleChange('isStatic', e.target.checked)}
                                className="size-3 cursor-pointer"
                            />
                            <label className="text-xs text-slate-300">Is Static (Floor/Wall)</label>
                        </div>

                        {!selectedObject.isStatic && (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Mass (kg)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={selectedObject.mass !== undefined ? selectedObject.mass : 1.0}
                                            onChange={e => handleChange('mass', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Friction</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={selectedObject.friction !== undefined ? selectedObject.friction : 0.3}
                                            onChange={e => handleChange('friction', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-400 pl-1">Restitution (Bounciness)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={selectedObject.restitution !== undefined ? selectedObject.restitution : 0.5}
                                        onChange={e => handleChange('restitution', e.target.value)}
                                        className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Link size={12} /> Joints & Constraints
                    </h4>

                    <div className="space-y-2 pt-1 p-3 bg-slate-800/30 rounded-xl border border-slate-700/40">
                        {}
                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 pl-1">Constraint Type</label>
                            <select
                                value={jointType}
                                onChange={e => setJointType(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300 cursor-pointer"
                            >
                                <option value="distance">Distance Joint (Rod)</option>
                                <option value="fixed">Fixed Anchor (Pin to World)</option>
                            </select>
                        </div>

                        {}
                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 pl-1">Body A</label>
                            <select
                                value={jointTargetA}
                                onChange={e => setJointTargetA(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300 cursor-pointer"
                            >
                                <option value="">-- Select Object --</option>
                                {[...objects, ...shapes3D].map(o => (
                                    <option key={o.id} value={o.id}>{o.type || 'object'} ({String(o.id).substring(0, 6)}…)</option>
                                ))}
                            </select>
                        </div>

                        {jointType === 'distance' && (
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 pl-1">Body B</label>
                                <select
                                    value={jointTargetB}
                                    onChange={e => setJointTargetB(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300 cursor-pointer"
                                >
                                    <option value="">-- Select Object --</option>
                                    {[...objects, ...shapes3D].filter(o => String(o.id) !== String(jointTargetA)).map(o => (
                                        <option key={o.id} value={o.id}>{o.type || 'object'} ({String(o.id).substring(0, 6)}…)</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {jointType === 'distance' && (
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 pl-1">Target Distance</label>
                                <input
                                    type="number"
                                    value={jointDistance}
                                    onChange={e => setJointDistance(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs"
                                />
                            </div>
                        )}

                        <button
                            onClick={handleAddJoint}
                            disabled={!jointTargetA || (jointType === 'distance' && !jointTargetB)}
                            className="w-full flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/40 text-primary text-xs font-bold py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <Plus size={12} /> Add Constraint
                        </button>
                    </div>

                    {constraints.length > 0 && (
                        <div className="space-y-1">
                            {constraints.map(c => (
                                <div key={c.id} className="flex items-center justify-between bg-slate-800/50 px-2 py-1.5 rounded-lg text-[10px] font-mono border border-slate-700/30">
                                    <div className="flex flex-col">
                                        <span className="text-primary font-bold">{c.type}</span>
                                        <span className="text-slate-400">{String(c.targetA || '').substring(0, 6)} ↔ {c.targetB ? String(c.targetB).substring(0, 6) : '⚓ world'}</span>
                                    </div>
                                    <button
                                        onClick={() => setConstraints((constraints || []).filter(x => x.id !== c.id))}
                                        className="text-red-400 hover:text-red-300 transition-colors p-1"
                                    >
                                        <Trash2 size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </aside>
    )
}
