import { useEffect } from 'react'
import Navbar from '../components/Navbar/Navbar'
import WorkspaceSwitcher from '../components/WorkspaceSwitcher/WorkspaceSwitcher'
import Sidebar from '../components/Sidebar/Sidebar'
import WorkspaceRenderer from '../workspaces/WorkspaceRenderer'
import PropertiesPanel from '../components/PropertiesPanel/PropertiesPanel'
import StatusBar from '../components/StatusBar/StatusBar'
import useStore from '../store/useStore'

const SHORTCUT_MAP = {
    '1': 'design',
    '2': 'simulate',
    '3': 'analyze',
    '4': 'verify',
    '5': 'ai',
}

export default function AppLayout() {
    const setActiveWorkspace = useStore((s) => s.setActiveWorkspace)

    useEffect(() => {
        function handleKeyDown(e) {
            if (e.ctrlKey && SHORTCUT_MAP[e.key]) {
                e.preventDefault()
                setActiveWorkspace(SHORTCUT_MAP[e.key])
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [setActiveWorkspace])

    return (
        <div
            className="flex flex-col h-screen w-screen overflow-hidden"
            style={{ backgroundColor: 'var(--color-bg-base)' }}>
            <Navbar />
            <WorkspaceSwitcher />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <WorkspaceRenderer />
                <PropertiesPanel />
            </div>
            <StatusBar />
        </div>
    )
}
