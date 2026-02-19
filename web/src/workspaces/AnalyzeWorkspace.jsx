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

            <div className="flex-1 relative canvas-grid flex items-center justify-center">
                <div className="workspace-placeholder">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ opacity: 0.4 }}>
                        <polyline points="2,34 10,22 18,28 27,12 38,18" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[11px] tracking-widest uppercase">Analysis Viewport</span>
                    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)', opacity: 0.4 }}>
                        Run a simulation to generate datasets
                    </span>
                </div>
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
