import { useState } from 'react'
import { ChevronDown, ChevronRight, MoreHorizontal, Maximize2, Beaker, Play, Wrench, Layers, Box, Trash2 } from 'lucide-react'
import useStore from '../store/useStore'
import useResizable from '../hooks/useResizable'
import ObjectHierarchy from './ObjectHierarchy'
import LayerPanel from './LayerPanel'
import componentLibrary from '../models/componentLibrary'
import { SimulationDemoManager } from '../utils/SimulationDemoManager'

// Labs that use the 3D Viewport directly (need loadDemo to hydrate shapes3D)
const THREE_D_LABS = new Set(['v6_engine_simulation', 'revolute_crank_slider', 'crank_slider'])

// Standalone physics labs (no DesignWorkspace scene needed)
const PHYSICS_LABS = [
    { id: 'v6_engine_simulation', name: 'V6 Engine', icon: Beaker, accent: '#ef4444' },
    { id: 'revolute_crank_slider', name: 'Crank-Slider', icon: Beaker, accent: '#ec4899' },
    { id: 'free_fall', name: 'Free Fall', icon: Beaker, accent: '#38bdf8' },
    { id: 'projectile_motion', name: 'Projectile Motion', icon: Beaker, accent: '#f59e0b' },
    { id: 'single_pendulum', name: 'Single Pendulum', icon: Beaker, accent: '#34d399' },
    { id: 'double_pendulum', name: 'Double Pendulum', icon: Beaker, accent: '#a78bfa' },
    { id: 'spring_oscillator', name: 'Spring Oscillator', icon: Beaker, accent: '#fbbf24' },
    { id: 'orbital_mechanics', name: 'Orbital Mechanics', icon: Beaker, accent: '#22d3ee' },
    { id: 'inclined_friction_ramp', name: 'Inclined Friction Ramp', icon: Beaker, accent: '#fb7185' },
]

export default function Sidebar() {
    const isSidebarOpen = useStore((s) => s.isSidebarOpen)
    const sidebarView = useStore((s) => s.sidebarView)
    const clearDesign = useStore((s) => s.clearDesign)
    const addShape3D = useStore((s) => s.addShape3D)
    const { size, onMouseDown } = useResizable({ initial: 260, min: 170, max: 600, direction: 'right' })

    const [expanded, setExpanded] = useState({
        editors: false,
        hierarchy: true,
        layers: true,
        library: true,
        labs: true
    })

    const toggleSection = (section) => {
        setExpanded(prev => ({ ...prev, [section]: !prev[section] }))
    }

    if (!isSidebarOpen) return null

    return (
        <aside
            className="relative flex flex-col shrink-0 bg-slate-50 dark:bg-[#0d1117] border-r border-slate-200 dark:border-slate-800"
            style={{ width: `${size}px` }}
        >
            {}
            <div className="px-4 py-2.5 flex justify-between items-center bg-slate-100 dark:bg-[#0d1117] shrink-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {sidebarView === 'explorer' ? 'Explorer' : sidebarView.toUpperCase()}
                </span>
                <button className="text-slate-500 hover:text-slate-300 transition-colors">
                    <MoreHorizontal size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                {}
                {sidebarView === 'explorer' && (
                    <>
                        {}
                        <div className="border-b border-slate-200 dark:border-slate-800">
                            <div onClick={() => toggleSection('editors')} className="flex items-center gap-1 px-1 py-1 bg-slate-200 dark:bg-slate-800/30 cursor-pointer group hover:bg-slate-300 dark:hover:bg-slate-800/50">
                                {expanded.editors ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                <span className="text-[11px] font-bold uppercase text-slate-500">Open Editors</span>
                            </div>
                            <div className="px-2 py-1 space-y-0.5">
                                <div
                                    onClick={() => {
                                        clearDesign()
                                        useStore.setState({ demoOverlay: null })
                                    }}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded text-[11px] text-slate-400 hover:text-red-400 cursor-pointer hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
                                >
                                    <Trash2 size={14} className="text-red-400" />
                                    <span className="font-medium">Clean Workspace</span>
                                </div>
                            </div>
                        </div>

                        {}
                        <div className={`flex flex-col border-b border-slate-200 dark:border-slate-800 ${expanded.hierarchy ? 'flex-1 overflow-hidden' : ''}`}>
                            <div onClick={() => toggleSection('hierarchy')} className="flex items-center gap-1 px-1 py-1 bg-slate-200 dark:bg-slate-800/30 cursor-pointer group hover:bg-slate-300 dark:hover:bg-slate-800/50">
                                {expanded.hierarchy ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                <span className="text-[11px] font-bold uppercase text-slate-500">Object Hierarchy</span>
                            </div>
                            {expanded.hierarchy && (
                                <div className="flex-1 overflow-hidden">
                                    <ObjectHierarchy />
                                </div>
                            )}
                        </div>

                        {}
                        <div className={`flex flex-col border-b border-slate-200 dark:border-slate-800 ${expanded.layers ? 'overflow-hidden' : ''}`} style={expanded.layers ? { minHeight: '140px', maxHeight: '200px' } : {}}>
                            <div onClick={() => toggleSection('layers')} className="flex items-center gap-1 px-1 py-1 bg-slate-200 dark:bg-slate-800/30 cursor-pointer group hover:bg-slate-300 dark:hover:bg-slate-800/50">
                                {expanded.layers ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                <span className="text-[11px] font-bold uppercase text-slate-500">Layers</span>
                            </div>
                            {expanded.layers && (
                                <div className="flex-1 overflow-hidden">
                                    <LayerPanel />
                                </div>
                            )}
                        </div>
                        

                        {}
                        <div className={`flex flex-col border-b border-slate-200 dark:border-slate-800 ${expanded.library ? 'overflow-hidden' : ''}`} style={expanded.library ? { minHeight: '180px' } : {}}>
                            <div onClick={() => toggleSection('library')} className="flex items-center gap-1 px-1 py-1 bg-slate-200 dark:bg-slate-800/30 cursor-pointer group hover:bg-slate-300 dark:hover:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800/50">
                                {expanded.library ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                <span className="text-[11px] font-bold uppercase text-slate-500">Component Library</span>
                            </div>
                            {expanded.library && (
                                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                    {componentLibrary.map((comp) => (
                                        <div
                                            key={comp.id}
                                            onClick={() => {
                                                useStore.setState({ is3DView: true });
                                                addShape3D({
                                                    ...comp,
                                                    id: `comp_${Math.random().toString(36).substring(2,7)}`
                                                });
                                            }}
                                            className="group flex flex-col p-2.5 rounded-lg border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer relative overflow-hidden"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors flex items-center gap-2">
                                                    <Layers size={12} className="text-slate-400 group-hover:text-primary" />
                                                    {comp.name}
                                                </span>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium capitalize">
                                                    {comp.material.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Physics Labs — standalone experiments (no scene needed) */}
                        <div className={`flex flex-col border-b border-slate-200 dark:border-slate-800 ${expanded.labs ? 'overflow-hidden' : ''}`} style={expanded.labs ? { minHeight: '160px' } : {}}>
                            <div onClick={() => toggleSection('labs')} className="flex items-center gap-1 px-1 py-1 bg-slate-200 dark:bg-slate-800/30 cursor-pointer group hover:bg-slate-300 dark:hover:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800/50">
                                {expanded.labs ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                <span className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1">
                                    <Wrench size={12} className="text-slate-400" />
                                    Physics Labs
                                </span>
                            </div>
                            {expanded.labs && (
                                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                    {PHYSICS_LABS.map((lab) => {
                                        const Icon = lab.icon
                                        return (
                                            <button
                                                key={lab.id}
                                                onClick={() => {
                                                    const store = useStore.getState()
                                                    store.setActiveWorkspace('simulate')
                                                    // 3D labs need loadDemo to hydrate shapes3D and set is3DView
                                                    if (THREE_D_LABS.has(lab.id)) {
                                                        SimulationDemoManager.loadDemo(lab.id, store)
                                                    } else {
                                                        store.setSimulationPreset(lab.id)
                                                    }
                                                    store.setIsPlaying(true)
                                                }}
                                                className="group w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer relative overflow-hidden text-left"
                                                style={{ borderLeft: `3px solid ${lab.accent}` }}
                                            >
                                                <Icon size={14} className="text-slate-400 group-hover:text-primary transition-colors" style={{ color: lab.accent }} />
                                                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors flex-1">
                                                    {lab.name}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {}
                {sidebarView !== 'explorer' && (
                    <div className="flex-1 flex items-center justify-center p-8 text-center">
                        <div className="flex flex-col items-center gap-4 text-slate-500">
                            <Maximize2 size={48} strokeWidth={1} />
                            <p className="text-sm">This view is currently under development.</p>
                        </div>
                    </div>
                )}
            </div>

            {}
            <div className="p-4 bg-slate-100 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-2">
                        <div className="size-1.5 rounded-full bg-emerald-500" />
                        GPU Cluster
                    </span>
                    <span className="text-[10px] text-primary font-mono">24%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-[24%] shadow-[0_0_8px_rgba(37,106,244,0.5)]" />
                </div>
            </div>

            {}
            <div
                className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors z-10"
                onMouseDown={onMouseDown}
            />
        </aside>
    )
}