import Navbar from '../components/Navbar'
import ActivityBar from '../components/ActivityBar'
import Sidebar from '../components/Sidebar'
import AIChatBot from '../components/AIChatBot'
import BottomBar from '../components/BottomBar'
import WorkspaceRenderer from '../workspaces/WorkspaceRenderer'
import AIImportPanel from '../components/AIImportPanel'
import PropertiesPanel from '../components/PropertiesPanel'
import SceneDiagnosticsPanel from '../components/SceneDiagnosticsPanel'
import SketchImportPanel from '../components/SketchImportPanel'
import SketchPreviewOverlay from '../components/SketchPreviewOverlay'
import EnergyMonitor from '../components/EnergyMonitor'
import useStore from '../store/useStore'
import { useEffect } from 'react'

export default function AppLayout() {
    const isRightPanelOpen = useStore((s) => s.isRightPanelOpen)
    const rightPanelView = useStore((s) => s.rightPanelView)
    const setRightPanelView = useStore((s) => s.setRightPanelView)
    const isAIPanelOpen = useStore((s) => s.isAIPanelOpen)
    const toggleAIPanel = useStore((s) => s.toggleAIPanel)

    // ── Editor shortcuts (one owner) ─────────────────────────────────────
    // All entity-lifecycle shortcuts live here, not per-workspace, because the
    // store actions they call are workspace-agnostic and a second listener would
    // fire them twice. Every one of them delegates to a store action — the
    // shortcut is a trigger, never a second implementation (§1.3).
    //
    // Actions are read from getState() inside the handler rather than
    // subscribed, so the listener is registered once and never re-bound as the
    // scene changes.
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Never steal keys from a text field: Ctrl+A/C/V in an input must
            // select/copy/paste text, not the scene.
            const el = document.activeElement
            const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
            const st = useStore.getState()

            if (e.ctrlKey || e.metaKey) {
                if (typing) return
                switch (e.key.toLowerCase()) {
                    case 'z':
                        e.preventDefault()
                        if (e.shiftKey) st.redo(); else st.undo()
                        return
                    case 'y':
                        e.preventDefault(); st.redo(); return
                    case 'a':
                        e.preventDefault(); st.selectAll(); return
                    case 'c':
                        e.preventDefault(); st.copySelection(); return
                    case 'v':
                        e.preventDefault(); st.pasteClipboard(); return
                    case 'd':
                        // Browsers bind Ctrl+D to "bookmark"; duplicating the
                        // selection is what it means in an editor.
                        e.preventDefault(); st.duplicateObjects(); return
                    case 'h':
                        e.preventDefault()
                        for (const id of [...st.selectedIds, ...st.selected3DIds]) st.toggleVisibility(id)
                        return
                    default:
                        return
                }
            }

            if (e.key === 'Escape' && !typing) {
                // Escape clears the selection. The Design workspace also cancels
                // the in-progress tool on Escape; both are wanted, and neither
                // consumes the event.
                if (st.selectedIds.length || st.selected3DIds.length) st.deselectAll()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    return (
        <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 overflow-hidden font-display">
            <Navbar />
            <main className="flex-1 flex overflow-hidden">
                <ActivityBar />
                <Sidebar />
                {/* min-w-0 is load-bearing, not cosmetic. A `flex-1` item defaults
                    to min-width:auto, so it will not shrink below the intrinsic
                    width of its content — and the 3D canvas reports a large one.
                    Without this the viewport refused to yield, pushed the w-80
                    properties panel past the right edge of the window, and main's
                    overflow-hidden clipped it: every label in the panel was cut
                    mid-word. min-w-0 lets the canvas absorb the remaining space
                    instead of dictating it. */}
                <div className="flex-1 min-w-0 relative bg-[#0a0f1a]">
                    <WorkspaceRenderer />
                    <SketchPreviewOverlay />
                    <EnergyMonitor />
                </div>
                {isRightPanelOpen && rightPanelView === 'properties' && <PropertiesPanel />}
                {isRightPanelOpen && rightPanelView === 'diagnostics' && (
                    <div className="w-72 shrink-0">
                        <SceneDiagnosticsPanel onClose={() => setRightPanelView('properties')} />
                    </div>
                )}
                
                {}
                <SketchImportPanel />
                
                {}
                {isAIPanelOpen && (
                    <div className="absolute right-4 bottom-20 z-50 shadow-2xl rounded-2xl overflow-hidden border border-white/10 h-[600px] max-h-[80vh] flex flex-col slide-in-panel">
                        <AIChatBot toggleAIPanel={toggleAIPanel} />
                    </div>
                )}
                <AIImportPanel />
            </main>
            <BottomBar />
        </div>
    )
}