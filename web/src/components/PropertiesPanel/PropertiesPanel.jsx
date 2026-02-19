import useStore from '../../store/useStore'
import useResizable from '../../hooks/useResizable'
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
    const { size, onMouseDown } = useResizable({ initial: 280, min: 200, max: 420, direction: 'left' })

    return (
        <aside className="relative flex flex-col shrink-0 border-l overflow-y-auto"
            style={{
                width: `${size}px`,
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-panel)',
            }}>
            <div className="resize-handle resize-handle-left" onMouseDown={onMouseDown} />
            <Panel />
        </aside>
    )
}

function DesignPanel() {
    const selectedId = useStore((s) => s.selectedObject)
    const obj = useStore((s) => s.sceneObjects.find((o) => o.id === s.selectedObject) ?? null)
    const updateObject = useStore((s) => s.updateObject)

    if (!obj) {
        return (
            <PanelSection title="Object Properties">
                <div className="text-[11px] py-3 text-center" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>
                    Select an object to edit
                </div>
            </PanelSection>
        )
    }

    function update(key, raw) {
        const num = parseFloat(raw)
        updateObject(obj.id, { [key]: isNaN(num) ? raw : num })
    }

    return (
        <>
            <PanelSection title={`${obj.type} – ${obj.name}`}>
                <InputField label="Name" value={obj.name} onChange={(v) => updateObject(obj.id, { name: v })} />
                <InputField label="Type" value={obj.type} disabled />
            </PanelSection>

            <PanelSection title="Transform">
                <div className="flex gap-2">
                    <InputField label="X" value={obj.x} onChange={(v) => update('x', v)} />
                    <InputField label="Y" value={obj.y} onChange={(v) => update('y', v)} />
                </div>
            </PanelSection>

            <PanelSection title="Physics">
                <InputField label="Mass (kg)" value={obj.mass} onChange={(v) => update('mass', v)} />
                <div className="flex gap-2">
                    <InputField label="Vx" value={obj.vx} onChange={(v) => update('vx', v)} />
                    <InputField label="Vy" value={obj.vy} onChange={(v) => update('vy', v)} />
                </div>
                <InputField label="Restitution" value={obj.restitution} onChange={(v) => update('restitution', v)} />
                <InputField label="Friction" value={obj.friction} onChange={(v) => update('friction', v)} />
            </PanelSection>

            <PanelSection title="Appearance">
                <InputField label="Color" value={obj.color} onChange={(v) => updateObject(obj.id, { color: v })} />
                {obj.radius !== undefined && (
                    <InputField label="Radius" value={obj.radius} onChange={(v) => update('radius', v)} />
                )}
                {obj.width !== undefined && (
                    <>
                        <InputField label="Width" value={obj.width} onChange={(v) => update('width', v)} />
                        <InputField label="Height" value={obj.height} onChange={(v) => update('height', v)} />
                    </>
                )}
            </PanelSection>

            <PanelSection title="Flags">
                <label className="flex items-center gap-2 text-[11px] cursor-pointer"
                    style={{ color: 'var(--color-text-muted)' }}>
                    <input
                        type="checkbox"
                        checked={obj.fixed}
                        onChange={(e) => updateObject(obj.id, { fixed: e.target.checked })}
                        className="accent-[var(--color-accent)]"
                    />
                    Fixed position
                </label>
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
