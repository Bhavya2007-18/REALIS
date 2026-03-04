import { FolderOpen, Box, Package, Cpu, Database, ChevronDown } from 'lucide-react'
import useStore from '../store/useStore'

export default function Sidebar() {
    const isSidebarOpen = useStore((s) => s.isSidebarOpen)

    if (!isSidebarOpen) return null

    return (
        <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-background-dark/50 flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Project Explorer</span>
                <ChevronDown size={14} className="cursor-pointer text-slate-400" />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <div className="flex items-center gap-2 px-3 py-2 text-primary bg-primary/10 rounded-lg cursor-pointer">
                    <FolderOpen size={16} />
                    <span className="text-sm font-medium">REALIS_V1.0</span>
                </div>

                <div className="ml-4 space-y-1">
                    <div className="flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors">
                        <Package size={16} />
                        <span className="text-sm">Main_Assembly</span>
                    </div>
                    <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2 px-3 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer">
                            <Box size={14} />
                            <span className="text-sm">Chassis_Structure</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer">
                            <Cpu size={14} />
                            <span className="text-sm">Control_Unit</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer">
                        <Box size={16} />
                        <span className="text-sm">Sub_Components</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer">
                        <Database size={16} />
                        <span className="text-sm">Materials_DB</span>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-slate-100 dark:bg-slate-900/50">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">GPU Load</span>
                    <span className="text-[10px] text-primary">24%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-[24%]" />
                </div>
            </div>
        </aside>
    )
}
