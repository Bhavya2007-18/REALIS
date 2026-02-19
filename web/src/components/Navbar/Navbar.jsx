import useStore from '../../store/useStore'

const TABS = ['Command', 'Design', 'Simulate', 'Analyze']

export default function Navbar() {
    const activeTab = useStore((s) => s.activeTab)
    const setActiveTab = useStore((s) => s.setActiveTab)

    return (
        <header className="flex items-center justify-between h-12 px-4 border-b"
            style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}>

            <div className="flex items-center gap-2 min-w-[120px]">
                <span className="text-base font-bold tracking-widest"
                    style={{ color: 'var(--color-accent)' }}>
                    REALIS
                </span>
            </div>

            <nav className="flex items-center h-full gap-1">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 h-full text-sm font-medium transition-colors duration-150 cursor-pointer ${activeTab === tab ? 'tab-active' : 'tab-inactive hover:text-slate-300'}`}>
                        {tab}
                    </button>
                ))}
            </nav>

            <div className="flex items-center gap-2 min-w-[120px] justify-end">
                <NavButton label="Settings" />
                <NavButton label="Save" accent />
                <NavButton label="Export" />
            </div>
        </header>
    )
}

function NavButton({ label, accent }) {
    return (
        <button
            className="px-3 py-1 rounded text-xs font-medium transition-colors duration-150 cursor-pointer"
            style={{
                backgroundColor: accent ? 'var(--color-accent)' : 'var(--color-bg-panel-hover)',
                color: accent ? '#fff' : 'var(--color-text-muted)',
                border: `1px solid ${accent ? 'var(--color-accent)' : 'var(--color-border)'}`,
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = accent
                    ? 'var(--color-accent-hover)'
                    : 'var(--color-border)'
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = accent
                    ? 'var(--color-accent)'
                    : 'var(--color-bg-panel-hover)'
            }}>
            {label}
        </button>
    )
}
