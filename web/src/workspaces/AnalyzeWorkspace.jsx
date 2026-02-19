import EnergyChart from '../components/Charts/EnergyChart'

export default function AnalyzeWorkspace() {
    return (
        <main className="flex-1 relative overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--color-bg-base)' }}>

            <div className="flex items-center px-4 h-8 shrink-0 border-b"
                style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}>
                <TabButton label="Energy" active />
                <TabButton label="Momentum" />
                <TabButton label="Phase Space" />
                <TabButton label="Custom" />
            </div>

            <div className="flex-1 relative p-4">
                <EnergyChart />
            </div>
        </main>
    )
}

function TabButton({ label, active }) {
    return (
        <button
            className="px-3 h-full text-[10px] font-medium transition-colors duration-150 cursor-pointer border-b-2"
            style={{
                color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                borderColor: active ? 'var(--color-accent)' : 'transparent',
            }}>
            {label}
        </button>
    )
}
