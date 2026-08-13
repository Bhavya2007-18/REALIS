import { useRef, useState } from 'react'
import { Activity, X, ChevronDown, ChevronUp } from 'lucide-react'
import useStore from '../store/useStore'

const W = 320
const H = 130
const PAD = 8

const COLORS = { ke: '#60a5fa', pe: '#fb923c', total: '#e2e8f0' }

function buildPath(points, scaleX, scaleY, height) {
  if (!points.length) return ''
  return points.map((p, i) => {
    const x = PAD + p[0] * scaleX
    const y = height - PAD - Math.min(p[1], 1) * (height - PAD * 2)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

export default function EnergyMonitor() {
  const energyHistory = useStore(s => s.energyHistory)
  const [open, setOpen] = useState(true)
  const [hoverFrame, setHoverFrame] = useState(null) // normalized (0..1)
  const [hoverVal, setHoverVal] = useState(null)
  const svgRef = useRef(null)

  if (energyHistory.length === 0) {
    return null
  }

  const maxVal = Math.max(...energyHistory.map(e => e.total || 0), 1)
  const scaleX = (W - PAD * 2) / Math.max(energyHistory.length - 1, 1)
  const scaleY = (H - PAD * 2) / maxVal

  const norm = energyHistory.map((e, i) => [i, e.total / maxVal])
  const kePath = buildPath(energyHistory.map(e => [e.time, e.ke / maxVal]), W - PAD * 2, scaleY, H)
  const pePath = buildPath(energyHistory.map(e => [e.time, e.pe / maxVal]), W - PAD * 2, scaleY, H)
  const totPath = buildPath(norm, scaleX, scaleY, H)

  const cursorX = hoverFrame != null
    ? PAD + hoverFrame * (W - PAD * 2)
    : null

  const onMove = (e) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const fx = (e.clientX - rect.left) / rect.width
    setHoverFrame(Math.max(0, Math.min(1, fx)))
    const idx = Math.min(energyHistory.length - 1, Math.round(fx * (energyHistory.length - 1)))
    setHoverVal(energyHistory[idx])
  }
  const onLeave = () => { setHoverFrame(null); setHoverVal(null) }

  return (
    <div className="absolute bottom-16 left-3 z-30 w-[340px] rounded-xl overflow-hidden
                    border border-white/10 bg-[#0b0f1c]/90 backdrop-blur-md shadow-2xl">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 border-b border-white/8 bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px] font-semibold text-white uppercase tracking-wider">Energy Monitor</span>
          <span className="text-[9px] font-mono text-gray-500">
            {hoverVal
              ? `t=${hoverVal.time.toFixed(2)}s`
              : `${energyHistory.length} frames`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hoverVal && (
            <div className="flex items-center gap-2 text-[9px] font-mono">
              <span className="text-blue-400">KE {hoverVal.ke.toFixed(1)}</span>
              <span className="text-orange-400">PE {hoverVal.pe.toFixed(1)}</span>
              <span className="text-slate-300">Σ {hoverVal.total.toFixed(1)}</span>
            </div>
          )}
          {open ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronUp className="w-3 h-3 text-gray-500" />}
        </div>
      </button>

      {open && (
        <div className="p-2">
          <svg
            ref={svgRef}
            width={W} height={H}
            className="w-full"
            onMouseMove={onMove}
            onMouseLeave={onLeave}
          >
            {/* grid */}
            {[0.25, 0.5, 0.75].map(g => (
              <line key={g} x1={PAD} y1={PAD + g * (H - PAD * 2)} x2={W - PAD} y2={PAD + g * (H - PAD * 2)}
                stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            ))}
            <path d={kePath} fill="none" stroke={COLORS.ke} strokeWidth="1.5" />
            <path d={pePath} fill="none" stroke={COLORS.pe} strokeWidth="1.5" />
            <path d={totPath} fill="none" stroke={COLORS.total} strokeWidth="1.8" strokeDasharray="4 3" />
            {/* fill under total */}
            <path d={`${totPath} L${W - PAD},${H - PAD} L${PAD},${H - PAD} Z`} fill="rgba(226,232,240,0.06)" stroke="none" />
            {cursorX != null && (
              <line x1={cursorX} y1={PAD} x2={cursorX} y2={H - PAD} stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeDasharray="3 3" />
            )}
          </svg>

          <div className="flex items-center justify-between mt-1 px-1 pb-1">
            <div className="flex items-center gap-3">
              {[
                { label: 'Kinetic', color: COLORS.ke },
                { label: 'Potential', color: COLORS.pe },
                { label: 'Total', color: COLORS.total },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-[9px] text-gray-500">{l.label}</span>
                </div>
              ))}
            </div>
            <span className="text-[9px] font-mono text-gray-600">
              {energyHistory.length >= 2
                ? `drift ${(1 - energyHistory[energyHistory.length - 1].total / Math.max(energyHistory[0].total, 0.001)).toFixed(2)}%`
                : ''}
            </span>
          </div>
        </div>
      )}

      <button onClick={() => useStore.getState().clearEnergyHistory()}
        className="absolute top-2 right-8 text-gray-600 hover:text-gray-400 transition-colors cursor-pointer">
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}