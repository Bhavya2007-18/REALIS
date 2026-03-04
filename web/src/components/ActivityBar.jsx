import React from 'react'
import { Files, Search, GitBranch, Play, Boxes, Settings, User } from 'lucide-react'
import useStore from '../store/useStore'

const ACTIONS = [
    { id: 'explorer', icon: Files, label: 'Explorer' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'git', icon: GitBranch, label: 'Source Control' },
    { id: 'debug', icon: Play, label: 'Run and Debug' },
    { id: 'extensions', icon: Boxes, label: 'Extensions' },
]

export default function ActivityBar() {
    const sidebarView = useStore((s) => s.sidebarView)
    const setSidebarView = useStore((s) => s.setSidebarView)
    const isSidebarOpen = useStore((s) => s.isSidebarOpen)
    const toggleSidebar = useStore((s) => s.toggleSidebar)

    const handleAction = (id) => {
        if (sidebarView === id && isSidebarOpen) {
            toggleSidebar()
        } else {
            setSidebarView(id)
            if (!isSidebarOpen) toggleSidebar()
        }
    }

    return (
        <nav className="w-12 flex flex-col items-center py-4 bg-slate-100 dark:bg-[#0d1117] border-r border-slate-200 dark:border-slate-800 shrink-0 z-50">
            <div className="flex-1 flex flex-col gap-4 w-full items-center">
                {ACTIONS.map(({ id, icon: Icon, label }) => { // eslint-disable-line no-unused-vars
                    const isActive = sidebarView === id && isSidebarOpen
                    return (
                        <button
                            key={id}
                            onClick={() => handleAction(id)}
                            className={`relative p-2 transition-colors group ${isActive ? 'text-primary' : 'text-slate-400 hover:text-slate-100'
                                }`}
                            title={label}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
                            )}
                            <Icon size={24} strokeWidth={1.5} />
                        </button>
                    )
                })}
            </div>

            <div className="flex flex-col gap-4 items-center w-full">
                <button className="p-2 text-slate-400 hover:text-slate-100 transition-colors">
                    <User size={24} strokeWidth={1.5} />
                </button>
                <button className="p-2 text-slate-400 hover:text-slate-100 transition-colors">
                    <Settings size={24} strokeWidth={1.5} />
                </button>
            </div>
        </nav>
    )
}
