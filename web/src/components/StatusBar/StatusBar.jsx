import useStore from '../../store/useStore'

const STATUS_COLORS = {
    idle: 'var(--color-text-muted)',
    running: '#22c55e',
    paused: '#eab308',
}

export default function StatusBar() {
    const activeWorkspace = useStore((s) => s.activeWorkspace)
    const simulationState = useStore((s) => s.simulationState)
    const simTime = useStore((s) => s.simTime)
    const fps = useStore((s) => s.fps)

    return (
        <footer
            className="flex items-center justify-between px-4 shrink-0 border-t"
            style={{
                height: '24px',
                backgroundColor: 'var(--color-bg-ws-bar)',
                borderColor: 'var(--color-border)',
            }}>

            <div className="flex items-center gap-4">
                <StatusIndicator label={simulationState} color={STATUS_COLORS[simulationState]} />
                <span className="text-[10px] uppercase tracking-widest"
                    style={{ color: 'var(--color-text-muted)' }}>
                    {activeWorkspace}
                </span>
            </div>

            <div className="flex items-center gap-4">
                <span className="text-[10px] tabular-nums"
                    style={{ color: 'var(--color-text-muted)' }}>
                    {fps} FPS
                </span>
                <span className="text-[10px] tabular-nums"
                    style={{ color: 'var(--color-text-muted)' }}>
                    t = {simTime.toFixed(3)}s
                </span>
                <span className="text-[10px]"
                    style={{ color: 'var(--color-border-strong)' }}>
                    REALIS v0.1
                </span>
            </div>
        </footer>
    )
}

function StatusIndicator({ label, color }) {
    return (
        <div className="flex items-center gap-1.5">
            <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: color }}
            />
            <span className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color }}>
                {label}
            </span>
        </div>
    )
}
