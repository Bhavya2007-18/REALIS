import { useRef, useEffect, useState } from 'react'
import useStore from '../../store/useStore'

export default function EnergyChart() {
    const canvasRef = useRef(null)
    const energyHistory = useStore((s) => s.energyHistory)
    const [dims, setDims] = useState({ w: 0, h: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const obs = new ResizeObserver((entries) => {
            const entry = entries[0]
            if (entry) {
                setDims({ w: entry.contentRect.width, h: entry.contentRect.height })
            }
        })
        obs.observe(canvas.parentElement)
        return () => obs.disconnect()
    }, [])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || dims.w === 0) return

        const dpr = window.devicePixelRatio || 1
        canvas.width = dims.w * dpr
        canvas.height = dims.h * dpr

        const ctx = canvas.getContext('2d')
        const w = canvas.width
        const h = canvas.height
        const padding = 40 * dpr

        // Reset
        ctx.setTransform(1, 0, 0, 1, 0, 0)

        // Background
        ctx.fillStyle = '#161616'
        ctx.fillRect(0, 0, w, h)

        if (energyHistory.length < 2) {
            ctx.fillStyle = '#6b7280'
            ctx.font = `${12 * dpr}px sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText('Run simulation to generate analysis data', w / 2, h / 2)
            return
        }

        // Range
        let maxE = 0
        for (const e of energyHistory) maxE = Math.max(maxE, e.tot)
        maxE = maxE * 1.2 || 100

        const plotW = w - 2 * padding
        const plotH = h - 2 * padding
        const startX = padding
        const startY = h - padding

        // Grid
        ctx.strokeStyle = '#222'
        ctx.lineWidth = 1 * dpr
        ctx.beginPath()
        for (let i = 0; i <= 4; i++) {
            const y = startY - (plotH * (i / 4))
            ctx.moveTo(startX, y)
            ctx.lineTo(startX + plotW, y)
        }
        ctx.stroke()

        // Helper
        const drawSeries = (key, color) => {
            ctx.beginPath()
            ctx.strokeStyle = color
            ctx.lineWidth = 2 * dpr
            ctx.lineJoin = 'round'

            for (let i = 0; i < energyHistory.length; i++) {
                const e = energyHistory[i]
                // Map 0..599 (max hist) to plot width
                // If checking exact time, better. But array index is simpler for scrolling.
                const x = startX + (i / 599) * plotW
                const y = startY - (e[key] / maxE) * plotH
                if (i === 0) ctx.moveTo(x, y)
                else ctx.lineTo(x, y)
            }
            ctx.stroke()
        }

        drawSeries('k', '#22d3ee')
        drawSeries('p', '#c084fc')
        drawSeries('tot', '#ffffff')

        // Legend
        ctx.font = `${10 * dpr}px monospace`
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        const ly = 10 * dpr
        const lx = w - 180 * dpr
        ctx.fillStyle = '#22d3ee'; ctx.fillText('Kinetic', lx, ly)
        ctx.fillStyle = '#c084fc'; ctx.fillText('Potential', lx + 60 * dpr, ly)
        ctx.fillStyle = '#ffffff'; ctx.fillText('Total', lx + 130 * dpr, ly)

        // Y Axis
        ctx.fillStyle = '#9ca3af'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        // draw 5 ticks
        for (let i = 0; i <= 4; i++) {
            const val = maxE * (i / 4)
            const y = startY - (plotH * (i / 4))
            ctx.fillText(val.toFixed(0), startX - 8 * dpr, y)
        }

    }, [energyHistory, dims])

    return <canvas ref={canvasRef} className="w-full h-full block" />
}
