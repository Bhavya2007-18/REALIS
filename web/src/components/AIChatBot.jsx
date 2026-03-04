import { Sparkles, Send, FileBarChart } from 'lucide-react'
import useStore from '../store/useStore'

export default function AIChatBot() {
    const isAIPanelOpen = useStore((s) => s.isAIPanelOpen)

    if (!isAIPanelOpen) return null

    return (
        <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-background-light dark:bg-background-dark flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <div className="size-6 bg-primary rounded-md flex items-center justify-center">
                    <Sparkles size={14} className="text-white" />
                </div>
                <h3 className="font-bold text-sm">REALIS - AI</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Message from AI */}
                <div className="flex flex-col gap-2">
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl rounded-tl-none max-w-[90%]">
                        <p className="text-xs leading-relaxed">Hello Alex. I've analyzed the current chassis structural integrity. Would you like to see the stress distribution report for the latest load test?</p>
                    </div>
                    <span className="text-[10px] text-slate-500 ml-1">AI Assistant • 09:42 AM</span>
                </div>

                {/* Message from User */}
                <div className="flex flex-col gap-2 items-end">
                    <div className="bg-primary text-white p-3 rounded-xl rounded-tr-none max-w-[90%] shadow-lg shadow-primary/20">
                        <p className="text-xs leading-relaxed">Yes, please. Focus on the connection points near the control unit mounting.</p>
                    </div>
                    <span className="text-[10px] text-slate-500 mr-1">You • 09:43 AM</span>
                </div>

                {/* Analysis Result */}
                <div className="flex flex-col gap-2">
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl rounded-tl-none max-w-[90%]">
                        <p className="text-xs mb-3">Analysis complete. I've highlighted three potential points of failure under extreme thermal conditions.</p>
                        <div className="bg-white/5 dark:bg-black/20 rounded-lg p-2 flex items-center gap-3 cursor-pointer hover:bg-primary/20 transition-colors border border-white/10">
                            <FileBarChart size={20} className="text-primary" />
                            <div>
                                <p className="text-[10px] font-bold">Thermal_Stress_Map.pdf</p>
                                <p className="text-[8px] text-slate-500">2.4 MB • Simulation Data</p>
                            </div>
                        </div>
                    </div>
                    <span className="text-[10px] text-slate-500 ml-1">AI Assistant • 09:44 AM</span>
                </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex flex-wrap gap-2 mb-3">
                    <button className="px-2 py-1 text-[9px] bg-slate-200 dark:bg-slate-800 rounded-md hover:text-primary transition-colors cursor-pointer">Recalculate Load</button>
                    <button className="px-2 py-1 text-[9px] bg-slate-200 dark:bg-slate-800 rounded-md hover:text-primary transition-colors cursor-pointer">Optimise Weight</button>
                    <button className="px-2 py-1 text-[9px] bg-slate-200 dark:bg-slate-800 rounded-md hover:text-primary transition-colors cursor-pointer">Material Specs</button>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pr-10 py-2.5 pl-3 text-xs focus:ring-1 focus:ring-primary outline-none"
                        placeholder="Ask AI..."
                    />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:scale-110 transition-transform cursor-pointer">
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </aside>
    )
}
