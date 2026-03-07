import { useState, useRef, useEffect, useMemo } from 'react'
import { MousePointer2, Move, RefreshCw, Square, Circle, Ruler, PencilRuler, Video, Grid, Plus, Minus, SkipBack, Play, SkipForward, Cpu, Infinity as InfinityIcon, Box, Layers } from 'lucide-react'
import useStore from '../store/useStore'
import Viewport3D from '../components/Viewport3D'

export default function DesignWorkspace() {
    const activeTool = useStore((s) => s.activeTool)
    const setActiveTool = useStore((s) => s.setActiveTool)

    // --- Settings ---
    const [snappingEnabled, setSnappingEnabled] = useState(true)
    const SNAP_THRESHOLD = 15;

    // --- Drawing State ---
    const objects = useStore((s) => s.objects)
    const setObjects = useStore((s) => s.setObjects)
    const selectedIds = useStore((s) => s.selectedIds)
    const setSelectedIds = useStore((s) => s.setSelectedIds)
    const setActiveFileId = useStore((s) => s.setActiveFileId)
    const [isDrawing, setIsDrawing] = useState(false)
    const [currentAction, setCurrentAction] = useState(null)
    const [isSimulating, setIsSimulating] = useState(false)

    // --- Playback State from Store ---
    const simulationFrames = useStore(s => s.simulationFrames)
    const setSimulationFrames = useStore(s => s.setSimulationFrames)
    const isPlaying = useStore(s => s.isPlaying)
    const togglePlayback = useStore(s => s.togglePlayback)
    const resetPlayback = useStore(s => s.resetPlayback)
    const currentFrameIndex = useStore(s => s.currentFrameIndex)
    const setCurrentFrameIndex = useStore(s => s.setCurrentFrameIndex)
    const setSimTime = useStore(s => s.setSimTime)

    // Reference to the SVG container to calculate relative coordinates
    const svgRef = useRef(null)

    const [zoomLevel, setZoomLevel] = useState(1.0)
    const [showGrid, setShowGrid] = useState(true)
    const [viewMode, setViewMode] = useState('perspective') // perspective, top, front, side
    const [is3DMode, setIs3DMode] = useState(false)
    const [snapPoint, setSnapPoint] = useState(null)

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

    // --- Animation Loop ---
    useEffect(() => {
        let animationFrame;
        if (isPlaying && simulationFrames.length > 0) {
            const numFrames = simulationFrames.length;

            const animate = () => {
                setCurrentFrameIndex((prevIndex) => {
                    const nextIndex = prevIndex + 1;
                    if (nextIndex >= numFrames) {
                        togglePlayback(); // Stop when finished
                        return prevIndex;
                    }
                    setSimTime(simulationFrames[nextIndex].time);
                    return nextIndex;
                });
                // To do: timing control. Currently runs as fast as requestAnimationFrame
                // A better approach syncs to real time.
                animationFrame = requestAnimationFrame(animate);
            };
            animationFrame = requestAnimationFrame(animate);
        }
        return () => cancelAnimationFrame(animationFrame);
    }, [isPlaying, simulationFrames, togglePlayback, setCurrentFrameIndex, setSimTime]);

    // Apply simulation physics to objects on screen
    const getRenderObjects = () => {
        if (!simulationFrames || simulationFrames.length === 0 || currentFrameIndex === 0) {
            return objects;
        }

        const frame = simulationFrames[currentFrameIndex];
        return objects.map(obj => {
            const simState = frame.states.find(s => s.id === obj.id);
            if (simState) {
                // Apply simulated position logic
                // For MVP, just translate the Y difference
                // Depending on how physics coordinates overlap SVG coordinates (Y is down in SVG, up in physics usually)
                // If the backend drops Y from 10 to 0, in SVG that means adding to Y to go down.
                // We mock it directly below keeping Y as SVG Y.
                return { ...obj, y: simState.position.y };
            }
            return obj;
        });
    };

    const renderedObjects = isPlaying || (simulationFrames.length > 0 && currentFrameIndex > 0)
        ? getRenderObjects()
        : objects;


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

    const findSnapPoint = (px, py, excludeId = null) => {
        if (!snappingEnabled) return { x: px, y: py, snapped: false };
        let closestDist = SNAP_THRESHOLD;
        let snapPoint = { x: px, y: py, snapped: false };

        // Grid snapping
        if (showGrid) {
            const gridSize = 50; // Assuming 50px grid lines
            const gridX = Math.round(px / gridSize) * gridSize;
            const gridY = Math.round(py / gridSize) * gridSize;
            if (Math.abs(px - gridX) < closestDist && Math.abs(py - gridY) < closestDist) {
                closestDist = Math.max(Math.abs(px - gridX), Math.abs(py - gridY));
                snapPoint = { x: gridX, y: gridY, snapped: true, type: 'grid' };
            }
        }

        // Object snapping (vertices and centers)
        objects.forEach(obj => {
            if (obj.id === excludeId) return;
            const pts = [];
            if (obj.type === 'rect') {
                pts.push({ x: obj.x, y: obj.y }); // TL
                pts.push({ x: obj.x + obj.width, y: obj.y }); // TR
                pts.push({ x: obj.x, y: obj.y + obj.height }); // BL
                pts.push({ x: obj.x + obj.width, y: obj.y + obj.height }); // BR
                pts.push({ x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 }); // Center
                // Midpoints
                pts.push({ x: obj.x + obj.width / 2, y: obj.y }); // Top
                pts.push({ x: obj.x + obj.width / 2, y: obj.y + obj.height }); // Bottom
                pts.push({ x: obj.x, y: obj.y + obj.height / 2 }); // Left
                pts.push({ x: obj.x + obj.width, y: obj.y + obj.height / 2 }); // Right
            } else if (obj.type === 'circle') {
                pts.push({ x: obj.cx, y: obj.cy }); // Center
            } else if (obj.type === 'path' && obj.points) {
                // Vertex snapping
                obj.points.forEach(p => pts.push({ x: p.x, y: p.y }));
                // Midpoint snapping
                for (let i = 0; i < obj.points.length - 1; i++) {
                    pts.push({
                        x: (obj.points[i].x + obj.points[i + 1].x) / 2,
                        y: (obj.points[i].y + obj.points[i + 1].y) / 2
                    });
                }
            } else if (obj.type === 'ruler') {
                pts.push({ x: obj.x1, y: obj.y1 });
                pts.push({ x: obj.x2, y: obj.y2 });
                pts.push({ x: (obj.x1 + obj.x2) / 2, y: (obj.y1 + obj.y2) / 2 });
            }

            pts.forEach(p => {
                const d = Math.sqrt((px - p.x) ** 2 + (py - p.y) ** 2);
                if (d < closestDist) {
                    closestDist = d;
                    snapPoint = { x: p.x, y: p.y, snapped: true, type: 'vertex' };
                }
            });
        });
        return snapPoint;
    }

    const handlePointerDown = (e) => {
        e.preventDefault() // Prevent text selection while dragging
        let { x, y } = getRelativeCoordinates(e)

        // Apply snapping to initial point
        const snap = findSnapPoint(x, y);
        x = snap.x;
        y = snap.y;

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

        if (activeTool === 'circle') {
            const newObj = { id: Math.random().toString(36).substring(2, 9), type: 'circle', cx: x, cy: y, r: 0, stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.2)', strokeWidth: 2, rotation: 0 }
            setObjects(prev => [...prev, newObj])
            setCurrentAction({ type: 'create_circle', id: newObj.id, startX: x, startY: y })
            return
        }

        if (activeTool === 'ruler') {
            const newObj = { id: Math.random().toString(36).substring(2, 9), type: 'ruler', x1: x, y1: y, x2: x, y2: y, stroke: '#ef4444', strokeWidth: 2, rotation: 0 }
            setObjects(prev => [...prev, newObj])
            setCurrentAction({ type: 'create_ruler', id: newObj.id, startX: x, startY: y })
            return
        }

        if (activeTool === 'pencil') {
            const newObj = {
                id: Math.random().toString(36).substring(2, 9),
                type: 'path',
                points: [{ x, y }], // Store as array of points for polyline
                stroke: '#10b981',
                fill: 'none',
                strokeWidth: 3
            }
            setObjects(prev => [...prev, newObj])
            setCurrentAction({ type: 'create_polyline', id: newObj.id })
            return
        }
    }

    const handlePointerMove = (e) => {
        // Handle polyline preview even if not strictly "drawing" via drag
        if (activeTool === 'pencil' && currentAction?.type === 'create_polyline') {
            const rawCoords = getRelativeCoordinates(e)
            const snap = findSnapPoint(rawCoords.x, rawCoords.y, currentAction.id)
            setCurrentAction(prev => ({ ...prev, currentX: snap.x, currentY: snap.y }))
            return;
        }

        if (!isDrawing || !currentAction) return

        // Only run getRelativeCoordinates and findSnapPoint if we are actually drawing
        const rawCoords = getRelativeCoordinates(e)
        // Extract id if applicable to exclude from snapping
        const excludeId = currentAction.id || (currentAction.type === 'move' && selectedIds.length === 1 ? selectedIds[0] : null);
        const snap = findSnapPoint(rawCoords.x, rawCoords.y, excludeId)
        setSnapPoint(snap.snapped ? snap : null)
        const x = snap.x
        const y = snap.y

        setObjects(prev => prev.map(obj => {
            if (currentAction.type === 'create_rect' && obj.id === currentAction.id) {
                // Allow drawing in any direction
                const width = Math.abs(x - currentAction.startX)
                const height = Math.abs(y - currentAction.startY)
                const newX = Math.min(x, currentAction.startX)
                const newY = Math.min(y, currentAction.startY)
                return { ...obj, x: newX, y: newY, width, height }
            }

            if (currentAction.type === 'create_circle' && obj.id === currentAction.id) {
                const r = Math.sqrt((x - currentAction.startX) ** 2 + (y - currentAction.startY) ** 2)
                return { ...obj, r }
            }

            if (currentAction.type === 'create_ruler' && obj.id === currentAction.id) {
                return { ...obj, x2: x, y2: y }
            }

            if (currentAction.type === 'create_path' && obj.id === currentAction.id) {
                // Legacy path drawing if still used anywhere (can be removed soon)
                return { ...obj, pathData: `${obj.pathData} L ${x} ${y} ` }
            }

            if (currentAction.type === 'move' && selectedIds.includes(obj.id)) {
                const dx = x - currentAction.startX
                const dy = y - currentAction.startY
                const originalObj = currentAction.originalObjects.find(o => o.id === obj.id)
                if (!originalObj) return obj;

                if (obj.type === 'rect') {
                    return { ...obj, x: originalObj.x + dx, y: originalObj.y + dy }
                }
                if (obj.type === 'circle') {
                    return { ...obj, cx: originalObj.cx + dx, cy: originalObj.cy + dy }
                }
                if (obj.type === 'path') {
                    // For MVP, use simple transform translation
                    const currentTransform = originalObj.transform || '';
                    return { ...obj, transform: `translate(${dx}, ${dy}) ${currentTransform.replace(/translate\([^)]+\)/, '')} `.trim() }
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

    const handlePointerUp = (e) => {
        if (activeTool === 'pencil' && currentAction?.type === 'create_polyline') {
            // Polyline expects clicks, not drag.
            // PointerUp registers the click to add a point.
            if (!isDrawing) return; // If we didn't start a tap, ignore

            let { x, y } = getRelativeCoordinates(e)
            const snap = findSnapPoint(x, y, currentAction.id);
            x = snap.x; y = snap.y;

            setObjects(prev => prev.map(obj => {
                if (obj.id === currentAction.id) {
                    // Prevent adding same point twice if they didn't move
                    const lastPt = obj.points[obj.points.length - 1];
                    if (lastPt.x !== x || lastPt.y !== y) {
                        return { ...obj, points: [...obj.points, { x, y }] }
                    }
                }
                return obj
            }))
            // Do NOT clear action/isDrawing. Polyline stays active until double-click or Escape.
            setIsDrawing(false) // Wait for next Down
            return;
        }

        setIsDrawing(false)
        setSnapPoint(null)
        if (currentAction && currentAction.type !== 'create_polyline') {
            setCurrentAction(null)
        }
    }

    // Handle confirming the polyline completion (Right click or Escape)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' || e.key === 'Enter') {
                if (activeTool === 'pencil' && currentAction?.type === 'create_polyline') {
                    setCurrentAction(null)
                    setIsDrawing(false)
                }
                if (activeTool !== 'select') {
                    setActiveTool('select')
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeTool, currentAction, setActiveTool])
    const handleSimulate = async () => {
        if (objects.length === 0) return;

        setIsSimulating(true);
        resetPlayback();

        try {
            // Marshall CAD entities into Python domain
            const payload = {
                objects: objects.map(o => ({
                    id: o.id,
                    geometry: {
                        id: o.id,
                        type: o.type,
                        position: { x: o.x || o.x1, y: o.y || o.y1, z: 0 },
                        rotation: { x: 0, y: 0, z: o.rotation || 0 },
                        dimensions: { x: o.width || 0, y: o.height || 0, z: 0 }
                    },
                    physics: {
                        mass: o.mass !== undefined ? parseFloat(o.mass) : 1.0,
                        restitution: o.restitution !== undefined ? parseFloat(o.restitution) : 0.5,
                        friction: o.friction !== undefined ? parseFloat(o.friction) : 0.3,
                        is_static: o.isStatic || false
                    }
                })),
                time_step: 0.016, // ~60fps
                duration: 2.0
            };

            const req = await fetch('http://localhost:8000/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!req.ok) throw new Error("Simulation failed on backend");

            const res = await req.json();
            setSimulationFrames(res.frames);
            togglePlayback(); // Auto-start playback

        } catch (err) {
            console.error(err);
            alert("Failed to run simulation. Is the Python server running?");
        } finally {
            setIsSimulating(false);
        }
    };

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
                        if (activeTool === 'select') {
                            const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
                            if (isMultiSelect) {
                                setSelectedIds(prev => prev.includes(obj.id) ? prev.filter(id => id !== obj.id) : [...prev, obj.id])
                            } else {
                                setSelectedIds([obj.id])
                            }
                            setActiveFileId(obj.id)
                        }
                    }}
                />
            )
        }

        if (obj.type === 'circle') {
            const transform = obj.rotation ? `rotate(${obj.rotation} ${obj.cx} ${obj.cy})` : ''

            return (
                <circle
                    key={obj.id}
                    cx={obj.cx}
                    cy={obj.cy}
                    r={obj.r}
                    fill={obj.fill}
                    stroke={isSelected ? '#ffffff' : obj.stroke}
                    strokeWidth={isSelected ? obj.strokeWidth + 1 : obj.strokeWidth}
                    filter={filter}
                    style={{ cursor: activeTool === 'select' ? 'pointer' : 'default' }}
                    transform={transform}
                    onClick={(e) => {
                        e.stopPropagation()
                        if (activeTool === 'select') {
                            const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
                            if (isMultiSelect) {
                                setSelectedIds(prev => prev.includes(obj.id) ? prev.filter(id => id !== obj.id) : [...prev, obj.id])
                            } else {
                                setSelectedIds([obj.id])
                            }
                            setActiveFileId(obj.id)
                        }
                    }}
                />
            )
        }

        if (obj.type === 'path') {
            // Reconstruct pathData from points array if it exists (new polyline way)
            let d = obj.pathData;
            if (obj.points && obj.points.length > 0) {
                d = `M ${obj.points[0].x} ${obj.points[0].y} `;
                for (let i = 1; i < obj.points.length; i++) {
                    d += `L ${obj.points[i].x} ${obj.points[i].y} `;
                }
            }

            return (
                <g key={obj.id}>
                    <path
                        d={d}
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
                            if (activeTool === 'select') {
                                const isMultiSelect = e.shiftKey || e.ctrlKey || e.metaKey;
                                if (isMultiSelect) {
                                    setSelectedIds(prev => prev.includes(obj.id) ? prev.filter(id => id !== obj.id) : [...prev, obj.id])
                                } else {
                                    setSelectedIds([obj.id])
                                }
                                setActiveFileId(obj.id)
                            }
                        }}
                    />
                    {/* Render the preview line segment if currently drawing this polyline */}
                    {currentAction?.type === 'create_polyline' && currentAction.id === obj.id && currentAction.currentX !== undefined && obj.points.length > 0 && (
                        <line
                            x1={obj.points[obj.points.length - 1].x}
                            y1={obj.points[obj.points.length - 1].y}
                            x2={currentAction.currentX}
                            y2={currentAction.currentY}
                            stroke={obj.stroke}
                            strokeWidth={obj.strokeWidth}
                            strokeDasharray="4 4"
                            opacity={0.5}
                        />
                    )}
                </g>
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
        <div className={`w - full h - full relative flex items - center justify - center overflow - hidden transition - colors ${showGrid ? 'grid-bg' : 'bg-[#0a0f1a]'} `}>
            {/* Floating Toolbar */}
            <div className="absolute top-4 left-4 z-10 flex gap-2 glass p-1.5 rounded-xl shadow-2xl">
                <button
                    onClick={() => setActiveTool('select')}
                    className={`p - 2 rounded - lg transition - colors cursor - pointer ${activeTool === 'select' ? 'text-white bg-primary' : 'text-slate-300 hover:bg-primary/40'} `}
                    title="Select Tool"
                >
                    <MousePointer2 size={18} />
                </button>
                <button
                    onClick={() => setActiveTool('move')}
                    className={`p - 2 rounded - lg transition - colors cursor - pointer ${activeTool === 'move' ? 'text-white bg-primary' : 'text-slate-300 hover:bg-primary/40'} `}
                    title="Move Tool"
                >
                    <Move size={18} />
                </button>
                <button
                    onClick={() => setActiveTool('rotate')}
                    className={`p - 2 rounded - lg transition - colors cursor - pointer ${activeTool === 'rotate' ? 'text-white bg-primary' : 'text-slate-300 hover:bg-primary/40'} `}
                    title="Rotate Tool"
                >
                    <RefreshCw size={18} />
                </button>
                <div className="w-[1px] bg-slate-700/50 mx-1"></div>
                <button
                    onClick={() => setActiveTool('rect')}
                    className={`p - 2 rounded - lg transition - colors cursor - pointer ${activeTool === 'rect' ? 'text-white bg-primary' : 'text-slate-300 hover:bg-primary/40'} `}
                    title="Rectangle Tool"
                >
                    <Square size={18} />
                </button>
                <button
                    onClick={() => setActiveTool('circle')}
                    className={`p - 2 rounded - lg transition - colors cursor - pointer ${activeTool === 'circle' ? 'text-white bg-primary' : 'text-slate-300 hover:bg-primary/40'} `}
                    title="Circle Tool"
                >
                    <Circle size={18} />
                </button>
                <button
                    onClick={() => setActiveTool('ruler')}
                    className={`p - 2 rounded - lg transition - colors cursor - pointer ${activeTool === 'ruler' ? 'text-white bg-primary' : 'text-slate-300 hover:bg-primary/40'} `}
                    title="Ruler Tool"
                >
                    <Ruler size={18} />
                </button>
                <button
                    onClick={() => setActiveTool('pencil')}
                    className={`p - 2 rounded - lg transition - colors cursor - pointer ${activeTool === 'pencil' ? 'text-white bg-primary' : 'text-slate-300 hover:bg-primary/40'} `}
                    title="Pencil Tool"
                >
                    <PencilRuler size={18} />
                </button>
                <div className="w-[1px] bg-slate-700/50 mx-1"></div>
                <button
                    onClick={() => setIs3DMode(!is3DMode)}
                    className={`p - 2 rounded - lg transition - colors cursor - pointer ${is3DMode ? 'text-white bg-primary' : 'text-slate-300 hover:bg-primary/40'} `}
                    title={is3DMode ? "Switch to 2D Plan" : "Extrude to 3D"}
                >
                    {is3DMode ? <Layers size={18} /> : <Box size={18} />}
                </button>
            </div>

            {/* Viewport Controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <div className="glass p-1.5 rounded-xl flex flex-col gap-1">
                    <button
                        onClick={rotateView}
                        className={`p - 2 transition - colors cursor - pointer rounded - lg ${viewMode !== 'perspective' ? 'text-primary bg-primary/10' : 'text-slate-300 hover:text-white'} `}
                        title={`View: ${viewMode} `}
                    >
                        <Video size={18} />
                    </button>
                    <button
                        onClick={toggleGrid}
                        className={`p - 2 transition - colors cursor - pointer rounded - lg ${showGrid ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-white'} `}
                        title="Toggle Grid"
                    >
                        <Grid size={18} />
                    </button>
                    <button
                        onClick={() => setSnappingEnabled(!snappingEnabled)}
                        className={`p - 2 transition - colors cursor - pointer rounded - lg ${snappingEnabled ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-white'} `}
                        title="Toggle Snap to Grid/Objects"
                    >
                        <InfinityIcon size={18} />
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

            {/* Center Viewport */}
            {is3DMode ? (
                <div className="absolute inset-0 w-full h-full z-20">
                    <Viewport3D objects={renderedObjects} isSimulating={isSimulating} />
                </div>
            ) : (
                <div
                    style={{
                        transform: `scale(${zoomLevel}) rotateX(${getRotation().rotateX}deg) rotateY(${getRotation().rotateY}deg) rotateZ(${getRotation().rotateZ}deg)`
                    }}
                    className="relative w-full h-full flex items-center justify-center transform-gpu touch-none min-w-[800px] min-h-[600px] transition-transform duration-300"
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
                        {renderedObjects.map(renderObject)}

                        {/* Snapping Indicator */}
                        {snapPoint && snapPoint.snapped && (
                            <g transform={`translate(${snapPoint.x}, ${snapPoint.y})`}>
                                <rect
                                    x="-4" y="-4" width="8" height="8"
                                    fill="none" stroke="#fbbf24" strokeWidth="1"
                                    className="animate-pulse"
                                />
                                <circle r="1.5" fill="#fbbf24" />
                            </g>
                        )}
                    </svg>

                    {/* Axis Indicator */}
                    <div className="absolute bottom-10 left-10 flex flex-col text-[10px] font-mono text-slate-500 gap-1 pointer-events-none">
                        <div className="flex items-center gap-2"><span className="w-4 h-[2px] bg-red-500"></span> X-AXIS</div>
                        <div className="flex items-center gap-2"><span className="w-4 h-[2px] bg-green-500"></span> Y-AXIS</div>
                        <div className="flex items-center gap-2"><span className="w-4 h-[2px] bg-primary"></span> Z-AXIS</div>
                    </div>
                </div>
            )}

            {/* Bottom Simulation Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass px-6 py-3 rounded-2xl flex items-center gap-6 shadow-2xl z-30">
                <div className="flex items-center gap-4">
                    <button onClick={resetPlayback} className="p-2 text-slate-400 hover:text-white cursor-pointer"><SkipBack size={18} /></button>
                    <button
                        onClick={simulationFrames.length > 0 ? togglePlayback : handleSimulate}
                        disabled={isSimulating}
                        className={`size - 10 bg - primary hover: bg - primary / 80 text - white rounded - full flex items - center justify - center shadow - lg shadow - primary / 40 transition - all cursor - pointer ${isSimulating ? 'animate-pulse opacity-50' : ''} `}
                    >
                        {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                    </button>
                    <button className="p-2 text-slate-400 hover:text-white cursor-pointer"><SkipForward size={18} /></button>
                </div>
                <div className="h-8 w-[1px] bg-slate-700/50"></div>
                <div className="flex flex-col min-w-40">
                    <div className="flex justify-between text-[10px] mb-1 font-mono text-slate-500">
                        <span>TIMELINE {isSimulating && "- COMPUTING..."}</span>
                        <span>
                            {simulationFrames.length > 0
                                ? `${(simulationFrames[currentFrameIndex]?.time || 0).toFixed(2)} s / ${(simulationFrames[simulationFrames.length - 1]?.time || 0).toFixed(2)} s`
                                : "0.00s / 0.00s"}
                        </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-primary h-full transition-all duration-75"
                            style={{ width: simulationFrames.length > 0 ? `${(currentFrameIndex / simulationFrames.length) * 100}% ` : '0%' }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
