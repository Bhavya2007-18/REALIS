import { useState, useEffect, useRef } from 'react'
import useStore from '../../store/useStore'

const COMMANDS = [
    { label: 'Switch to Design', action: 'workspace', value: 'design', hint: 'Ctrl+1' },
    { label: 'Switch to Simulate', action: 'workspace', value: 'simulate', hint: 'Ctrl+2' },
    { label: 'Switch to Analyze', action: 'workspace', value: 'analyze', hint: 'Ctrl+3' },
    { label: 'Switch to Verify', action: 'workspace', value: 'verify', hint: 'Ctrl+4' },
    { label: 'Switch to AI', action: 'workspace', value: 'ai', hint: 'Ctrl+5' },
    { label: 'Start Simulation', action: 'sim', value: 'running' },
    { label: 'Pause Simulation', action: 'sim', value: 'paused' },
    { label: 'Stop Simulation', action: 'sim', value: 'idle' },
]

export default function CommandPalette({ open, onClose }) {
    const [query, setQuery] = useState('')
    const [selected, setSelected] = useState(0)
    const inputRef = useRef(null)
    const setActiveWorkspace = useStore((s) => s.setActiveWorkspace)
    const setSimulationState = useStore((s) => s.setSimulationState)

    const filtered = query
        ? COMMANDS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
        : COMMANDS

    useEffect(() => {
        if (open) {
            setQuery('')
            setSelected(0)
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [open])

    function execute(cmd) {
        if (cmd.action === 'workspace') setActiveWorkspace(cmd.value)
        if (cmd.action === 'sim') setSimulationState(cmd.value)
        onClose()
    }

    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            onClose()
        } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelected((s) => Math.min(s + 1, filtered.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelected((s) => Math.max(s - 1, 0))
        } else if (e.key === 'Enter' && filtered[selected]) {
            execute(filtered[selected])
        }
    }

    if (!open) return null

    return (
        <div className="palette-overlay" onClick={onClose}>
            <div className="palette-box" onClick={(e) => e.stopPropagation()}>
                <input
                    ref={inputRef}
                    className="palette-input"
                    placeholder="Type a command…"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setSelected(0) }}
                    onKeyDown={handleKeyDown}
                />
                <div className="py-1" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                    {filtered.map((cmd, i) => (
                        <button
                            key={cmd.label}
                            className={`palette-result${i === selected ? ' selected' : ''}`}
                            onClick={() => execute(cmd)}
                            onMouseEnter={() => setSelected(i)}>
                            <span>{cmd.label}</span>
                            {cmd.hint && <span className="palette-result-hint">{cmd.hint}</span>}
                        </button>
                    ))}
                    {filtered.length === 0 && (
                        <div className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            No matching commands
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
