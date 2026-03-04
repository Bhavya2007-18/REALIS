import { MousePointer2, Move, RefreshCw, Square, Ruler, PencilRuler, Video, Grid, Plus, Minus, SkipBack, Play, SkipForward, Cpu } from 'lucide-react'

export default function DesignWorkspace() {
    return (
        <div className="w-full h-full relative grid-bg flex items-center justify-center overflow-hidden">
            {/* Floating Toolbar */}
            <div className="absolute top-4 left-4 z-10 flex gap-2 glass p-1.5 rounded-xl shadow-2xl">
                <button className="p-2 text-white bg-primary rounded-lg transition-colors">
                    <MousePointer2 size={18} />
                </button>
                <button className="p-2 text-slate-300 hover:bg-primary/40 rounded-lg transition-colors">
                    <Move size={18} />
                </button>
                <button className="p-2 text-slate-300 hover:bg-primary/40 rounded-lg transition-colors">
                    <RefreshCw size={18} />
                </button>
                <div className="w-[1px] bg-slate-700/50 mx-1"></div>
                <button className="p-2 text-slate-300 hover:bg-primary/40 rounded-lg transition-colors">
                    <Square size={18} />
                </button>
                <button className="p-2 text-slate-300 hover:bg-primary/40 rounded-lg transition-colors">
                    <Ruler size={18} />
                </button>
                <button className="p-2 text-slate-300 hover:bg-primary/40 rounded-lg transition-colors">
                    <PencilRuler size={18} />
                </button>
            </div>

            {/* Viewport Controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <div className="glass p-1.5 rounded-xl flex flex-col gap-1">
                    <button className="p-2 text-slate-300 hover:text-white"><Video size={18} /></button>
                    <button className="p-2 text-slate-300 hover:text-white"><Grid size={18} /></button>
                </div>
                <div className="glass p-1.5 rounded-xl flex flex-col gap-1">
                    <button className="p-2 text-slate-300 hover:text-white"><Plus size={18} /></button>
                    <button className="p-2 text-slate-300 hover:text-white"><Minus size={18} /></button>
                </div>
            </div>

            {/* Center 3D Representation */}
            <div className="relative w-96 h-96 flex items-center justify-center">
                <div className="absolute inset-0 border-2 border-primary/20 rounded-full animate-pulse" />
                <div className="w-64 h-64 border border-primary/40 rotate-45 flex items-center justify-center">
                    <div className="w-48 h-48 bg-primary/10 border-2 border-primary flex items-center justify-center rounded-xl glass shadow-[0_0_50px_rgba(37,106,244,0.3)]">
                        <Cpu size={64} className="text-primary" />
                    </div>
                </div>

                {/* Axis Indicator */}
                <div className="absolute bottom-10 left-10 flex flex-col text-[10px] font-mono text-slate-500 gap-1">
                    <div className="flex items-center gap-2"><span className="w-4 h-[2px] bg-red-500"></span> X-AXIS</div>
                    <div className="flex items-center gap-2"><span className="w-4 h-[2px] bg-green-500"></span> Y-AXIS</div>
                    <div className="flex items-center gap-2"><span className="w-4 h-[2px] bg-primary"></span> Z-AXIS</div>
                </div>
            </div>

            {/* Bottom Simulation Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass px-6 py-3 rounded-2xl flex items-center gap-6 shadow-2xl">
                <div className="flex items-center gap-4">
                    <button className="p-2 text-slate-400 hover:text-white"><SkipBack size={18} /></button>
                    <button className="size-10 bg-primary hover:bg-primary/80 text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/40 transition-all">
                        <Play size={20} fill="currentColor" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-white"><SkipForward size={18} /></button>
                </div>
                <div className="h-8 w-[1px] bg-slate-700/50"></div>
                <div className="flex flex-col min-w-40">
                    <div className="flex justify-between text-[10px] mb-1 font-mono text-slate-500">
                        <span>TIMELINE</span>
                        <span>04:12 / 12:00</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full w-[35%]" />
                    </div>
                </div>
            </div>
        </div>
    )
}
