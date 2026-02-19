import { useState } from 'react'
import SidebarSection from './SidebarSection'
import useStore from '../../store/useStore'

const WORKSPACE_SECTIONS = {
    design: ['Objects', 'Forces', 'Constraints', 'Materials'],
    simulate: ['Solver', 'Time Control', 'Outputs', 'Monitors'],
    analyze: ['Datasets', 'Plots', 'Filters', 'Export'],
    verify: ['Invariants', 'Conservation', 'Tolerances', 'Reports'],
    ai: ['Prompts', 'Models', 'Scenarios', 'History'],
}

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const activeWorkspace = useStore((s) => s.activeWorkspace)
    const sections = WORKSPACE_SECTIONS[activeWorkspace] ?? WORKSPACE_SECTIONS.design

    return (
        <aside
            className="flex flex-col flex-shrink-0 border-r overflow-hidden transition-all duration-200"
            style={{
                width: collapsed ? '0px' : '240px',
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-panel)',
                minWidth: collapsed ? '0' : '240px',
            }}>

            <div className="flex items-center justify-between px-3 py-2 border-b"
                style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: 'var(--color-text-muted)' }}>
                    {activeWorkspace}
                </span>
                <button
                    onClick={() => setCollapsed(true)}
                    className="p-1 rounded transition-colors duration-150 cursor-pointer"
                    title="Collapse sidebar"
                    style={{ color: 'var(--color-text-muted)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text-primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M8 1L3 6l5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {sections.map((section) => (
                    <SidebarSection key={`${activeWorkspace}-${section}`} title={section}>
                        <SectionPlaceholder />
                    </SidebarSection>
                ))}
            </div>

            {collapsed && (
                <button
                    onClick={() => setCollapsed(false)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-r"
                    style={{
                        backgroundColor: 'var(--color-bg-panel)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
                    }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M3 1l5 4-5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            )}
        </aside>
    )
}

function SectionPlaceholder() {
    return (
        <>
            {[0, 1, 2].map((i) => (
                <div key={i} className="h-6 rounded flex items-center px-2 text-[11px] transition-colors duration-150 cursor-pointer"
                    style={{ color: 'var(--color-text-muted)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-bg-panel-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    <span className="w-1.5 h-1.5 rounded-full mr-2 flex-shrink-0"
                        style={{ backgroundColor: 'var(--color-border-strong)' }} />
                    Item {i + 1}
                </div>
            ))}
        </>
    )
}
