import Navbar from '../components/Navbar/Navbar'
import Sidebar from '../components/Sidebar/Sidebar'
import CanvasArea from '../components/CanvasArea/CanvasArea'
import PropertiesPanel from '../components/PropertiesPanel/PropertiesPanel'

export default function AppLayout() {
    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden"
            style={{ backgroundColor: 'var(--color-bg-base)' }}>
            <Navbar />
            <div className="flex flex-1 overflow-hidden relative">
                <Sidebar />
                <CanvasArea />
                <PropertiesPanel />
            </div>
        </div>
    )
}
