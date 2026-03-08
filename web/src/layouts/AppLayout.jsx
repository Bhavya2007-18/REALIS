import Navbar from '../components/Navbar'
import ActivityBar from '../components/ActivityBar'
import Sidebar from '../components/Sidebar'
import AIChatBot from '../components/AIChatBot'
import BottomBar from '../components/BottomBar'
import WorkspaceRenderer from '../workspaces/WorkspaceRenderer'
import PropertiesPanel from '../components/PropertiesPanel'
import useStore from '../store/useStore'
import { useEffect } from 'react'

export default function AppLayout() {
    const isRightPanelOpen = useStore((s) => s.isRightPanelOpen)
    const rightPanelView = useStore((s) => s.rightPanelView)
    const undo = useStore((s) => s.undo)
    const redo = useStore((s) => s.redo)

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
                {isRightPanelOpen && rightPanelView === 'ai' && <AIChatBot />}
                {isRightPanelOpen && rightPanelView === 'properties' && <PropertiesPanel />}
            </main>
            <BottomBar />
        </div>
    )
}
