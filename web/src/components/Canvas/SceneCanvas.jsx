import { useRef, useEffect, useCallback } from 'react'
import useStore from '../../store/useStore'

const GRID_SIZE = 40

export default function SceneCanvas() {
    const canvasRef = useRef(null)
    const camera = useRef({ x: 0, y: 0, zoom: 1 })
    const drag = useRef(null)
    const pan = useRef(null)

    const sceneObjects = useStore((s) => s.sceneObjects)
    const selectedObject = useStore((s) => s.selectedObject)
    const setSelectedObject = useStore((s) => s.setSelectedObject)
    const updateObject = useStore((s) => s.updateObject)

    const toWorld = useCallback((cx, cy) => {
        const c = camera.current
        return {
            x: (cx - c.x) / c.zoom,
            y: (cy - c.y) / c.zoom,
        }
    }, [])

    const hitTest = useCallback((wx, wy, objects) => {
        for (let i = objects.length - 1; i >= 0; i--) {
            const obj = objects[i]
            if (obj.type === 'circle' || obj.type === 'particle') {
                const r = obj.radius || 6
                const dx = wx - obj.x
                const dy = wy - obj.y
                if (dx * dx + dy * dy <= r * r) return obj
            } else if (obj.type === 'box') {
                const hw = (obj.width || 60) / 2
                const hh = (obj.height || 60) / 2
                if (Math.abs(wx - obj.x) <= hw && Math.abs(wy - obj.y) <= hh) return obj
            }
        }
        return null
    }, [])

    const draw = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        const w = canvas.width
        const h = canvas.height
        const c = camera.current

        ctx.clearRect(0, 0, w, h)

        ctx.save()
        ctx.translate(c.x + w / 2, c.y + h / 2)
        ctx.scale(c.zoom, c.zoom)

        drawGrid(ctx, w, h, c)

        const objects = useStore.getState().sceneObjects
        const selId = useStore.getState().selectedObject

        objects.forEach((obj) => {
            ctx.save()
            ctx.translate(obj.x, obj.y)

            if (obj.type === 'circle' || obj.type === 'particle') {
                const r = obj.radius || 6
                ctx.beginPath()
                ctx.arc(0, 0, r, 0, Math.PI * 2)
                ctx.fillStyle = obj.color + '33'
                ctx.fill()
                ctx.strokeStyle = obj.color
                ctx.lineWidth = 1.5 / c.zoom
                ctx.stroke()
            } else if (obj.type === 'box') {
                const hw = (obj.width || 60) / 2
                const hh = (obj.height || 60) / 2
                ctx.fillStyle = obj.color + '33'
                ctx.fillRect(-hw, -hh, hw * 2, hh * 2)
                ctx.strokeStyle = obj.color
                ctx.lineWidth = 1.5 / c.zoom
                ctx.strokeRect(-hw, -hh, hw * 2, hh * 2)
            }

            if (obj.id === selId) {
                drawSelectionOutline(ctx, obj, c.zoom)
            }

            ctx.restore()
        })

        drawOriginCross(ctx, c)

        ctx.restore()

        drawHUD(ctx, w, h, c, objects)
    }, [])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        function resize() {
            const rect = canvas.parentElement.getBoundingClientRect()
            canvas.width = rect.width * devicePixelRatio
            canvas.height = rect.height * devicePixelRatio
            canvas.style.width = rect.width + 'px'
            canvas.style.height = rect.height + 'px'
            const ctx = canvas.getContext('2d')
            ctx.scale(devicePixelRatio, devicePixelRatio)
            draw()
        }

        const observer = new ResizeObserver(resize)
        observer.observe(canvas.parentElement)
        resize()

        return () => observer.disconnect()
    }, [draw])

    useEffect(() => {
        let raf
        function loop() {
            draw()
            raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)
        return () => cancelAnimationFrame(raf)
    }, [draw])

    function handleMouseDown(e) {
        const rect = canvasRef.current.getBoundingClientRect()
        const cx = e.clientX - rect.left - rect.width / 2
        const cy = e.clientY - rect.top - rect.height / 2
        const w = toWorld(cx, cy)

        const hit = hitTest(w.x, w.y, useStore.getState().sceneObjects)

        if (hit) {
            setSelectedObject(hit.id)
            drag.current = { id: hit.id, startX: hit.x, startY: hit.y, mouseStartX: w.x, mouseStartY: w.y }
        } else {
            setSelectedObject(null)
            pan.current = { startCX: camera.current.x, startCY: camera.current.y, mouseX: e.clientX, mouseY: e.clientY }
        }
    }

    function handleMouseMove(e) {
        if (drag.current) {
            const rect = canvasRef.current.getBoundingClientRect()
            const cx = e.clientX - rect.left - rect.width / 2
            const cy = e.clientY - rect.top - rect.height / 2
            const w = toWorld(cx, cy)
            const d = drag.current
            updateObject(d.id, {
                x: Math.round(d.startX + (w.x - d.mouseStartX)),
                y: Math.round(d.startY + (w.y - d.mouseStartY)),
            })
        } else if (pan.current) {
            const p = pan.current
            camera.current.x = p.startCX + (e.clientX - p.mouseX)
            camera.current.y = p.startCY + (e.clientY - p.mouseY)
        }
    }

    function handleMouseUp() {
        drag.current = null
        pan.current = null
    }

    function handleWheel(e) {
        e.preventDefault()
        const factor = e.deltaY > 0 ? 0.9 : 1.1
        camera.current.zoom = Math.max(0.1, Math.min(10, camera.current.zoom * factor))
    }

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        />
    )
}

function drawGrid(ctx, canvasW, canvasH, cam) {
    const step = GRID_SIZE
    const halfW = canvasW / (2 * cam.zoom * devicePixelRatio)
    const halfH = canvasH / (2 * cam.zoom * devicePixelRatio)
    const startX = Math.floor(-halfW / step) * step
    const endX = Math.ceil(halfW / step) * step
    const startY = Math.floor(-halfH / step) * step
    const endY = Math.ceil(halfH / step) * step

    ctx.strokeStyle = '#2a2a2a'
    ctx.lineWidth = 0.5 / cam.zoom

    ctx.beginPath()
    for (let x = startX; x <= endX; x += step) {
        ctx.moveTo(x, startY)
        ctx.lineTo(x, endY)
    }
    for (let y = startY; y <= endY; y += step) {
        ctx.moveTo(startX, y)
        ctx.lineTo(endX, y)
    }
    ctx.stroke()
}

function drawOriginCross(ctx, cam) {
    const len = 12 / cam.zoom
    ctx.strokeStyle = '#4b7cf3'
    ctx.lineWidth = 1 / cam.zoom
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.moveTo(-len, 0); ctx.lineTo(len, 0)
    ctx.moveTo(0, -len); ctx.lineTo(0, len)
    ctx.stroke()
    ctx.globalAlpha = 1
}

function drawSelectionOutline(ctx, obj, zoom) {
    ctx.save()
    ctx.setLineDash([4 / zoom, 3 / zoom])
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.2 / zoom

    if (obj.type === 'circle' || obj.type === 'particle') {
        const r = (obj.radius || 6) + 4 / zoom
        ctx.beginPath()
        ctx.arc(0, 0, r, 0, Math.PI * 2)
        ctx.stroke()
    } else if (obj.type === 'box') {
        const hw = (obj.width || 60) / 2 + 4 / zoom
        const hh = (obj.height || 60) / 2 + 4 / zoom
        ctx.strokeRect(-hw, -hh, hw * 2, hh * 2)
    }

    ctx.restore()
}

function drawHUD(ctx, w, h, cam, objects) {
    const pw = w / devicePixelRatio
    const ph = h / devicePixelRatio

    ctx.fillStyle = 'rgba(90,90,90,0.6)'
    ctx.font = '10px monospace'
    ctx.textBaseline = 'bottom'
    ctx.fillText(
        `${objects.length} object${objects.length !== 1 ? 's' : ''} · zoom ${Math.round(cam.zoom * 100)}%`,
        8, ph - 6
    )
}
