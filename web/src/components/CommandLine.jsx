import { useState, useRef, useEffect } from 'react'
import { Terminal, ChevronRight } from 'lucide-react'
import useStore from '../store/useStore'

const COMMANDS = [
    'CIRCLE', 'RECT', 'LINE', 'POLYGON', 'ARC', 'MOVE', 'ROTATE', 'SCALE', 'MIRROR', 'MIRRORX', 'MIRRORY',
    'OFFSET', 'ARRAY', 'PARRAY', 'HATCH', 'LAYER', 'DELETE', 'DEL', 'UNDO', 'ZOOM', 'HELP'
]

const HINTS = {
    CIRCLE: 'CIRCLE <cx> <cy> <radius>',
    RECT: 'RECT <width> <height>',
    LINE: 'LINE <x1> <y1> <x2> <y2>',
    POLYGON: 'POLYGON <sides> <cx> <cy> <radius>',
    ARC: 'ARC <cx> <cy> <radius> <startAngle> <endAngle>',
    ROTATE: 'ROTATE <degrees>',
    SCALE: 'SCALE <factor>',
    MIRROR: 'MIRROR X|Y',
    MIRRORX: 'MIRRORX — mirror selected on X axis',
    MIRRORY: 'MIRRORY — mirror selected on Y axis',
    OFFSET: 'OFFSET <amount>',
    ARRAY: 'ARRAY <rows> <cols> <spacingX> <spacingY>',
    PARRAY: 'PARRAY <count> <radius>',
    HATCH: 'HATCH crosshatch|lines|dots|none',
    LAYER: 'LAYER list|new|set <name>',
    DELETE: 'DELETE — delete selected',
    ZOOM: 'ZOOM <factor>',
    HELP: 'HELP — show all commands',
}

export default function CommandLine() {
    const [input, setInput] = useState('')
    const [history, setHistory] = useState([
        { type: 'system', text: 'REALIS Command Line ready. Type HELP for commands.' }
    ])
    const [historyIndex, setHistoryIndex] = useState(-1)
    const [cmdHistory, setCmdHistory] = useState([])
    const [hint, setHint] = useState('')
    const inputRef = useRef(null)
    const historyRef = useRef(null)

    const objects = useStore(s => s.objects)
    const setObjects = useStore(s => s.setObjects)
    const addCADObject = useStore(s => s.addCADObject)
    const selectedIds = useStore(s => s.selectedIds)
    const layers = useStore(s => s.layers)
    const addLayer = useStore(s => s.addLayer)
    const activeLayerId = useStore(s => s.activeLayerId)
    const setActiveLayerId = useStore(s => s.setActiveLayerId)
    const mirrorObjects = useStore(s => s.mirrorObjects)
    const offsetObject = useStore(s => s.offsetObject)
    const arrayObjects = useStore(s => s.arrayObjects)
    const saveHistorySnapshot = useStore(s => s.saveHistorySnapshot)
    const activeTool = useStore(s => s.activeTool)
    const setTypedCoordinates = useStore(s => s.setTypedCoordinates)

    useEffect(() => {
        historyRef.current?.scrollTo(0, historyRef.current.scrollHeight)
    }, [history])

    const log = (text, type = 'info') => {
        setHistory(prev => [...prev, { type, text }])
    }

    const handleInput = (e) => {
        const val = e.target.value.toUpperCase()
        setInput(e.target.value)
        // Show hint
        const first = val.split(' ')[0]
        const match = COMMANDS.find(c => c.startsWith(first))
        setHint(match ? HINTS[match] || match : '')
    }

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowUp') {
            const idx = Math.min(historyIndex + 1, cmdHistory.length - 1)
            setHistoryIndex(idx)
            setInput(cmdHistory[idx] || '')
        } else if (e.key === 'ArrowDown') {
            const idx = Math.max(historyIndex - 1, -1)
            setHistoryIndex(idx)
            setInput(idx === -1 ? '' : cmdHistory[idx] || '')
        } else if (e.key === 'Tab') {
            e.preventDefault()
            const first = input.toUpperCase().split(' ')[0]
            const match = COMMANDS.find(c => c.startsWith(first))
            if (match) setInput(match + ' ')
        }
    }

    const execute = () => {
        const raw = input.trim()
        if (!raw) return
        log(`> ${raw}`, 'cmd')
        setCmdHistory(prev => [raw, ...prev])
        setHistoryIndex(-1)
        setInput('')
        setHint('')

        const parts = raw.split(/\s+/)
        const cmd = parts[0].toUpperCase()
        const args = parts.slice(1)

        const parseNum = (i, def = 0) => parseFloat(args[i] ?? def)

        // Check if user is typing raw coordinates (e.g., "100,50" or "100 50") while a drawing tool is active
        const isDrawingTool = ['rect', 'circle', 'line', 'polygon', 'arc', 'pencil', 'ruler', 'dimension'].includes(activeTool);
        if (isDrawingTool && /^[-+]?\d*\.?\d+(?:[,\s]+[-+]?\d*\.?\d+)?$/.test(raw)) {
            const coordsSplit = raw.split(/[,\s]+/)
            const px = parseFloat(coordsSplit[0]);
            const py = parseFloat(coordsSplit[1] ?? coordsSplit[0]); // If only one number, use for both or assume Y=0 (standard CAD is usually X,Y)
            if (!isNaN(px) && !isNaN(py)) {
                setTypedCoordinates({ x: px, y: py });
                log(`Input: ${px}, ${py}`, 'success');
                return;
            }
        }

        switch (cmd) {
            case 'HELP':
                log('Commands: ' + COMMANDS.join(', '), 'info')
                Object.entries(HINTS).forEach(([k, v]) => log(`  ${k}: ${v}`, 'dim'))
                break

            case 'CIRCLE': {
                const cx = parseNum(0, 400), cy = parseNum(1, 300), r = parseNum(2, 50)
                addCADObject({ id: Math.random().toString(36).substring(2, 9), type: 'circle', cx, cy, r, stroke: '#8b5cf6', fill: 'rgba(139,92,246,0.2)', strokeWidth: 2, rotation: 0, layerId: activeLayerId })
                log(`Created circle at (${cx}, ${cy}) r=${r}`, 'success')
                break
            }

            case 'RECT': {
                const w = parseNum(0, 100), h = parseNum(1, w)
                addCADObject({ id: Math.random().toString(36).substring(2, 9), type: 'rect', x: 300, y: 200, width: w, height: h, stroke: '#3b82f6', fill: 'rgba(59,130,246,0.2)', strokeWidth: 2, rotation: 0, layerId: activeLayerId })
                log(`Created rect ${w}×${h}`, 'success')
                break
            }

            case 'LINE': {
                const x1 = parseNum(0, 0), y1 = parseNum(1, 0), x2 = parseNum(2, 100), y2 = parseNum(3, 100)
                addCADObject({ id: Math.random().toString(36).substring(2, 9), type: 'ruler', x1, y1, x2, y2, stroke: '#ef4444', strokeWidth: 2, rotation: 0, layerId: activeLayerId })
                log(`Created line from (${x1},${y1}) to (${x2},${y2})`, 'success')
                break
            }

            case 'POLYGON': {
                const sides = parseInt(args[0] ?? 6), cx = parseNum(1, 400), cy = parseNum(2, 300), r = parseNum(3, 60)
                addCADObject({ id: Math.random().toString(36).substring(2, 9), type: 'polygon', sides, cx, cy, r, stroke: '#ec4899', fill: 'rgba(236,72,153,0.2)', strokeWidth: 2, rotation: 0, layerId: activeLayerId })
                log(`Created ${sides}-sided polygon at (${cx}, ${cy}) r=${r}`, 'success')
                break
            }

            case 'ARC': {
                const cx = parseNum(0, 400), cy = parseNum(1, 300), r = parseNum(2, 80), startA = parseNum(3, 0), endA = parseNum(4, 90)
                addCADObject({ id: Math.random().toString(36).substring(2, 9), type: 'arc', cx, cy, r, startAngle: startA, endAngle: endA, stroke: '#14b8a6', fill: 'none', strokeWidth: 2, rotation: 0, layerId: activeLayerId })
                log(`Created arc at (${cx}, ${cy}) r=${r} from ${startA}° to ${endA}°`, 'success')
                break
            }

            case 'ROTATE': {
                const deg = parseNum(0, 45)
                if (selectedIds.length === 0) { log('No objects selected.', 'warn'); break }
                saveHistorySnapshot()
                setObjects(prev => prev.map(o => selectedIds.includes(o.id) ? { ...o, rotation: (o.rotation || 0) + deg } : o))
                log(`Rotated ${selectedIds.length} object(s) by ${deg}°`, 'success')
                break
            }

            case 'SCALE': {
                const factor = parseNum(0, 2)
                if (selectedIds.length === 0) { log('No objects selected.', 'warn'); break }
                saveHistorySnapshot()
                setObjects(prev => prev.map(o => {
                    if (!selectedIds.includes(o.id)) return o
                    if (o.type === 'rect') return { ...o, width: o.width * factor, height: o.height * factor }
                    if (o.type === 'circle') return { ...o, r: o.r * factor }
                    if (o.type === 'path' && o.points) {
                        const cx = o.points.reduce((s, p) => s + p.x, 0) / o.points.length
                        const cy = o.points.reduce((s, p) => s + p.y, 0) / o.points.length
                        return { ...o, points: o.points.map(p => ({ x: cx + (p.x - cx) * factor, y: cy + (p.y - cy) * factor })) }
                    }
                    return o
                }))
                log(`Scaled ${selectedIds.length} object(s) by ${factor}×`, 'success')
                break
            }

            case 'MIRROR':
            case 'MIRRORX': {
                if (selectedIds.length === 0) { log('No objects selected.', 'warn'); break }
                saveHistorySnapshot()
                mirrorObjects('x')
                log(`Mirrored ${selectedIds.length} object(s) over X axis`, 'success')
                break
            }

            case 'MIRRORY': {
                if (selectedIds.length === 0) { log('No objects selected.', 'warn'); break }
                saveHistorySnapshot()
                mirrorObjects('y')
                log(`Mirrored ${selectedIds.length} object(s) over Y axis`, 'success')
                break
            }

            case 'OFFSET': {
                const amount = parseNum(0, 10)
                if (selectedIds.length === 0) { log('No objects selected.', 'warn'); break }
                saveHistorySnapshot()
                offsetObject(amount)
                log(`Offset by ${amount}px`, 'success')
                break
            }

            case 'ARRAY': {
                const rows = parseInt(args[0] ?? 2), cols = parseInt(args[1] ?? 2)
                const spX = parseNum(2, 120), spY = parseNum(3, 120)
                if (selectedIds.length === 0) { log('No objects selected.', 'warn'); break }
                saveHistorySnapshot()
                arrayObjects(rows, cols, spX, spY)
                log(`Created ${rows}×${cols} array with spacing ${spX},${spY}`, 'success')
                break
            }

            case 'PARRAY': {
                const count = parseInt(args[0] ?? 6), radius = parseNum(1, 100)
                if (selectedIds.length === 0) { log('No objects selected.', 'warn'); break }
                saveHistorySnapshot()
                const selected = objects.filter(o => selectedIds.includes(o.id))
                const clones = []
                for (let i = 1; i < count; i++) {
                    const angle = (2 * Math.PI * i) / count
                    const dx = Math.cos(angle) * radius
                    const dy = Math.sin(angle) * radius
                    selected.forEach(obj => {
                        const clone = { ...obj, id: Math.random().toString(36).substring(2, 9) }
                        if (clone.type === 'rect') { clone.x += dx; clone.y += dy }
                        else if (clone.type === 'circle') { clone.cx += dx; clone.cy += dy }
                        clones.push(clone)
                    })
                }
                setObjects(prev => [...prev, ...clones])
                log(`Created polar array: ${count} copies around r=${radius}`, 'success')
                break
            }

            case 'HATCH': {
                const pattern = args[0]?.toLowerCase() ?? 'crosshatch'
                if (selectedIds.length === 0) { log('No objects selected.', 'warn'); break }
                saveHistorySnapshot()
                setObjects(prev => prev.map(o => selectedIds.includes(o.id) ? { ...o, hatch: pattern === 'none' ? null : pattern } : o))
                log(`Applied hatch pattern "${pattern}" to ${selectedIds.length} object(s)`, 'success')
                break
            }

            case 'LAYER': {
                const sub = args[0]?.toUpperCase()
                if (sub === 'LIST') {
                    layers.forEach(l => log(`  [${l.id}] ${l.name} — ${l.color} ${l.visible ? '●' : '○'} ${l.locked ? '🔒' : ''}`, 'dim'))
                } else if (sub === 'NEW') {
                    const name = args.slice(1).join(' ') || `Layer ${layers.length}`
                    const newLayer = { id: Math.random().toString(36).substring(2, 7), name, color: '#a78bfa', visible: true, locked: false }
                    addLayer(newLayer)
                    log(`Created layer "${name}"`, 'success')
                } else if (sub === 'SET') {
                    const name = args.slice(1).join(' ')
                    const found = layers.find(l => l.name.toLowerCase() === name.toLowerCase())
                    if (found) { setActiveLayerId(found.id); log(`Active layer: "${found.name}"`, 'success') }
                    else log(`Layer "${name}" not found.`, 'warn')
                } else {
                    log('LAYER list|new <name>|set <name>', 'dim')
                }
                break
            }

            case 'DELETE':
            case 'DEL':
            case 'ERASE': {
                if (selectedIds.length === 0) { log('No objects selected.', 'warn'); break }
                saveHistorySnapshot()
                setObjects(prev => prev.filter(o => !selectedIds.includes(o.id)))
                log(`Deleted ${selectedIds.length} object(s)`, 'success')
                break
            }

            case 'ZOOM': {
                log('Use the +/- buttons in the viewport toolbar to zoom.', 'info')
                break
            }

            default:
                log(`Unknown command: "${cmd}". Type HELP for all commands.`, 'warn')
        }
    }

    const colorMap = { cmd: 'text-primary', success: 'text-green-400', warn: 'text-amber-400', system: 'text-slate-500', info: 'text-slate-300', dim: 'text-slate-600' }

    return (
        <div className="border-t border-slate-800 bg-slate-950 flex flex-col" style={{ height: '120px' }}>
            {/* History */}
            <div ref={historyRef} className="flex-1 overflow-y-auto px-3 py-1 font-mono text-[10px] space-y-0.5 custom-scrollbar">
                {history.slice(-30).map((h, i) => (
                    <div key={i} className={colorMap[h.type] || 'text-slate-300'}>{h.text}</div>
                ))}
            </div>

            {/* Hint */}
            {hint && (
                <div className="px-3 py-0.5 text-[9px] font-mono text-slate-600 bg-slate-900/50 border-t border-slate-800/50">
                    {hint}
                </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-800 bg-slate-900/80">
                <Terminal size={12} className="text-primary shrink-0" />
                <span className="text-primary font-mono text-[11px] font-bold shrink-0">Command:</span>
                <input
                    ref={inputRef}
                    value={input}
                    onChange={handleInput}
                    onKeyDown={(e) => {
                        handleKeyDown(e)
                        if (e.key === 'Enter') execute()
                    }}
                    className="flex-1 bg-transparent outline-none text-[11px] font-mono text-slate-200 placeholder-slate-700"
                    placeholder="Type a command (e.g. CIRCLE 400 300 60)…"
                    autoComplete="off"
                    spellCheck="false"
                />
                <button onClick={execute} className="text-primary hover:text-white transition-colors cursor-pointer">
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    )
}
