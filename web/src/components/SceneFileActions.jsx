import { useRef } from 'react'
import { Download, Upload, ShieldCheck, AlertTriangle } from 'lucide-react'
import useStore from '../store/useStore'
import { Severity, SEVERITY_RANK } from '../scene/diagnostics'

/**
 * Save / Load / Validate for the canonical scene.
 *
 * ONE implementation, used by every workspace. The Simulate toolbar carried the
 * only copy, which meant the Design workspace — where scenes are actually
 * authored — had no way to save at all, and any fix to the import error handling
 * would have had to be made twice.
 *
 * All three actions delegate to store actions (`exportSceneJSON`,
 * `importSceneJSON`, `validateCurrentScene`). This component does no
 * serialization and no validation of its own; it reports outcomes (§1.4) and
 * opens the diagnostics panel when there is something to read.
 */
export default function SceneFileActions({ compact = false }) {
    const exportSceneJSON = useStore((s) => s.exportSceneJSON)
    const diagnostics = useStore((s) => s.sceneDiagnostics)
    const fileRef = useRef(null)

    const blocking = (diagnostics || []).filter(
        (d) => SEVERITY_RANK[d.severity] >= SEVERITY_RANK[Severity.ERROR]
    ).length
    const warnings = (diagnostics || []).filter((d) => d.severity === Severity.WARNING).length

    const openDiagnostics = () => {
        const st = useStore.getState()
        st.setRightPanelView('diagnostics')
        if (!st.isRightPanelOpen) st.toggleRightPanel()
    }

    const handleSave = () => {
        // Validate before writing. Exporting a scene that cannot be simulated is
        // allowed — work in progress is still worth saving — but doing it
        // silently means the problem is discovered later, in another workspace,
        // with no link back to the moment it was introduced.
        const verdict = useStore.getState().validateCurrentScene()
        const json = exportSceneJSON()
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const name = (useStore.getState().scene?.metadata?.name || 'scene')
            .replace(/[^a-z0-9_-]+/gi, '_').toLowerCase()
        a.download = `realis_${name}.json`
        a.click()
        // Revoking frees the blob; without it every save leaks the whole scene.
        URL.revokeObjectURL(url)
        if (!verdict.valid) openDiagnostics()
    }

    const handleLoad = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (evt) => {
            // importSceneJSON applies nothing on failure and returns the reason,
            // so a malformed file cannot clear the user's scene.
            const result = useStore.getState().importSceneJSON(evt.target.result)
            if (!result.ok || result.diagnostics?.length) openDiagnostics()
        }
        reader.onerror = () => {
            console.error(`[SceneFileActions] could not read "${file.name}".`)
            openDiagnostics()
        }
        reader.readAsText(file)
        // Reset so re-picking the same file fires onChange again.
        e.target.value = ''
    }

    const btn = compact
        ? 'flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all cursor-pointer'
        : 'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-black/40 border border-white/10 text-slate-300 hover:text-white hover:border-primary/50 transition-all cursor-pointer'

    return (
        <div className="flex items-center gap-1">
            <button onClick={handleSave} className={btn} title="Validate and export the canonical scene as JSON">
                <Download size={12} /> {compact ? '' : 'Save'}
            </button>

            <button onClick={() => fileRef.current?.click()} className={btn} title="Import a scene JSON (nothing is applied if it fails to validate)">
                <Upload size={12} /> {compact ? '' : 'Load'}
            </button>
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleLoad} />

            <button
                onClick={() => { useStore.getState().validateCurrentScene(); openDiagnostics() }}
                className={`${btn} ${blocking > 0 ? 'text-red-400 hover:text-red-300' : warnings > 0 ? 'text-amber-400 hover:text-amber-300' : ''}`}
                title="Validate the scene and show the diagnostics"
            >
                {blocking > 0 ? <AlertTriangle size={12} /> : <ShieldCheck size={12} />}
                {compact ? '' : 'Validate'}
                {(blocking > 0 || warnings > 0) && (
                    <span className="font-mono">{blocking > 0 ? blocking : warnings}</span>
                )}
            </button>
        </div>
    )
}
