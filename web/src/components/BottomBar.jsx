import React from 'react'
import { Home, Edit3, Boxes, ShieldCheck, AlertTriangle, Layers, Activity, AlertOctagon } from 'lucide-react'
import useStore from '../store/useStore'
import { Severity } from '../scene/diagnostics'

const TABS = [
    { id: 'realis', label: 'REALIS', icon: Home },
    { id: 'design', label: 'Design', icon: Edit3 },
    { id: 'simulate', label: 'Simulation', icon: Boxes },
    { id: 'analyze', label: 'Analyze', icon: Activity },
    { id: 'test', label: 'Test Workplace', icon: Layers },
    { id: 'verify', label: 'Verification', icon: ShieldCheck },
    { id: 'limit', label: 'Limitation', icon: AlertTriangle },
    { id: 'material', label: 'Material Related', icon: Layers },
]

export default function BottomBar() {
    const activeWorkspace = useStore((s) => s.activeWorkspace)
    const setActiveWorkspace = useStore((s) => s.setActiveWorkspace)
    const fps = useStore((s) => s.fps)
    const simTime = useStore((s) => s.simTime)
    const sceneDiagnostics = useStore((s) => s.sceneDiagnostics)

    // Validation state has to be visible from anywhere, or the diagnostics panel
    // is a surface nobody ever opens (§1.4: failures must be reported, not just
    // recorded). Clicking runs validation and reveals the detail.
    const blocking = (sceneDiagnostics || []).filter(
        (d) => d.severity === Severity.ERROR || d.severity === Severity.FATAL
    ).length
    const warnings = (sceneDiagnostics || []).filter((d) => d.severity === Severity.WARNING).length

    const openDiagnostics = () => {
        const st = useStore.getState()
        st.validateCurrentScene()
        st.setRightPanelView('diagnostics')
        if (!st.isRightPanelOpen) st.toggleRightPanel()
    }

    return (
        <footer className="h-14 bg-white dark:bg-background-dark border-t border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between z-50 shrink-0">
            <div className="flex h-full">
                {TABS.map(({ id, label, icon: Icon }) => { 
                    const isActive = activeWorkspace === id
                    return (
                        <button
                            key={id}
                            onClick={() => {
                                if (id === 'simulate') {
                                    const st = useStore.getState();
                                    st.resetPlayback();
                                    st.setSimulationFrames([]);
                                    st.setSimulationState({ time: 0 });
                                }
                                setActiveWorkspace(id);
                            }}
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
                <button
                    onClick={openDiagnostics}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded font-mono text-[10px] transition-colors cursor-pointer
                        ${blocking > 0
                            ? 'text-red-400 hover:bg-red-500/10'
                            : warnings > 0
                                ? 'text-amber-400 hover:bg-amber-500/10'
                                : 'text-slate-500 hover:bg-slate-500/10'}`}
                    title="Validate scene and show diagnostics"
                >
                    {blocking > 0 ? <AlertOctagon size={12} /> : warnings > 0 ? <AlertTriangle size={12} /> : <ShieldCheck size={12} />}
                    {blocking > 0
                        ? `${blocking} ERROR${blocking === 1 ? '' : 'S'}`
                        : warnings > 0
                            ? `${warnings} WARNING${warnings === 1 ? '' : 'S'}`
                            : 'VALIDATE'}
                </button>
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