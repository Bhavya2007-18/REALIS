import useStore from '../../store/useStore'
import PanelSection from '../shared/PanelSection'
import InputField from '../shared/InputField'

const SIM_STATES = ['idle', 'running', 'paused']

const WORKSPACE_PANELS = {
    design: DesignPanel,
    simulate: SimulatePanel,
    analyze: AnalyzePanel,
    verify: VerifyPanel,
    ai: AIPanel,
}

export default function PropertiesPanel() {
    const activeWorkspace = useStore((s) => s.activeWorkspace)
    const Panel = WORKSPACE_PANELS[activeWorkspace] ?? DesignPanel

    return (
        <aside className="flex flex-col flex-shrink-0 border-l overflow-y-auto"
            style={{
                width: '280px',
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-panel)',
            }}>
            <Panel />
        </aside>
    )
}

function DesignPanel() {
    const selectedObject = useStore((s) => s.selectedObject)

    return (
        <>
            <PanelSection title="Object Properties">
                <InputField label="Name" placeholder={selectedObject ?? 'None selected'} disabled={!selectedObject} />
                <InputField label="Mass (kg)" placeholder="—" disabled />
                <InputField label="Position" placeholder="x: 0  y: 0  z: 0" disabled />
                <InputField label="Velocity" placeholder="vx: 0  vy: 0  vz: 0" disabled />
            </PanelSection>
            <PanelSection title="Materials">
                <InputField label="Density" placeholder="—" disabled />
                <InputField label="Friction" placeholder="—" disabled />
                <InputField label="Restitution" placeholder="—" disabled />
            </PanelSection>
            <PanelSection title="Constraints">
                <InputField label="Type" placeholder="None" disabled />
            </PanelSection>
        </>
    )
}

function SimulatePanel() {
    const simulationState = useStore((s) => s.simulationState)
    const setSimulationState = useStore((s) => s.setSimulationState)

    return (
        <>
            <PanelSection title="Simulation Controls">
                <div className="flex gap-1.5">
                    {SIM_STATES.map((s) => (
                        <button
                            key={s}
                            onClick={() => setSimulationState(s)}
                            className="flex-1 py-1.5 rounded text-[10px] font-semibold capitalize transition-colors duration-150 cursor-pointer"
                            style={{
                                backgroundColor: simulationState === s ? 'var(--color-accent)' : 'var(--color-bg-base)',
                                color: simulationState === s ? '#fff' : 'var(--color-text-muted)',
                                border: `1px solid ${simulationState === s ? 'var(--color-accent)' : 'var(--color-border)'}`,
                            }}>
                            {s}
                        </button>
                    ))}
                </div>
            </PanelSection>
            <PanelSection title="Solver">
                <InputField label="Integrator" placeholder="RK4" />
                <InputField label="Timestep (s)" placeholder="0.016" />
                <InputField label="Sub-steps" placeholder="1" />
            </PanelSection>
            <PanelSection title="Environment">
                <InputField label="Gravity (m/s²)" placeholder="9.81" />
                <InputField label="Damping" placeholder="0.001" />
            </PanelSection>
        </>
    )
}

function AnalyzePanel() {
    return (
        <>
            <PanelSection title="Data Source">
                <InputField label="Dataset" placeholder="Last simulation" disabled />
                <InputField label="Time Range" placeholder="0 — end" disabled />
            </PanelSection>
            <PanelSection title="Plot Settings">
                <InputField label="X Axis" placeholder="Time (s)" disabled />
                <InputField label="Y Axis" placeholder="Energy (J)" disabled />
                <InputField label="Scale" placeholder="Linear" disabled />
            </PanelSection>
            <PanelSection title="Export">
                <InputField label="Format" placeholder="CSV" disabled />
            </PanelSection>
        </>
    )
}

function VerifyPanel() {
    return (
        <>
            <PanelSection title="Conservation">
                <InputField label="Energy Drift" placeholder="—" disabled />
                <InputField label="Momentum Drift" placeholder="—" disabled />
                <InputField label="Tolerance" placeholder="1e-6" />
            </PanelSection>
            <PanelSection title="Invariant Ledger">
                <InputField label="Last Check" placeholder="—" disabled />
                <InputField label="Status" placeholder="—" disabled />
            </PanelSection>
        </>
    )
}

function AIPanel() {
    return (
        <>
            <PanelSection title="Prompt">
                <InputField label="Task" placeholder="Describe scenario…" />
                <InputField label="Constraints" placeholder="Optional" />
            </PanelSection>
            <PanelSection title="Model">
                <InputField label="Engine" placeholder="Local" disabled />
                <InputField label="Temperature" placeholder="0.7" />
            </PanelSection>
        </>
    )
}
