import useStore from '../store/useStore'
import DesignWorkspace from '../workspaces/DesignWorkspace'
import SimulateWorkspace from '../workspaces/SimulateWorkspace'
import AnalyzeWorkspace from '../workspaces/AnalyzeWorkspace'
import VerifyWorkspace from '../workspaces/VerifyWorkspace'
import AIWorkspace from '../workspaces/AIWorkspace'

const WORKSPACE_MAP = {
    design: DesignWorkspace,
    simulate: SimulateWorkspace,
    analyze: AnalyzeWorkspace,
    verify: VerifyWorkspace,
    ai: AIWorkspace,
}

export default function WorkspaceRenderer() {
    const activeWorkspace = useStore((s) => s.activeWorkspace)
    const Workspace = WORKSPACE_MAP[activeWorkspace] ?? DesignWorkspace
    return <Workspace />
}
