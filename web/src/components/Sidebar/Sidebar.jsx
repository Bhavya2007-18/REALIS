import { useState } from 'react'
import SidebarSection from './SidebarSection'

const SECTIONS = ['Objects', 'Forces', 'Environment', 'Presets']

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)

    return (
        <aside
            className="flex flex-col flex-shrink-0 border-r overflow-hidden transition-all duration-250"
            style={{
                width: collapsed ? '0px' : '250px',
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-panel)',
                minWidth: collapsed ? '0' : '250px',
            }}>

            <div className="flex items-center justify-between px-4 py-2 border-b"
                style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-xs font-semibold uppercase tracking-widest"
                    style={{ color: 'var(--color-text-muted)' }}>
                    Explorer
                </span>
                <button
                    onClick={() => setCollapsed(true)}
                    className="p-1 rounded transition-colors duration-150 cursor-pointer"
                    title="Collapse sidebar"
                    style={{ color: 'var(--color-text-muted)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {SECTIONS.map((section) => (
                    <SidebarSection key={section} title={section}>
                        <SectionPlaceholder />
                    </SidebarSection>
                ))}
            </div>

            {collapsed && (
                <button
                    onClick={() => setCollapsed(false)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-r"
                    style={{ backgroundColor: 'var(--color-bg-panel)', border: `1px solid var(--color-border)`, color: 'var(--color-text-muted)' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M4 2l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            )}
        </aside>
    )
}

function SectionPlaceholder() {
    return (
        <>
            {['—', '—', '—'].map((_, i) => (
                <div key={i} className="h-7 rounded flex items-center px-2 text-xs transition-colors duration-150 cursor-pointer"
                    style={{ color: 'var(--color-text-muted)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-panel-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                        style={{ backgroundColor: 'var(--color-border)' }} />
                    Item {i + 1}
                </div>
            ))}
        </>
    )
}
