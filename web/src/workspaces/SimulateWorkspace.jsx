import useStore from '../store/useStore'

export default function SimulateWorkspace() {
    const simulationState = useStore((s) => s.simulationState)
    const setSimulationState = useStore((s) => s.setSimulationState)

    return (
        <main className="flex-1 relative overflow-hidden canvas-grid">
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="workspace-placeholder">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ opacity: 0.4 }}>
                        <polygon points="8,4 34,20 8,36" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[11px] tracking-widest uppercase">Simulation Viewport</span>
                    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)', opacity: 0.4 }}>
                        Configure solver and press run
                    </span>
                </div>
            </div>

            <div className="absolute top-3 left-3 flex items-center gap-1.5">
                <TransportButton
                    label="▶"
                    active={simulationState === 'running'}
                    onClick={() => setSimulationState('running')}
                />
                <TransportButton
                    label="❚❚"
                    active={simulationState === 'paused'}
                    onClick={() => setSimulationState('paused')}
                />
                <TransportButton
                    label="■"
                    active={simulationState === 'idle'}
                    onClick={() => setSimulationState('idle')}
                />
            </div>

            <div className="absolute bottom-3 left-3 text-[10px] tabular-nums"
                style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>
                t = 0.000s · dt = 0.016s · RK4
            </div>
        </main>
    )
}

function TransportButton({ label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className="w-7 h-6 flex items-center justify-center rounded text-[10px] transition-colors duration-150 cursor-pointer"
            style={{
                backgroundColor: active ? 'var(--color-accent)' : 'var(--color-bg-panel)',
                border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                color: active ? '#fff' : 'var(--color-text-muted)',
            }}>
            {label}
        </button>
    )
}
