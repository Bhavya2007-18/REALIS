import { ChevronDown, MoreHorizontal, Maximize2 } from 'lucide-react'
import useStore from '../store/useStore'
import useResizable from '../hooks/useResizable'
import ObjectHierarchy from './ObjectHierarchy'

export default function Sidebar() {
    const isSidebarOpen = useStore((s) => s.isSidebarOpen)
    const sidebarView = useStore((s) => s.sidebarView)
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
