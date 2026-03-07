import { Search, Bell, Settings, User, Box, SlidersHorizontal, Sparkles } from 'lucide-react'
import useStore from '../store/useStore'
export default function Navbar() {
    const isRightPanelOpen = useStore(s => s.isRightPanelOpen)
    const toggleRightPanel = useStore(s => s.toggleRightPanel)
    const rightPanelView = useStore(s => s.rightPanelView)
    const setRightPanelView = useStore(s => s.setRightPanelView)

    const handleTogglePanel = (view) => {
        if (!isRightPanelOpen) {
            setRightPanelView(view)
            toggleRightPanel()
        } else if (rightPanelView === view) {
            toggleRightPanel()
        } else {
            setRightPanelView(view)
        }
    }

    return (
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-background-light dark:bg-background-dark px-6 py-3 z-50 shrink-0">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                    <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                        <Box size={20} />
                    </div>
                    <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight">REALIS Engineering</h2>
                </div>
                <div className="hidden md:flex items-center gap-6">
                    <a className="text-slate-600 dark:text-slate-400 text-sm font-medium hover:text-primary transition-colors cursor-pointer">File</a>
                    <a className="text-slate-600 dark:text-slate-400 text-sm font-medium hover:text-primary transition-colors cursor-pointer">Edit</a>
                    <a className="text-slate-600 dark:text-slate-400 text-sm font-medium hover:text-primary transition-colors cursor-pointer">View</a>
                    <a className="text-slate-600 dark:text-slate-400 text-sm font-medium hover:text-primary transition-colors cursor-pointer">Tools</a>
                </div>
            </div>

            <div className="flex-1 max-w-md mx-8">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary placeholder:text-slate-500 outline-none"
                        placeholder="Search components or commands..."
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                    <button
                        onClick={() => handleTogglePanel('properties')}
                        className={`p-1.5 rounded-md transition-colors ${isRightPanelOpen && rightPanelView === 'properties' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        title="Properties Inspector"
                    >
                        <SlidersHorizontal size={18} />
                    </button>
                    <button
                        onClick={() => handleTogglePanel('ai')}
                        className={`p-1.5 rounded-md transition-colors ${isRightPanelOpen && rightPanelView === 'ai' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        title="AI Copilot"
                    >
                        <Sparkles size={18} />
                    </button>
                </div>

                <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1"></div>

                <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <Bell size={20} />
                </button>
                <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <Settings size={20} />
                </button>
                <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2"></div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs font-semibold">Alex Rivera</p>
                        <p className="text-[10px] text-slate-500">Lead Engineer</p>
                    </div>
                    <div className="size-9 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-primary/30">
                        <User size={18} className="text-primary" />
                    </div>
                </div>
            </div>
        </header>
    )
}
