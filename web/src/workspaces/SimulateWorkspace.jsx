import useStore from '../store/useStore'
import SceneCanvas from '../components/Canvas/SceneCanvas'

export default function SimulateWorkspace() {
    const simulationState = useStore((s) => s.simulationState)
    const setSimulationState = useStore((s) => s.setSimulationState)
    const simTime = useStore((s) => s.simTime)
    const fps = useStore((s) => s.fps)

    return (
        <main className="flex-1 relative overflow-hidden"
            style={{ backgroundColor: 'var(--color-bg-base)' }}>
            <SceneCanvas />

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
                style={{ color: 'var(--color-text-muted)', opacity: 0.8 }}>
                t = {simTime.toFixed(3)}s · {fps} FPS · RK4
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
