import useStore from '../../store/useStore'

const SIM_STATES = ['idle', 'running', 'paused']

export default function PropertiesPanel() {
    const simulationState = useStore((s) => s.simulationState)
    const setSimulationState = useStore((s) => s.setSimulationState)
    const selectedObject = useStore((s) => s.selectedObject)

    return (
        <aside className="flex flex-col flex-shrink-0 border-l overflow-y-auto"
            style={{
                width: '300px',
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-panel)',
            }}>

            <PanelSection title="Object Properties">
                <InputField label="Name" placeholder={selectedObject ?? 'None selected'} disabled={!selectedObject} />
                <InputField label="Mass (kg)" placeholder="—" disabled />
                <InputField label="Position" placeholder="x: 0  y: 0  z: 0" disabled />
                <InputField label="Velocity" placeholder="vx: 0  vy: 0  vz: 0" disabled />
            </PanelSection>

            <PanelSection title="Simulation Controls">
                <div className="flex gap-2">
                    {SIM_STATES.map((s) => (
                        <button
                            key={s}
                            onClick={() => setSimulationState(s)}
                            className="flex-1 py-1.5 rounded text-xs font-medium capitalize transition-colors duration-150 cursor-pointer"
                            style={{
                                backgroundColor: simulationState === s ? 'var(--color-accent)' : 'var(--color-bg-panel-hover)',
                                color: simulationState === s ? '#fff' : 'var(--color-text-muted)',
                                border: `1px solid ${simulationState === s ? 'var(--color-accent)' : 'var(--color-border)'}`,
                            }}>
                            {s}
                        </button>
                    ))}
                </div>
                <InputField label="Timestep (s)" placeholder="0.016" />
                <InputField label="Gravity (m/s²)" placeholder="9.81" />
            </PanelSection>

            <PanelSection title="Advanced Settings">
                <InputField label="Solver" placeholder="RK4" />
                <InputField label="Iterations" placeholder="16" />
                <InputField label="Damping" placeholder="0.001" />
            </PanelSection>
        </aside>
    )
}

function PanelSection({ title, children }) {
    return (
        <div className="border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-xs font-semibold uppercase tracking-widest"
                    style={{ color: 'var(--color-text-muted)' }}>
                    {title}
                </span>
            </div>
            <div className="px-4 py-3 flex flex-col gap-3">
                {children}
            </div>
        </div>
    )
}

function InputField({ label, placeholder, disabled }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
            <input
                type="text"
                placeholder={placeholder}
                disabled={disabled}
                className="w-full px-2.5 py-1.5 rounded text-xs outline-none transition-colors duration-150"
                style={{
                    backgroundColor: 'var(--color-bg-base)',
                    border: `1px solid var(--color-border)`,
                    color: disabled ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--color-accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
        </div>
    )
}
