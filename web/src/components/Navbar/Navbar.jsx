import useStore from '../../store/useStore'

export default function Navbar() {
    const activeWorkspace = useStore((s) => s.activeWorkspace)

    return (
        <header className="flex items-center justify-between h-10 px-4 border-b shrink-0"
            style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}>

            <div className="flex items-center gap-3">
                <span className="text-sm font-bold tracking-widest"
                    style={{ color: 'var(--color-accent)' }}>
                    REALIS
                </span>
                <span className="text-[10px] tracking-wider"
                    style={{ color: 'var(--color-border-strong)' }}>
                    |
                </span>
                <NavMenu label="File" />
                <NavMenu label="Edit" />
                <NavMenu label="View" />
                <NavMenu label="Help" />
            </div>

            <div className="flex items-center gap-2">
                <NavButton label="Save" accent />
                <NavButton label="Export" />
                <NavButton label="Settings" />
            </div>
        </header>
    )
}

function NavMenu({ label }) {
    return (
        <button
            className="px-2 py-0.5 text-[11px] font-medium transition-colors duration-150 cursor-pointer rounded"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-text-primary)'
                e.currentTarget.style.backgroundColor = 'var(--color-bg-panel-hover)'
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-text-muted)'
                e.currentTarget.style.backgroundColor = 'transparent'
            }}>
            {label}
        </button>
    )
}

function NavButton({ label, accent }) {
    return (
        <button
            className="px-2.5 py-1 rounded text-[10px] font-semibold transition-colors duration-150 cursor-pointer"
            style={{
                backgroundColor: accent ? 'var(--color-accent)' : 'var(--color-bg-base)',
                color: accent ? '#fff' : 'var(--color-text-muted)',
                border: `1px solid ${accent ? 'var(--color-accent)' : 'var(--color-border)'}`,
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = accent
                    ? 'var(--color-accent-hover)'
                    : 'var(--color-bg-panel-hover)'
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = accent
                    ? 'var(--color-accent)'
                    : 'var(--color-bg-base)'
            }}>
            {label}
        </button>
    )
}
