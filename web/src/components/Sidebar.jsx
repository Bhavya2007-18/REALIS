import { ChevronDown, MoreHorizontal, Maximize2 } from 'lucide-react'
import useStore from '../store/useStore'
import useResizable from '../hooks/useResizable'
import ObjectHierarchy from './ObjectHierarchy'
import LayerPanel from './LayerPanel'
import modelLoader from '../services/modelLoader'
import engineModel from '../models/engineModel'
import pendulumModel from '../models/pendulumModel'
import projectileModel from '../models/projectileModel'
import componentLibrary from '../models/componentLibrary'
import { Box, Play, Trash2, Layers } from 'lucide-react'

export default function Sidebar() {
    const isSidebarOpen = useStore((s) => s.isSidebarOpen)
    const sidebarView = useStore((s) => s.sidebarView)
    const addShape3D = useStore((s) => s.addShape3D)
    const { size, onMouseDown } = useResizable({ initial: 260, min: 170, max: 600, direction: 'right' })

    if (!isSidebarOpen) return null

    return (
        <aside
            className="relative flex flex-col shrink-0 bg-slate-50 dark:bg-[#0d1117] border-r border-slate-200 dark:border-slate-800"
            style={{ width: `${size}px` }}
        >
            {/* Sidebar Header */}
            <div className="px-4 py-2.5 flex justify-between items-center bg-slate-100 dark:bg-[#0d1117] shrink-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {sidebarView === 'explorer' ? 'Explorer' : sidebarView.toUpperCase()}
                </span>
                <button className="text-slate-500 hover:text-slate-300 transition-colors">
                    <MoreHorizontal size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Explorer Sections */}
                {sidebarView === 'explorer' && (
                    <>
                        {/* Open Editors Section (Placeholder) */}
                        <div className="border-b border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-1 px-1 py-1 bg-slate-200 dark:bg-slate-800/30 cursor-pointer group">
                                <ChevronDown size={14} className="text-slate-400" />
                                <span className="text-[11px] font-bold uppercase text-slate-500">Open Editors</span>
                            </div>
                            <div className="px-4 py-2 text-[11px] text-slate-600 dark:text-slate-400 italic">
                                No files open
                            </div>
                        </div>

                        {/* Project Folder Section */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex items-center gap-1 px-1 py-1 bg-slate-200 dark:bg-slate-800/30 cursor-pointer group">
                                <ChevronDown size={14} className="text-slate-400" />
                                <span className="text-[11px] font-bold uppercase text-slate-500">Object Hierarchy</span>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <ObjectHierarchy />
                            </div>
                        </div>

                        {/* Layers Section */}
                        <div className="flex flex-col overflow-hidden border-t border-slate-800" style={{ minHeight: '140px', maxHeight: '200px' }}>
                            <div className="flex items-center gap-1 px-1 py-1 bg-slate-200 dark:bg-slate-800/30">
                                <ChevronDown size={14} className="text-slate-400" />
                                <span className="text-[11px] font-bold uppercase text-slate-500">Layers</span>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <LayerPanel />
                            </div>
                        </div>

                        {/* Models Section */}
                        <div className="flex flex-col overflow-hidden border-t border-slate-200 dark:border-slate-800" style={{ minHeight: '180px' }}>
                            <div className="flex items-center gap-1 px-1 py-1 bg-slate-200 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800/50">
                                <ChevronDown size={14} className="text-slate-400" />
                                <span className="text-[11px] font-bold uppercase text-slate-500">Demo Models</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                {[engineModel, pendulumModel, projectileModel].map((m) => (
                                    <div
                                        key={m.name}
                                        onClick={() => modelLoader.loadModel(m)}
                                        className="group flex flex-col p-2.5 rounded-lg border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer relative overflow-hidden"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors flex items-center gap-2">
                                                <Box size={12} className="text-slate-400 group-hover:text-primary" />
                                                {m.name}
                                            </span>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                                                {m.complexity}
                                            </span>
                                        </div>
                                        <p className="text-[9px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed">
                                            {m.description}
                                        </p>
                                        
                                        {/* Hover decoration */}
                                        <div className="absolute right-[-4px] bottom-[-4px] opacity-0 group-hover:opacity-10 transition-opacity">
                                            <Play size={32} fill="currentColor" className="text-primary" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Component Library Section */}
                        <div className="flex flex-col overflow-hidden border-t border-slate-200 dark:border-slate-800" style={{ minHeight: '180px' }}>
                            <div className="flex items-center gap-1 px-1 py-1 bg-slate-200 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800/50">
                                <ChevronDown size={14} className="text-slate-400" />
                                <span className="text-[11px] font-bold uppercase text-slate-500">Component Library</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                {componentLibrary.map((comp) => (
                                    <div
                                        key={comp.id}
                                        onClick={() => {
                                            useStore.setState({ is3DMode: true });
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
                                        <p className="text-[9px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed">
                                            {comp.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Other views placeholders */}
                {sidebarView !== 'explorer' && (
                    <div className="flex-1 flex items-center justify-center p-8 text-center">
                        <div className="flex flex-col items-center gap-4 text-slate-500">
                            <Maximize2 size={48} strokeWidth={1} />
                            <p className="text-sm">This view is currently under development.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* GPU Load Indicator (Stitch carry-over) */}
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

            {/* Resize Handle */}
            <div
                className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors z-10"
                onMouseDown={onMouseDown}
            />
        </aside>
    )
}
