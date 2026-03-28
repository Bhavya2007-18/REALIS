import Navbar from '../components/Navbar'
import ActivityBar from '../components/ActivityBar'
import Sidebar from '../components/Sidebar'
import AIChatBot from '../components/AIChatBot'
import BottomBar from '../components/BottomBar'
import WorkspaceRenderer from '../workspaces/WorkspaceRenderer'
import PropertiesPanel from '../components/PropertiesPanel'
import useStore from '../store/useStore'
import modelLoader from '../services/modelLoader'
import ashwinsWorkplace from '../models/ashwinsWorkplace'
import { useEffect } from 'react'

export default function AppLayout() {
    const isRightPanelOpen = useStore((s) => s.isRightPanelOpen)
    const rightPanelView = useStore((s) => s.rightPanelView)
    const isAIPanelOpen = useStore((s) => s.isAIPanelOpen)
    const toggleAIPanel = useStore((s) => s.toggleAIPanel)
    const undo = useStore((s) => s.undo)
    const redo = useStore((s) => s.redo)

    // Load default model on mount
    useEffect(() => {
        modelLoader.loadModel(ashwinsWorkplace);
    }, []);

    // Global keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) redo();
                    else undo();
                } else if (e.key === 'y') {
                    e.preventDefault();
                    redo();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    return (
        <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 overflow-hidden font-display">
            <Navbar />
            <main className="flex-1 flex overflow-hidden">
                <ActivityBar />
                <Sidebar />
                <div className="flex-1 relative bg-[#0a0f1a]">
                    <WorkspaceRenderer />
                </div>
                {isRightPanelOpen && rightPanelView === 'properties' && <PropertiesPanel />}
                
                {/* Floating AI Panel Overlay */}
                {isAIPanelOpen && (
                    <div className="absolute right-4 bottom-20 z-50 shadow-2xl rounded-2xl overflow-hidden border border-white/10 h-[600px] max-h-[80vh] flex flex-col slide-in-panel">
                        <AIChatBot />
                    </div>
                )}
            </main>
            <BottomBar />
        </div>
    )
}
