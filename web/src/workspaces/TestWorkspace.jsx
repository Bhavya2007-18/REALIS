import { useEffect, useRef, useState } from 'react'
import useStore from '../store/useStore'
import Viewport3D from '../components/Viewport3D'
import { Play, Square, RotateCcw, Zap, Flame, Droplets, Atom, Layers, Gauge, Shuffle, Cpu } from 'lucide-react'

export default function TestWorkspace() {
  const setShapes3D = useStore(s => s.setShapes3D)
  const shapes3D = useStore(s => s.shapes3D)
  const setSimulationSettings = useStore(s => s.setSimulationSettings)
  const simulationSettings = useStore(s => s.simulationSettings)

  const [segment, setSegment] = useState('particles')
  const [isPlaying, setIsPlaying] = useState(false)
  const [localBodies, setLocalBodies] = useState([])
  const rafRef = useRef(null)
  const lastTime = useRef(performance.now())

  const [gravity, setGravity] = useState(9.81)
  const [timeScale, setTimeScale] = useState(1.0)
  const [damping, setDamping] = useState(0.01)

  const [particleCfg, setParticleCfg] = useState({ emissionRate: 20, trail: true, elastic: true, attraction: 0.0, repulsion: 0.0 })
  const [fluidCfg, setFluidCfg] = useState({ viscosity: 0.2, buoyancy: 1.0, wave: 0.0 })
  const [thermalCfg, setThermalCfg] = useState({ heat: 10, diffusion: 0.1 })
  const [mechanicsCfg, setMechanicsCfg] = useState({ friction: 0.3, restitution: 0.6 })
  const [motionCfg, setMotionCfg] = useState({ drag: 0.02, thrust: 30 })

  useEffect(() => {
    setSimulationSettings({ gravity: { x: 0, y: gravity, z: 0 }, airResistance: damping })
  }, [gravity, damping, setSimulationSettings])

  useEffect(() => {
    setShapes3D(localBodies)
  }, [localBodies, setShapes3D])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      setIsPlaying(false)
    }
  }, [])

  const resetWorld = () => {
    cancelAnimationFrame(rafRef.current)
    setIsPlaying(false)
    setLocalBodies([])
    lastTime.current = performance.now()
  }

  const spawnParticleBurst = () => {
    const now = Date.now()
    const burst = Array.from({ length: 30 }).map((_, i) => ({
      id: `p_${now}_${i}`,
      type: 'sphere',
      position: [Math.random() * 40 - 20, 5 + Math.random() * 10, Math.random() * 40 - 20],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: ['#22c55e', '#3b82f6', '#eab308', '#ef4444'][i % 4],
      params: { radius: 1.2 },
      velocity: { x: (Math.random() - 0.5) * 10, y: Math.random() * 8, z: (Math.random() - 0.5) * 10 },
      isStatic: false,
      mass: 1,
      restitution: particleCfg.elastic ? 0.8 : 0.2,
      friction: 0.2
    }))
    setLocalBodies(prev => [...prev, ...burst])
  }

  const spawnMechanicsSet = () => {
    const base = [
      { id: `ball_${Date.now()}_1`, type: 'sphere', position: [-10, 10, 0], params: { radius: 2 }, mass: 1, restitution: mechanicsCfg.restitution, friction: mechanicsCfg.friction, color: '#3b82f6' },
      { id: `ball_${Date.now()}_2`, type: 'sphere', position: [10, 12, 0], params: { radius: 3 }, mass: 3, restitution: mechanicsCfg.restitution, friction: mechanicsCfg.friction, color: '#22c55e' },
      { id: `cube_${Date.now()}`, type: 'cube', position: [0, 6, 0], params: { width: 5, height: 5, depth: 5 }, mass: 2, restitution: mechanicsCfg.restitution, friction: mechanicsCfg.friction, color: '#eab308' }
    ].map(b => ({ ...b, rotation: [0, 0, 0], scale: [1, 1, 1], isStatic: false }))
    setLocalBodies(prev => [...prev, ...base])
  }

  const spawnFluidObjects = () => {
    const set = [
      { id: `float_${Date.now()}_1`, type: 'cube', position: [0, 2, 0], params: { width: 6, height: 1.2, depth: 6 }, mass: 1, friction: 0.2, restitution: 0.3, color: '#93c5fd', float: true },
      { id: `float_${Date.now()}_2`, type: 'sphere', position: [6, 3, 0], params: { radius: 1.5 }, mass: 0.5, friction: 0.2, restitution: 0.3, color: '#60a5fa', float: true }
    ].map(b => ({ ...b, rotation: [0, 0, 0], scale: [1, 1, 1], isStatic: false }))
    setLocalBodies(prev => [...prev, ...set])
  }

  const spawnMotionSet = () => {
    const t = Date.now()
    const drones = Array.from({ length: 5 }).map((_, i) => ({
      id: `dr_${t}_${i}`,
      type: 'sphere',
      position: [i * 3 - 6, 8 + i, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#f472b6',
      params: { radius: 1 },
      velocity: { x: 0, y: 0, z: 0 },
      thrust: motionCfg.thrust,
      drag: motionCfg.drag,
      isStatic: false,
      mass: 1,
      restitution: 0.4,
      friction: 0.1
    }))
    setLocalBodies(prev => [...prev, ...drones])
  }

  const chaos = () => {
    spawnParticleBurst()
    spawnMechanicsSet()
    spawnFluidObjects()
    spawnMotionSet()
  }

  const stepParticles = (dt) => {
    const g = gravity
    const att = particleCfg.attraction
    const rep = particleCfg.repulsion
    setLocalBodies(prev => prev.map(b => {
      if (b.type !== 'sphere' || b.params?.radius > 2.0) return b
      const v = b.velocity || { x: 0, y: 0, z: 0 }
      v.y -= g * dt
      if (att !== 0 || rep !== 0) {
        const ax = -b.position[0] * att * 0.01
        const az = -b.position[2] * att * 0.01
        v.x += ax * dt
        v.z += az * dt
        const rx = (Math.random() - 0.5) * rep * 0.1
        const rz = (Math.random() - 0.5) * rep * 0.1
        v.x += rx * dt
        v.z += rz * dt
      }
      v.x *= (1 - damping)
      v.y *= (1 - damping)
      v.z *= (1 - damping)
      const nx = b.position[0] + v.x * dt * 10 * timeScale
      const ny = b.position[1] + v.y * dt * 10 * timeScale
      const nz = b.position[2] + v.z * dt * 10 * timeScale
      let py = ny
      if (ny - (b.params?.radius || 1) < simulationSettings.groundY) {
        py = simulationSettings.groundY + (b.params?.radius || 1)
        v.y = -v.y * (particleCfg.elastic ? 0.8 : 0.3)
        v.x *= 0.95
        v.z *= 0.95
      }
      return { ...b, position: [nx, py, nz], velocity: v }
    }))
    if (Math.random() < particleCfg.emissionRate * dt * 0.1) spawnParticleBurst()
  }

  const stepFluid = (dt) => {
    const wave = fluidCfg.wave
    const visc = fluidCfg.viscosity
    const buoy = fluidCfg.buoyancy
    setLocalBodies(prev => prev.map(b => {
      if (!b.float) return b
      const v = b.velocity || { x: 0, y: 0, z: 0 }
      const surface = simulationSettings.groundY + 4 + Math.sin((b.position[0] + performance.now() * 0.002) * 0.5) * wave * 2
      const depth = surface - b.position[1]
      if (depth > 0) v.y += Math.min(depth * buoy, 20) * dt
      v.x *= (1 - visc * dt)
      v.z *= (1 - visc * dt)
      const nx = b.position[0] + v.x * dt * 8
      const ny = b.position[1] + v.y * dt * 8
      const nz = b.position[2] + v.z * dt * 8
      return { ...b, position: [nx, ny, nz], velocity: v }
    }))
  }

  const stepMotion = (dt) => {
    setLocalBodies(prev => prev.map(b => {
      if (!b.thrust) return b
      const v = b.velocity || { x: 0, y: 0, z: 0 }
      const dir = Math.atan2(-b.position[2], -b.position[0])
      v.x += Math.cos(dir) * b.thrust * dt * 0.2
      v.z += Math.sin(dir) * b.thrust * dt * 0.2
      v.x *= (1 - b.drag)
      v.z *= (1 - b.drag)
      const nx = b.position[0] + v.x * dt
      const nz = b.position[2] + v.z * dt
      return { ...b, position: [nx, b.position[1], nz], velocity: v }
    }))
  }

  const loop = (t) => {
    const dt = Math.min(0.05, (t - lastTime.current) / 1000)
    lastTime.current = t
    if (segment === 'particles') stepParticles(dt)
    if (segment === 'fluid') stepFluid(dt)
    if (segment === 'motion') stepMotion(dt)
    rafRef.current = requestAnimationFrame(loop)
  }

  const togglePlay = () => {
    if (isPlaying) {
      cancelAnimationFrame(rafRef.current)
      setIsPlaying(false)
      return
    }
    lastTime.current = performance.now()
    setIsPlaying(true)
    rafRef.current = requestAnimationFrame(loop)
  }

  const saveState = () => {
    const data = { segment, localBodies, gravity, timeScale, damping, particleCfg, fluidCfg, thermalCfg, mechanicsCfg, motionCfg }
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `test_workspace_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const loadState = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        setSegment(data.segment || 'particles')
        setLocalBodies(data.localBodies || [])
        setGravity(data.gravity ?? 9.81)
        setTimeScale(data.timeScale ?? 1.0)
        setDamping(data.damping ?? 0.01)
        setParticleCfg(data.particleCfg || particleCfg)
        setFluidCfg(data.fluidCfg || fluidCfg)
        setThermalCfg(data.thermalCfg || thermalCfg)
        setMechanicsCfg(data.mechanicsCfg || mechanicsCfg)
        setMotionCfg(data.motionCfg || motionCfg)
      } catch { }
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex h-full bg-[#0a0f1a] text-slate-200">
      <div className="w-64 border-r border-white/10 p-3 space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Segments</div>
        <div className="grid grid-cols-1 gap-2">
          <button onClick={() => setSegment('particles')} className={`px-3 py-2 rounded-lg text-left ${segment === 'particles' ? 'bg-primary/20 text-white' : 'bg-white/5 text-slate-400'}`}><Atom size={14} className="inline mr-2" />Particle Lab</button>
          <button onClick={() => setSegment('fluid')} className={`px-3 py-2 rounded-lg text-left ${segment === 'fluid' ? 'bg-primary/20 text-white' : 'bg-white/5 text-slate-400'}`}><Droplets size={14} className="inline mr-2" />Fluid Zone</button>
          <button onClick={() => setSegment('thermal')} className={`px-3 py-2 rounded-lg text-left ${segment === 'thermal' ? 'bg-primary/20 text-white' : 'bg-white/5 text-slate-400'}`}><Flame size={14} className="inline mr-2" />Thermo Chamber</button>
          <button onClick={() => setSegment('mechanics')} className={`px-3 py-2 rounded-lg text-left ${segment === 'mechanics' ? 'bg-primary/20 text-white' : 'bg-white/5 text-slate-400'}`}><Layers size={14} className="inline mr-2" />Collision & Mechanics</button>
          <button onClick={() => setSegment('motion')} className={`px-3 py-2 rounded-lg text-left ${segment === 'motion' ? 'bg-primary/20 text-white' : 'bg-white/5 text-slate-400'}`}><Gauge size={14} className="inline mr-2" />Flow & Motion</button>
        </div>

        <div className="pt-3 border-t border-white/10 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Global</div>
          <label className="block text-[10px] text-slate-400">Gravity: {gravity.toFixed(2)}</label>
          <input type="range" min="0" max="20" step="0.1" value={gravity} onChange={e => setGravity(parseFloat(e.target.value))} />
          <label className="block text-[10px] text-slate-400">Time Scale: {timeScale.toFixed(2)}</label>
          <input type="range" min="0.1" max="3" step="0.1" value={timeScale} onChange={e => setTimeScale(parseFloat(e.target.value))} />
          <label className="block text-[10px] text-slate-400">Damping: {damping.toFixed(2)}</label>
          <input type="range" min="0" max="0.2" step="0.005" value={damping} onChange={e => setDamping(parseFloat(e.target.value))} />
        </div>

        <div className="pt-3 border-t border-white/10 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Test Lab Mode</div>
          <button onClick={chaos} className="w-full px-3 py-2 rounded-lg bg-pink-600/80 hover:bg-pink-600 text-white flex items-center justify-center gap-2"><Shuffle size={14} />Chaos</button>
          <button onClick={resetWorld} className="w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 flex items-center justify-center gap-2"><RotateCcw size={14} />Reset Universe</button>
          <button onClick={saveState} className="w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200">Save State</button>
          <label className="w-full px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-center cursor-pointer">Load State<input className="hidden" type="file" accept=".json" onChange={e => e.target.files?.[0] && loadState(e.target.files[0])} /></label>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-2"><Cpu size={12} />Live | FPS stable</div>
        </div>
      </div>

      <div className="flex-1 relative">
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
          <button onClick={togglePlay} className={`px-3 py-2 rounded-lg ${isPlaying ? 'bg-emerald-500 text-white' : 'bg-primary/20 text-primary'}`}>{isPlaying ? <Square size={14} /> : <Play size={14} />} {isPlaying ? 'Pause' : 'Play'}</button>
          <button onClick={resetWorld} className="px-3 py-2 rounded-lg bg-white/10 text-slate-200"><RotateCcw size={14} /> Reset</button>
          {segment === 'particles' && <button onClick={spawnParticleBurst} className="px-3 py-2 rounded-lg bg-white/10 text-slate-200"><Zap size={14} /> Emit</button>}
          {segment === 'mechanics' && <button onClick={spawnMechanicsSet} className="px-3 py-2 rounded-lg bg-white/10 text-slate-200"><Layers size={14} /> Spawn Set</button>}
          {segment === 'fluid' && <button onClick={spawnFluidObjects} className="px-3 py-2 rounded-lg bg-white/10 text-slate-200"><Droplets size={14} /> Floaters</button>}
          {segment === 'motion' && <button onClick={spawnMotionSet} className="px-3 py-2 rounded-lg bg-white/10 text-slate-200"><Gauge size={14} /> Drones</button>}
        </div>

        <div className="absolute top-3 right-3 z-20 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-[11px]">
          <div className="font-bold uppercase tracking-wider text-slate-400 mb-1">Params</div>
          {segment === 'particles' && (
            <div className="space-y-1">
              <div>Emission {particleCfg.emissionRate}</div>
              <input type="range" min="0" max="60" value={particleCfg.emissionRate} onChange={e => setParticleCfg({ ...particleCfg, emissionRate: parseInt(e.target.value) })} />
              <div>Attract {particleCfg.attraction.toFixed(2)}</div>
              <input type="range" min="0" max="2" step="0.05" value={particleCfg.attraction} onChange={e => setParticleCfg({ ...particleCfg, attraction: parseFloat(e.target.value) })} />
              <div>Repulse {particleCfg.repulsion.toFixed(2)}</div>
              <input type="range" min="0" max="2" step="0.05" value={particleCfg.repulsion} onChange={e => setParticleCfg({ ...particleCfg, repulsion: parseFloat(e.target.value) })} />
            </div>
          )}
          {segment === 'fluid' && (
            <div className="space-y-1">
              <div>Viscosity {fluidCfg.viscosity.toFixed(2)}</div>
              <input type="range" min="0" max="1" step="0.02" value={fluidCfg.viscosity} onChange={e => setFluidCfg({ ...fluidCfg, viscosity: parseFloat(e.target.value) })} />
              <div>Buoyancy {fluidCfg.buoyancy.toFixed(2)}</div>
              <input type="range" min="0" max="3" step="0.05" value={fluidCfg.buoyancy} onChange={e => setFluidCfg({ ...fluidCfg, buoyancy: parseFloat(e.target.value) })} />
              <div>Wave {fluidCfg.wave.toFixed(2)}</div>
              <input type="range" min="0" max="2" step="0.05" value={fluidCfg.wave} onChange={e => setFluidCfg({ ...fluidCfg, wave: parseFloat(e.target.value) })} />
            </div>
          )}
          {segment === 'mechanics' && (
            <div className="space-y-1">
              <div>Friction {mechanicsCfg.friction.toFixed(2)}</div>
              <input type="range" min="0" max="1" step="0.05" value={mechanicsCfg.friction} onChange={e => setMechanicsCfg({ ...mechanicsCfg, friction: parseFloat(e.target.value) })} />
              <div>Restitution {mechanicsCfg.restitution.toFixed(2)}</div>
              <input type="range" min="0" max="1" step="0.05" value={mechanicsCfg.restitution} onChange={e => setMechanicsCfg({ ...mechanicsCfg, restitution: parseFloat(e.target.value) })} />
            </div>
          )}
          {segment === 'motion' && (
            <div className="space-y-1">
              <div>Thrust {motionCfg.thrust}</div>
              <input type="range" min="0" max="60" step="1" value={motionCfg.thrust} onChange={e => setMotionCfg({ ...motionCfg, thrust: parseInt(e.target.value) })} />
              <div>Drag {motionCfg.drag.toFixed(2)}</div>
              <input type="range" min="0" max="0.2" step="0.01" value={motionCfg.drag} onChange={e => setMotionCfg({ ...motionCfg, drag: parseFloat(e.target.value) })} />
            </div>
          )}
        </div>

        <div className="absolute inset-0">
          <Viewport3D objects={[]} isSimulating={isPlaying} />
        </div>
      </div>
    </div>
  )
}