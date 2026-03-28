import useStore from '../store/useStore'
import DesignWorkspace from './DesignWorkspace'
import SimulateWorkspace from './SimulateWorkspace'
import AnalyzeWorkspace from './AnalyzeWorkspace'
import TestWorkspace from './TestWorkspace'

const WORKSPACE_MAP = {
    design: DesignWorkspace,
    realis: () => <div className="flex items-center justify-center h-full text-slate-500">REALIS Home</div>,
    simulate: SimulateWorkspace,
    analyze: AnalyzeWorkspace,
    test: TestWorkspace,
    verify: () => <div className="flex items-center justify-center h-full text-slate-500">Verification View</div>,
    limit: () => <div className="flex items-center justify-center h-full text-slate-500">Limitations View</div>,
    material: () => <div className="flex items-center justify-center h-full text-slate-500">Material View</div>,
}

export default function WorkspaceRenderer() {
    const activeWorkspace = useStore((s) => s.activeWorkspace)
    const Workspace = WORKSPACE_MAP[activeWorkspace] || DesignWorkspace

    return <Workspace />
}
