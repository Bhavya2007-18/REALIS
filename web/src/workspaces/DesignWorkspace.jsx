import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { MousePointer2, Move, RefreshCw, Square, Ruler, PencilRuler, Video, Grid, Plus, Minus, SkipBack, Play, SkipForward, Cpu } from 'lucide-react'
import useStore from '../store/useStore'

export default function DesignWorkspace() {
    const activeTool = useStore((s) => s.activeTool)
    const setActiveTool = useStore((s) => s.setActiveTool)

    // --- Drawing State ---
    const [objects, setObjects] = useState([])
    const [selectedIds, setSelectedIds] = useState([])
    const [isDrawing, setIsDrawing] = useState(false)
    const [currentAction, setCurrentAction] = useState(null)

    // Reference to the SVG container to calculate relative coordinates
    const svgRef = useRef(null)

    const [zoomLevel, setZoomLevel] = useState(1.0)
    const [showGrid, setShowGrid] = useState(true)
    const [viewMode, setViewMode] = useState('perspective') // perspective, top, front, side

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.2, 3.0))
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.2, 0.5))

    const toggleGrid = () => setShowGrid(!showGrid)

    const rotateView = () => {
        const modes = ['perspective', 'top', 'front', 'side']
        const nextIndex = (modes.indexOf(viewMode) + 1) % modes.length
        setViewMode(modes[nextIndex])
    }

    const getRotation = () => {
        switch (viewMode) {
            case 'top': return { rotateX: 90, rotateY: 0, rotateZ: 0 }
            case 'front': return { rotateX: 0, rotateY: 0, rotateZ: 0 }
            case 'side': return { rotateX: 0, rotateY: 90, rotateZ: 0 }
            default: return { rotateX: 45, rotateY: 0, rotateZ: 45 } // Perspective
        }
    }

    // --- Pointer Interaction Logic ---
    const getRelativeCoordinates = (e) => {
        if (!svgRef.current) return { x: 0, y: 0 }
        const svg = svgRef.current

        // Use native SVG coordinate translation to automatically handle CSS scaling & 3D transforms
        const pt = svg.createSVGPoint()
        pt.x = e.clientX
        pt.y = e.clientY

        const cursorPt = pt.matrixTransform(svg.getScreenCTM().inverse())

        return {
            x: cursorPt.x,
            y: cursorPt.y
        }
    }

    const handlePointerDown = (e) => {
        e.preventDefault() // Prevent text selection while dragging
        const { x, y } = getRelativeCoordinates(e)
        setIsDrawing(true)

        if (activeTool === 'select') {
            // Deselect if clicking on empty canvas. Object clicks are handled by onClick on the SVG elements.
            if (e.target.tagName === 'svg') setSelectedIds([])
            return
        }

        if (activeTool === 'move' && selectedIds.length > 0) {
            setCurrentAction({ type: 'move', startX: x, startY: y, originalObjects: [...objects] })
            return
        }

        if (activeTool === 'rotate' && selectedIds.length > 0) {
            // Get the first selected object to rotate around its center for MVP
            const objToRotate = objects.find(o => o.id === selectedIds[0])
            if (objToRotate) {
                let cx = 0, cy = 0;
                if (objToRotate.type === 'rect') { cx = objToRotate.x + objToRotate.width / 2; cy = objToRotate.y + objToRotate.height / 2; }
                else if (objToRotate.type === 'ruler') { cx = (objToRotate.x1 + objToRotate.x2) / 2; cy = (objToRotate.y1 + objToRotate.y2) / 2; }
                else { cx = x; cy = y; } // Fallback

                const startAngle = Math.atan2(y - cy, x - cx) * 180 / Math.PI
                setCurrentAction({ type: 'rotate', cx, cy, startAngle, startRotation: objToRotate.rotation || 0, id: objToRotate.id })
            }
            return
        }

        if (activeTool === 'rect') {
            const newObj = { id: Math.random().toString(36).substring(2, 9), type: 'rect', x, y, width: 0, height: 0, stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.2)', strokeWidth: 2, rotation: 0 }
            setObjects(prev => [...prev, newObj])
            setCurrentAction({ type: 'create_rect', id: newObj.id, startX: x, startY: y })
            return
        }

        if (activeTool === 'ruler') {
            const newObj = { id: Math.random().toString(36).substring(2, 9), type: 'ruler', x1: x, y1: y, x2: x, y2: y, stroke: '#ef4444', strokeWidth: 2, rotation: 0 }
            setObjects(prev => [...prev, newObj])
            setCurrentAction({ type: 'create_ruler', id: newObj.id, startX: x, startY: y })
            return
        }

        if (activeTool === 'pencil') {
            const newObj = { id: Math.random().toString(36).substring(2, 9), type: 'path', pathData: `M ${x} ${y}`, stroke: '#10b981', fill: 'none', strokeWidth: 3 }
            setObjects(prev => [...prev, newObj])
            setCurrentAction({ type: 'create_path', id: newObj.id })
            return
        }
    }

    const handlePointerMove = (e) => {
        if (!isDrawing || !currentAction) return
        const { x, y } = getRelativeCoordinates(e)

        setObjects(prev => prev.map(obj => {
            if (currentAction.type === 'create_rect' && obj.id === currentAction.id) {
                // Allow drawing in any direction
                const width = Math.abs(x - currentAction.startX)
                const height = Math.abs(y - currentAction.startY)
                const newX = Math.min(x, currentAction.startX)
                const newY = Math.min(y, currentAction.startY)
                return { ...obj, x: newX, y: newY, width, height }
            }

            if (currentAction.type === 'create_ruler' && obj.id === currentAction.id) {
                return { ...obj, x2: x, y2: y }
            }

            if (currentAction.type === 'create_path' && obj.id === currentAction.id) {
                return { ...obj, pathData: `${obj.pathData} L ${x} ${y}` }
            }

            if (currentAction.type === 'move' && selectedIds.includes(obj.id)) {
                const dx = x - currentAction.startX
                const dy = y - currentAction.startY
                const originalObj = currentAction.originalObjects.find(o => o.id === obj.id)
                if (!originalObj) return obj;

                if (obj.type === 'rect') {
                    return { ...obj, x: originalObj.x + dx, y: originalObj.y + dy }
                }
                if (obj.type === 'path') {
                    // For MVP, use simple transform translation
                    const currentTransform = originalObj.transform || '';
                    return { ...obj, transform: `translate(${dx}, ${dy}) ${currentTransform.replace(/translate\([^)]+\)/, '')}`.trim() }
                }
                if (obj.type === 'ruler') {
                    return { ...obj, x1: originalObj.x1 + dx, y1: originalObj.y1 + dy, x2: originalObj.x2 + dx, y2: originalObj.y2 + dy }
                }
            }

            if (currentAction.type === 'rotate' && obj.id === currentAction.id) {
                const currentAngle = Math.atan2(y - currentAction.cy, x - currentAction.cx) * 180 / Math.PI
                const deltaAngle = currentAngle - currentAction.startAngle
                return { ...obj, rotation: currentAction.startRotation + deltaAngle }
            }

            return obj
        }))
    }

    const handlePointerUp = () => {
        setIsDrawing(false)
        setCurrentAction(null)
    }

    // --- Rendering Helpers ---
    const renderObject = (obj) => {
        const isSelected = selectedIds.includes(obj.id)
        // Add a highlight filter or selection box if selected
        const filter = isSelected ? 'drop-shadow(0px 0px 4px rgba(255, 255, 255, 0.8))' : 'none'

        if (obj.type === 'rect') {
            const cx = obj.x + obj.width / 2;
            const cy = obj.y + obj.height / 2;
            const transform = obj.rotation ? `rotate(${obj.rotation} ${cx} ${cy})` : ''

            return (
                <rect
                    key={obj.id}
                    x={obj.x}
                    y={obj.y}
                    width={obj.width}
                    height={obj.height}
                    fill={obj.fill}
                    stroke={isSelected ? '#ffffff' : obj.stroke}
                    strokeWidth={isSelected ? obj.strokeWidth + 1 : obj.strokeWidth}
                    filter={filter}
                    style={{ cursor: activeTool === 'select' ? 'pointer' : 'default' }}
                    transform={transform}
                    onClick={(e) => {
                        e.stopPropagation()
                        if (activeTool === 'select') setSelectedIds([obj.id])
                    }}
                />
            )
        }

        if (obj.type === 'path') {
            return (
                <path
                    key={obj.id}
                    d={obj.pathData}
                    fill={obj.fill}
                    stroke={isSelected ? '#ffffff' : obj.stroke}
                    strokeWidth={isSelected ? obj.strokeWidth + 1 : obj.strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    transform={obj.transform || ''}
                    filter={filter}
                    style={{ cursor: activeTool === 'select' ? 'pointer' : 'default' }}
                    onClick={(e) => {
                        e.stopPropagation()
                        if (activeTool === 'select') setSelectedIds([obj.id])
                    }}
                />
            )
        }

        if (obj.type === 'ruler') {
            const dx = obj.x2 - obj.x1
            const dy = obj.y2 - obj.y1
            const distance = Math.sqrt(dx * dx + dy * dy).toFixed(1)
            const midX = (obj.x1 + obj.x2) / 2
            const midY = (obj.y1 + obj.y2) / 2
            const transform = obj.rotation ? `rotate(${obj.rotation} ${midX} ${midY})` : ''

            return (
                <g
                    key={obj.id}
                    onClick={(e) => {
                        e.stopPropagation()
                        if (activeTool === 'select') setSelectedIds([obj.id])
                    }}
                    style={{ cursor: activeTool === 'select' ? 'pointer' : 'default' }}
                    filter={filter}
                    transform={transform}
                >
                    <line x1={obj.x1} y1={obj.y1} x2={obj.x2} y2={obj.y2} stroke={isSelected ? '#ffffff' : obj.stroke} strokeWidth={isSelected ? obj.strokeWidth + 1 : obj.strokeWidth} strokeDasharray="4 4" />
                    <circle cx={obj.x1} cy={obj.y1} r="4" fill={obj.stroke} />
                    <circle cx={obj.x2} cy={obj.y2} r="4" fill={obj.stroke} />
                    {distance > 0 && (
                        <g>
                            <rect x={midX - 25} y={midY - 12} width="50" height="24" rx="4" fill="#1e293b" opacity="0.9" />
                            <text x={midX} y={midY + 4} fill="white" fontSize="12" fontFamily="monospace" textAnchor="middle">{distance}</text>
                        </g>
                    )}
                </g>
            )
        }
        return null
    }

    return (
        <div className={`w-full h-full relative flex items-center justify-center overflow-hidden transition-colors ${showGrid ? 'grid-bg' : 'bg-[#0a0f1a]'}`}>
            {/* Floating Toolbar */}
            <div className="absolute top-4 left-4 z-10 flex gap-2 glass p-1.5 rounded-xl shadow-2xl">
                <button
                    onClick={() => setActiveTool('select')}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${activeTool === 'select' ? 'text-white bg-primary' : 'text-slate-300 hover:bg-primary/40'}`}
                    title="Select Tool"
                >
                    <MousePointer2 size={18} />
                </button>
                <button
                    onClick={() => setActiveTool('move')}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${activeTool === 'move' ? 'text-white bg-primary' : 'text-slate-300 hover:bg-primary/40'}`}
                    title="Move Tool"
                >
                    <Move size={18} />
                </button>
                <button
                    onClick={() => setActiveTool('rotate')}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${activeTool === 'rotate' ? 'text-white bg-primary' : 'text-slate-300 hover:bg-primary/40'}`}
                    title="Rotate Tool"
                >
                    <RefreshCw size={18} />
                </button>
                <div className="w-[1px] bg-slate-700/50 mx-1"></div>
                <button
                    onClick={() => setActiveTool('rect')}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${activeTool === 'rect' ? 'text-white bg-primary' : 'text-slate-300 hover:bg-primary/40'}`}
                    title="Rectangle Tool"
                >
                    <Square size={18} />
                </button>
                <button
                    onClick={() => setActiveTool('ruler')}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${activeTool === 'ruler' ? 'text-white bg-primary' : 'text-slate-300 hover:bg-primary/40'}`}
                    title="Ruler Tool"
                >
                    <Ruler size={18} />
                </button>
                <button
                    onClick={() => setActiveTool('pencil')}
                    className={`p-2 rounded-lg transition-colors cursor-pointer ${activeTool === 'pencil' ? 'text-white bg-primary' : 'text-slate-300 hover:bg-primary/40'}`}
                    title="Pencil Tool"
                >
                    <PencilRuler size={18} />
                </button>
            </div>

            {/* Viewport Controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <div className="glass p-1.5 rounded-xl flex flex-col gap-1">
                    <button
                        onClick={rotateView}
                        className={`p-2 transition-colors cursor-pointer rounded-lg ${viewMode !== 'perspective' ? 'text-primary bg-primary/10' : 'text-slate-300 hover:text-white'}`}
                        title={`View: ${viewMode}`}
                    >
                        <Video size={18} />
                    </button>
                    <button
                        onClick={toggleGrid}
                        className={`p-2 transition-colors cursor-pointer rounded-lg ${showGrid ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-white'}`}
                        title="Toggle Grid"
                    >
                        <Grid size={18} />
                    </button>
                </div>
                <div className="glass p-1.5 rounded-xl flex flex-col gap-1">
                    <button
                        onClick={handleZoomIn}
                        className="p-2 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                        <Plus size={18} />
                    </button>
                    <button
                        onClick={handleZoomOut}
                        className="p-2 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    >
                        <Minus size={18} />
                    </button>
                </div>
            </div>

            {/* Center 3D Representation and Drawing Canvas */}
            <motion.div
                animate={{
                    scale: zoomLevel,
                    ...getRotation()
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                className="relative w-full h-full flex items-center justify-center transform-gpu touch-none min-w-[800px] min-h-[600px]"
            >
                {/* Visual anchor for the center point (the 'CPU') */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-64 border border-primary/40 flex items-center justify-center">
                        <div className="w-48 h-48 bg-primary/10 border-2 border-primary flex items-center justify-center rounded-xl glass shadow-[0_0_50px_rgba(37,106,244,0.3)]">
                            <Cpu size={64} className="text-primary" />
                        </div>
                    </div>
                </div>

                {/* The SVG Canvas for tools */}
                <svg
                    ref={svgRef}
                    className="absolute inset-0 w-full h-full z-20"
                    style={{
                        cursor: activeTool === 'select' ? 'default' : activeTool === 'move' ? 'move' : 'crosshair'
                    }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    // Handle case where pointer leaves the SVG area while drawing
                    onPointerLeave={handlePointerUp}
                >
                    {objects.map(renderObject)}
                </svg>

                {/* Axis Indicator */}
                <div className="absolute bottom-10 left-10 flex flex-col text-[10px] font-mono text-slate-500 gap-1 pointer-events-none">
                    <div className="flex items-center gap-2"><span className="w-4 h-[2px] bg-red-500"></span> X-AXIS</div>
                    <div className="flex items-center gap-2"><span className="w-4 h-[2px] bg-green-500"></span> Y-AXIS</div>
                    <div className="flex items-center gap-2"><span className="w-4 h-[2px] bg-primary"></span> Z-AXIS</div>
                </div>
            </motion.div>

            {/* Bottom Simulation Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass px-6 py-3 rounded-2xl flex items-center gap-6 shadow-2xl">
                <div className="flex items-center gap-4">
                    <button className="p-2 text-slate-400 hover:text-white"><SkipBack size={18} /></button>
                    <button className="size-10 bg-primary hover:bg-primary/80 text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/40 transition-all">
                        <Play size={20} fill="currentColor" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-white"><SkipForward size={18} /></button>
                </div>
                <div className="h-8 w-[1px] bg-slate-700/50"></div>
                <div className="flex flex-col min-w-40">
                    <div className="flex justify-between text-[10px] mb-1 font-mono text-slate-500">
                        <span>TIMELINE</span>
                        <span>04:12 / 12:00</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full w-[35%]" />
                    </div>
                </div>
            </div>
        </div>
    )
}
