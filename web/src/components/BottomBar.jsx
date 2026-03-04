import React from 'react'
import { Home, Edit3, Boxes, ShieldCheck, AlertTriangle, Layers } from 'lucide-react'
import useStore from '../store/useStore'

const TABS = [
    { id: 'realis', label: 'REALIS', icon: Home },
    { id: 'design', label: 'Design', icon: Edit3 },
    { id: 'simulate', label: 'Simulation', icon: Boxes },
    { id: 'verify', label: 'Verification', icon: ShieldCheck },
    { id: 'limit', label: 'Limitation', icon: AlertTriangle },
    { id: 'material', label: 'Material Related', icon: Layers },
]

export default function BottomBar() {
    const activeWorkspace = useStore((s) => s.activeWorkspace)
    const setActiveWorkspace = useStore((s) => s.setActiveWorkspace)
    const fps = useStore((s) => s.fps)
    const simTime = useStore((s) => s.simTime)

    return (
        <footer className="h-14 bg-white dark:bg-background-dark border-t border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between z-50 shrink-0">
            <div className="flex h-full">
                {TABS.map(({ id, label, icon: Icon }) => { // eslint-disable-line no-unused-vars
                    const isActive = activeWorkspace === id
                    return (
                        <button
                            key={id}
                            onClick={() => setActiveWorkspace(id)}
                            className={`flex items-center gap-2 px-6 h-full border-b-2 text-sm font-medium transition-all cursor-pointer
                ${isActive
                                    ? 'border-primary bg-primary/10 text-primary font-bold tracking-tight'
                                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <Icon size={16} />
                            {label}
                        </button>
                    )
                })}
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                    <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE SYNC ACTIVE
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                    {fps} FPS | t={simTime.toFixed(2)}s
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                    MM | KG | SEC
                </div>
            </div>
        </footer>
    )
}
