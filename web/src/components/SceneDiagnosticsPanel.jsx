// Scene validation UI (master spec §4.6 / §16 / §25).
//
// Diagnostics were previously invisible: validation either threw, or wrote a
// console.warn nobody reads, or silently dropped the entity. This panel is the
// surface that makes them actionable — every row names the offending entity and
// selects it on click, so "your scene is invalid" always answers "which part?".
//
// Reads `sceneDiagnostics`, published by importSceneJSON and
// validateCurrentScene. This component never validates on its own and never
// mutates the scene.

import { useMemo } from 'react';
import { AlertTriangle, AlertOctagon, Info, CheckCircle2, X, ShieldCheck } from 'lucide-react';
import useStore from '../store/useStore';
import { Severity, sortBySeverity } from '../scene/diagnostics';

const SEVERITY_STYLE = {
    [Severity.FATAL]: {
        Icon: AlertOctagon,
        row: 'border-red-500/40 bg-red-500/10 hover:bg-red-500/20',
        text: 'text-red-300',
        label: 'Fatal'
    },
    [Severity.ERROR]: {
        Icon: AlertOctagon,
        row: 'border-red-500/30 bg-red-500/5 hover:bg-red-500/15',
        text: 'text-red-400',
        label: 'Error'
    },
    [Severity.WARNING]: {
        Icon: AlertTriangle,
        row: 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15',
        text: 'text-amber-400',
        label: 'Warning'
    },
    [Severity.INFO]: {
        Icon: Info,
        row: 'border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/15',
        text: 'text-sky-400',
        label: 'Info'
    }
};

function styleFor(severity) {
    return SEVERITY_STYLE[severity] || SEVERITY_STYLE[Severity.INFO];
}

export default function SceneDiagnosticsPanel({ onClose }) {
    const diagnostics = useStore((s) => s.sceneDiagnostics);
    const clearSceneDiagnostics = useStore((s) => s.clearSceneDiagnostics);
    const validateCurrentScene = useStore((s) => s.validateCurrentScene);

    const sorted = useMemo(() => sortBySeverity(diagnostics || []), [diagnostics]);

    const counts = useMemo(() => {
        const c = { fatal: 0, error: 0, warning: 0, info: 0 };
        for (const d of diagnostics || []) {
            if (d.severity === Severity.FATAL) c.fatal++;
            else if (d.severity === Severity.ERROR) c.error++;
            else if (d.severity === Severity.WARNING) c.warning++;
            else c.info++;
        }
        return c;
    }, [diagnostics]);

    const blocking = counts.fatal + counts.error;

    /** Select the entity a diagnostic points at so the user can go fix it. */
    const locate = (d) => {
        const id = d.objectId;
        if (!id) return;
        const st = useStore.getState();
        if (st.shapes3D.some((s) => s.id === id)) {
            st.setSelected3DIds([id]);
            st.setSelectedIds([]);
        } else if (st.objects.some((o) => o.id === id)) {
            st.setSelectedIds([id]);
            st.setSelected3DIds([]);
        }
    };

    return (
        <div className="flex flex-col h-full bg-black/40 border-l border-white/10 text-slate-300">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={13} className={blocking > 0 ? 'text-red-400' : 'text-emerald-400'} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Scene Validation</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => validateCurrentScene()}
                        className="px-2 py-1 rounded text-[9px] font-bold uppercase bg-white/5 border border-white/10 hover:border-primary/50 hover:text-white transition-all cursor-pointer"
                        title="Re-validate the current scene"
                    >
                        Validate
                    </button>
                    {sorted.length > 0 && (
                        <button
                            onClick={clearSceneDiagnostics}
                            className="px-2 py-1 rounded text-[9px] font-bold uppercase bg-white/5 border border-white/10 hover:border-primary/50 hover:text-white transition-all cursor-pointer"
                            title="Clear diagnostics"
                        >
                            Clear
                        </button>
                    )}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1 rounded hover:bg-white/10 cursor-pointer"
                            title="Close"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            {sorted.length > 0 && (
                <div className="flex items-center gap-3 px-3 py-1.5 border-b border-white/5 text-[9px] font-mono shrink-0">
                    {counts.fatal > 0 && <span className="text-red-300">{counts.fatal} fatal</span>}
                    {counts.error > 0 && <span className="text-red-400">{counts.error} error</span>}
                    {counts.warning > 0 && <span className="text-amber-400">{counts.warning} warning</span>}
                    {counts.info > 0 && <span className="text-sky-400">{counts.info} info</span>}
                    <span className="ml-auto text-slate-500">
                        {blocking > 0 ? 'simulation blocked' : 'simulation allowed'}
                    </span>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {sorted.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500">
                        <CheckCircle2 size={20} className="text-emerald-500/60" />
                        <span className="text-[10px]">No diagnostics.</span>
                        <span className="text-[9px] text-slate-600">Run Validate to check the scene.</span>
                    </div>
                )}

                {sorted.map((d) => {
                    const { Icon, row, text, label } = styleFor(d.severity);
                    const clickable = !!d.objectId;
                    return (
                        <div
                            key={d.id}
                            onClick={() => locate(d)}
                            className={`rounded border px-2 py-1.5 transition-colors ${row} ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
                            title={clickable ? 'Click to select the affected object' : undefined}
                        >
                            <div className="flex items-start gap-2">
                                <Icon size={11} className={`${text} mt-0.5 shrink-0`} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-[8px] font-bold uppercase tracking-wide ${text}`}>{label}</span>
                                        <span className="text-[8px] font-mono text-slate-500 truncate">{d.code}</span>
                                    </div>
                                    <p className="text-[10px] leading-snug text-slate-300 break-words">{d.message}</p>
                                    {(d.objectId || d.constraintId || d.path) && (
                                        <p className="text-[8px] font-mono text-slate-500 mt-0.5 truncate">
                                            {d.objectId && <span>obj:{d.objectId} </span>}
                                            {d.constraintId && <span>con:{d.constraintId} </span>}
                                            {d.path && <span>{d.path}</span>}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {blocking > 0 && (
                <div className="px-3 py-2 border-t border-red-500/20 bg-red-500/5 shrink-0">
                    <p className="text-[9px] text-red-300/80 leading-snug">
                        {blocking} blocking {blocking === 1 ? 'problem' : 'problems'} must be resolved before this
                        scene can be simulated or exported.
                    </p>
                </div>
            )}
        </div>
    );
}
