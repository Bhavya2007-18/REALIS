import { useState } from 'react'

export default function SidebarSection({ title, children }) {
    const [open, setOpen] = useState(true)

    return (
        <div className="border-b" style={{ borderColor: 'var(--color-border)' }}>
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center justify-between w-full px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors duration-150 cursor-pointer"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-panel-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                <span>{title}</span>
                <Chevron open={open} />
            </button>

            <div className={`sidebar-section-content ${open ? 'open' : ''}`}>
                <div className="px-4 pb-3 flex flex-col gap-1">
                    {children}
                </div>
            </div>
        </div>
    )
}

function Chevron({ open }) {
    return (
        <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style={{
                transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
                transition: 'transform 0.2s ease',
                color: 'var(--color-text-muted)',
            }}>
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}
