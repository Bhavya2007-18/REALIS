import { Search, Bell, Settings, User, Box, SlidersHorizontal, Sparkles, FileJson, FolderOpen, Save, FilePlus, ChevronDown, Undo2, Redo2, Trash2 } from 'lucide-react'
import useStore from '../store/useStore'
import { useRef, useState } from 'react'
export default function Navbar() {
    const isRightPanelOpen = useStore(s => s.isRightPanelOpen)
    const toggleRightPanel = useStore(s => s.toggleRightPanel)
    const rightPanelView = useStore(s => s.rightPanelView)
    const setRightPanelView = useStore(s => s.setRightPanelView)

    // Store state for serialization
    const objects = useStore(s => s.objects)
    const setObjects = useStore(s => s.setObjects)
    const layers = useStore(s => s.layers)
    const setLayers = useStore(s => s.setLayers)
    const shapes3D = useStore(s => s.shapes3D)
    const setShapes3D = useStore(s => s.setShapes3D)
    const constraints = useStore(s => s.constraints)
    const setConstraints = useStore(s => s.setConstraints)
    const activeLayerId = useStore(s => s.activeLayerId)
    const setActiveLayerId = useStore(s => s.setActiveLayerId)

    const undo = useStore(s => s.undo)
    const redo = useStore(s => s.redo)
    const history = useStore(s => s.history)
    const historyIndex = useStore(s => s.historyIndex)
    const clearDesign = useStore(s => s.clearDesign)

    const fileInputRef = useRef(null)
    const [isFileMenuOpen, setIsFileMenuOpen] = useState(false)

    const handleExport = () => {
        const projectData = {
            version: '1.0',
            app: 'REALIS Engineering',
            timestamp: new Date().toISOString(),
            objects,
            layers,
            shapes3D,
            constraints,
            activeLayerId
        }
        const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `realis_design_${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
        setIsFileMenuOpen(false)
    }

    const handleImport = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result)
                if (data.objects) setObjects(data.objects)
                if (data.layers) setLayers(data.layers)
                if (data.shapes3D) setShapes3D(data.shapes3D)
                if (data.constraints) setConstraints(data.constraints)
                if (data.activeLayerId) setActiveLayerId(data.activeLayerId)
            } catch (err) {
                alert("Invalid REALIS project file.")
            }
        }
        reader.readAsText(file)
        setIsFileMenuOpen(false)
    }

    const handleNew = () => {
        if (confirm("Start a new design? All unsaved changes will be lost.")) {
            clearDesign()
            setIsFileMenuOpen(false)
        }
    }
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
                    <div className="relative">
                        <button
                            onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
                            className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-sm font-medium hover:text-primary transition-colors cursor-pointer"
                        >
                            File <ChevronDown size={12} className={`transition-transform ${isFileMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isFileMenuOpen && (
                            <div className="absolute top-full left-0 mt-2 w-48 glass-panel rounded-xl shadow-2xl py-2 z-[100] border border-white/10">
                                <button onClick={handleNew} className="w-full flex items-center gap-3 px-4 py-2 text-xs text-slate-300 hover:bg-primary/20 hover:text-white transition-colors cursor-pointer">
                                    <FilePlus size={14} className="text-primary" /> New Design
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 px-4 py-2 text-xs text-slate-300 hover:bg-primary/20 hover:text-white transition-colors cursor-pointer">
                                    <FolderOpen size={14} className="text-primary" /> Open...
                                </button>
                                <div className="h-[1px] bg-slate-800 my-1 mx-2"></div>
                                <button onClick={handleExport} className="w-full flex items-center gap-3 px-4 py-2 text-xs text-slate-300 hover:bg-primary/20 hover:text-white transition-colors cursor-pointer">
                                    <Save size={14} className="text-primary" /> Save Project
                                </button>
                                <button className="w-full flex items-center gap-3 px-4 py-2 text-xs text-slate-300 hover:bg-primary/20 hover:text-white transition-colors cursor-pointer opacity-50 cursor-not-allowed">
                                    <FileJson size={14} className="text-primary" /> Export STL/DXF
                                </button>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".json"
                            onChange={handleImport}
                        />
                    </div>
                    <a className="text-slate-600 dark:text-slate-400 text-sm font-medium hover:text-primary transition-colors cursor-pointer">Edit</a>
                    <a className="text-slate-600 dark:text-slate-400 text-sm font-medium hover:text-primary transition-colors cursor-pointer">View</a>
                    <a className="text-slate-600 dark:text-slate-400 text-sm font-medium hover:text-primary transition-colors cursor-pointer">Tools</a>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 ml-4">
                    <button
                        onClick={undo}
                        disabled={historyIndex <= 0 && history.length <= 1}
                        className="p-1.5 rounded-md text-slate-500 hover:text-primary hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo2 size={16} />
                    </button>
                    <button
                        onClick={redo}
                        disabled={historyIndex >= history.length - 1}
                        className="p-1.5 rounded-md text-slate-500 hover:text-primary hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                        title="Redo (Ctrl+Y)"
                    >
                        <Redo2 size={16} />
                    </button>
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
