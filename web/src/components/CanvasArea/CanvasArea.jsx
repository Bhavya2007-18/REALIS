export default function CanvasArea() {
    return (
        <main className="flex-1 relative overflow-hidden canvas-grid flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 select-none pointer-events-none"
                style={{ color: 'var(--color-text-muted)' }}>
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                    <rect x="1" y="1" width="34" height="34" rx="4" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 3" />
                    <circle cx="18" cy="18" r="4" stroke="currentColor" strokeWidth="1.2" />
                    <line x1="18" y1="8" x2="18" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    <line x1="18" y1="26" x2="18" y2="28" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    <line x1="8" y1="18" x2="10" y2="18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    <line x1="26" y1="18" x2="28" y2="18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span className="text-xs tracking-wider">Canvas — Phase 2</span>
            </div>
        </main>
    )
}
