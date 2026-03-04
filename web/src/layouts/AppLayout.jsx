import Navbar from '../components/Navbar'
import ActivityBar from '../components/ActivityBar'
import Sidebar from '../components/Sidebar'
import AIChatBot from '../components/AIChatBot'
import BottomBar from '../components/BottomBar'
import WorkspaceRenderer from '../workspaces/WorkspaceRenderer'

export default function AppLayout() {
    return (
        <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 overflow-hidden font-display">
            <Navbar />
            <main className="flex-1 flex overflow-hidden">
                <ActivityBar />
                <Sidebar />
                <div className="flex-1 relative bg-[#0a0f1a]">
                    <WorkspaceRenderer />
                </div>
                <AIChatBot />
            </main>
            <BottomBar />
        </div>
    )
}
