export default function DesignWorkspace() {
    return (
        <main className="flex-1 relative overflow-hidden canvas-grid">
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="workspace-placeholder">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ opacity: 0.4 }}>
                        <rect x="2" y="2" width="16" height="16" rx="1" stroke="currentColor" strokeWidth="0.8" />
                        <rect x="22" y="2" width="16" height="16" rx="1" stroke="currentColor" strokeWidth="0.8" />
                        <rect x="2" y="22" width="16" height="16" rx="1" stroke="currentColor" strokeWidth="0.8" />
                        <rect x="22" y="22" width="16" height="16" rx="1" stroke="currentColor" strokeWidth="0.8" />
                    </svg>
                    <span className="text-[11px] tracking-widest uppercase">Design Viewport</span>
                    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)', opacity: 0.4 }}>
                        Drop objects onto the canvas to begin
                    </span>
                </div>
            </div>
            <ViewportOverlay />
        </main>
    )
}

function ViewportOverlay() {
    return (
        <>
            <div className="absolute top-3 left-3 flex items-center gap-2">
                <ToolButton icon="M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3z" label="Grid" />
                <ToolButton icon="M2 7h12M7 2v12" label="Axis" />
                <ToolButton icon="M2 2l4 4m0-4L2 6M10 2l4 4m0-4l-4 4" label="Snap" />
            </div>
            <div className="absolute bottom-3 left-3 text-[10px] tabular-nums"
                style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>
                0, 0 · zoom 100%
            </div>
        </>
    )
}

function ToolButton({ icon, label }) {
    return (
        <button
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition-colors duration-150 cursor-pointer"
            title={label}
            style={{
                backgroundColor: 'var(--color-bg-panel)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-panel-hover)'
                e.currentTarget.style.color = 'var(--color-text-primary)'
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-panel)'
                e.currentTarget.style.color = 'var(--color-text-muted)'
            }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d={icon} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {label}
        </button>
    )
}
