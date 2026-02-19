import useStore from '../../store/useStore'

const WORKSPACES = [
    { id: 'design', label: 'Design', shortcut: '1', icon: DesignIcon },
    { id: 'simulate', label: 'Simulate', shortcut: '2', icon: SimulateIcon },
    { id: 'analyze', label: 'Analyze', shortcut: '3', icon: AnalyzeIcon },
    { id: 'verify', label: 'Verify', shortcut: '4', icon: VerifyIcon },
    { id: 'ai', label: 'AI', shortcut: '5', icon: AIIcon },
]

export default function WorkspaceSwitcher() {
    const activeWorkspace = useStore((s) => s.activeWorkspace)
    const setActiveWorkspace = useStore((s) => s.setActiveWorkspace)

    return (
        <div
            className="flex items-center border-b shrink-0"
            style={{
                height: '44px',
                backgroundColor: 'var(--color-bg-ws-bar)',
                borderColor: 'var(--color-border)',
            }}>

            <div className="flex items-center h-full ml-auto mr-auto">
                {WORKSPACES.map(({ id, label, shortcut, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveWorkspace(id)}
                        title={`${label}  (Ctrl+${shortcut})`}
                        className={`ws-item${activeWorkspace === id ? ' active' : ''}`}>
                        <Icon />
                        <span
                            className="text-[10px] font-semibold tracking-widest uppercase leading-none"
                            style={{ letterSpacing: '0.1em' }}>
                            {label}
                        </span>
                    </button>
                ))}
            </div>

            <div
                className="ml-auto pr-4 text-[10px] tracking-wider"
                style={{ color: 'var(--color-text-muted)' }}>
                Ctrl + 1–5
            </div>
        </div>
    )
}

function DesignIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.1" />
            <rect x="8" y="1" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.1" />
            <rect x="1" y="8" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.1" />
            <rect x="8" y="8" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.1" />
        </svg>
    )
}

function SimulateIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <polygon points="3,2 12,7 3,12" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" fill="none" />
        </svg>
    )
}

function AnalyzeIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <polyline points="1,11 4,7 7,9 10,4 13,6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function VerifyIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <polyline points="2,7 5.5,11 12,3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function AIIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.1" />
            <line x1="7" y1="1" x2="7" y2="3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
            <line x1="7" y1="11" x2="7" y2="13" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
            <line x1="1" y1="7" x2="3" y2="7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
            <line x1="11" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
    )
}
