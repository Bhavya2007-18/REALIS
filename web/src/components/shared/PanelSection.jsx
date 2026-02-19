export default function PanelSection({ title, children }) {
    return (
        <div className="border-b" style={{ borderColor: 'var(--color-border)' }}>
            <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-[10px] font-semibold uppercase tracking-widest"
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
