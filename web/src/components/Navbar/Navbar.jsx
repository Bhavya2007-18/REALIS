import { useState, useEffect, useRef } from 'react'
import useStore from '../../store/useStore'

const MENUS = {
    File: [
        { label: 'New Scene', shortcut: 'Ctrl+N' },
        { label: 'Open…', shortcut: 'Ctrl+O' },
        'separator',
        { label: 'Save', shortcut: 'Ctrl+S' },
        { label: 'Save As…', shortcut: 'Ctrl+Shift+S' },
        'separator',
        { label: 'Export…', shortcut: 'Ctrl+E' },
    ],
    Edit: [
        { label: 'Undo', shortcut: 'Ctrl+Z' },
        { label: 'Redo', shortcut: 'Ctrl+Shift+Z' },
        'separator',
        { label: 'Cut', shortcut: 'Ctrl+X' },
        { label: 'Copy', shortcut: 'Ctrl+C' },
        { label: 'Paste', shortcut: 'Ctrl+V' },
        'separator',
        { label: 'Preferences…' },
    ],
    View: [
        { label: 'Toggle Sidebar' },
        { label: 'Toggle Properties' },
        'separator',
        { label: 'Zoom In', shortcut: 'Ctrl+=' },
        { label: 'Zoom Out', shortcut: 'Ctrl+-' },
        { label: 'Reset Zoom', shortcut: 'Ctrl+0' },
    ],
    Help: [
        { label: 'Documentation' },
        { label: 'Keyboard Shortcuts' },
        'separator',
        { label: 'About REALIS' },
    ],
}

export default function Navbar({ onOpenPalette }) {
    const [openMenu, setOpenMenu] = useState(null)
    const navRef = useRef(null)

    useEffect(() => {
        function handleClick(e) {
            if (navRef.current && !navRef.current.contains(e.target)) {
                setOpenMenu(null)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    return (
        <header
            ref={navRef}
            className="flex items-center justify-between h-10 px-4 border-b shrink-0"
            style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}>

            <div className="flex items-center gap-3">
                <span className="text-sm font-bold tracking-widest"
                    style={{ color: 'var(--color-accent)' }}>
                    REALIS
                </span>
                <span className="text-[10px]" style={{ color: 'var(--color-border-strong)' }}>|</span>

                {Object.entries(MENUS).map(([label, items]) => (
                    <div key={label} className="relative">
                        <button
                            onClick={() => setOpenMenu(openMenu === label ? null : label)}
                            onMouseEnter={() => openMenu && setOpenMenu(label)}
                            className="px-2 py-0.5 text-[11px] font-medium transition-colors duration-100 cursor-pointer rounded"
                            style={{
                                color: openMenu === label ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                                backgroundColor: openMenu === label ? 'var(--color-bg-panel-hover)' : 'transparent',
                            }}>
                            {label}
                        </button>

                        {openMenu === label && (
                            <div className="dropdown-menu">
                                {items.map((item, i) =>
                                    item === 'separator'
                                        ? <div key={i} className="dropdown-separator" />
                                        : (
                                            <button
                                                key={item.label}
                                                className="dropdown-item"
                                                onClick={() => setOpenMenu(null)}>
                                                <span>{item.label}</span>
                                                {item.shortcut && (
                                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>
                                                        {item.shortcut}
                                                    </span>
                                                )}
                                            </button>
                                        )
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={onOpenPalette}
                    className="px-2.5 py-1 rounded text-[10px] font-medium transition-colors duration-150 cursor-pointer flex items-center gap-1.5"
                    style={{
                        backgroundColor: 'var(--color-bg-base)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-muted)',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border-strong)'
                        e.currentTarget.style.color = 'var(--color-text-primary)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)'
                        e.currentTarget.style.color = 'var(--color-text-muted)'
                    }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <circle cx="4" cy="4" r="3" stroke="currentColor" strokeWidth="1.1" />
                        <line x1="6.1" y1="6.1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                    </svg>
                    Command
                    <span style={{ color: 'var(--color-border-strong)', fontSize: '9px' }}>Ctrl+K</span>
                </button>
                <NavButton label="Save" accent />
                <NavButton label="Export" />
            </div>
        </header>
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
