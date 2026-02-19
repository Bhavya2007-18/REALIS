export default function VerifyWorkspace() {
    return (
        <main className="flex-1 relative overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--color-bg-base)' }}>

            <div className="flex items-center px-4 h-8 shrink-0 border-b"
                style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}>
                <span className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: 'var(--color-text-muted)' }}>
                    Invariant Ledger
                </span>
                <span className="ml-auto text-[10px]"
                    style={{ color: 'var(--color-border-strong)' }}>
                    No data
                </span>
            </div>

            <div className="flex-1 relative canvas-grid flex items-center justify-center">
                <div className="workspace-placeholder">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ opacity: 0.4 }}>
                        <polyline points="6,20 15,32 34,8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[11px] tracking-widest uppercase">Verification Viewport</span>
                    <span className="text-[10px]" style={{ color: 'var(--color-text-muted)', opacity: 0.4 }}>
                        Energy conservation · Momentum invariants · Tolerance checks
                    </span>
                </div>
            </div>
        </main>
    )
}
