import { useMemo } from 'react'
import * as THREE from 'three'
import useStore from '../store/useStore'

const VEL_COLOR = 0x38bdf8
const FORCE_COLOR = 0xfbbf24

const Arrow = ({ origin, dir, color, scale }) => {
  const dirLen = Math.max(
    Math.abs(dir[0]),
    Math.abs(dir[1]),
    Math.abs(dir[2]),
  )
  if (dirLen * scale < 0.05) return null

  const normScale = 1.0 / (Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2) || 1)
  const length = dirLen * scale
  const headLength = Math.min(2.5, length * 0.35)
  const headWidth = headLength * 0.5

  return (
    <group position={[origin[0], origin[1], origin[2]]}>
      <arrowHelper
        args={[
          new THREE.Vector3(dir[0] * normScale, dir[1] * normScale, dir[2] * normScale),
          new THREE.Vector3(0, 0, 0),
          length,
          color,
          headLength,
          headWidth,
        ]}
      />
    </group>
  )
}

const VectorOverlay = () => {
  const settings = useStore(s => s.analysisSettings)
  const simulationFrames = useStore(s => s.simulationFrames)
  const currentFrameIndex = useStore(s => s.currentFrameIndex)

  const frame = simulationFrames[currentFrameIndex]

  const { vecs } = useMemo(() => {
    if (!frame || (!settings.showVectors && !settings.showForces)) return { vecs: [] }
    const vScale = settings.vectorScale ?? 2.0

    const vecs = (frame.states || []).map(st => {
      const p = st.position
      const origin = [p.x, p.y, p.z + 2.5]

      const items = []
      if (settings.showVectors) {
        const v = st.linear_velocity || {}
        items.push({
          key: `v-${st.id}`,
          origin,
          dir: [v.x || 0, v.y || 0, v.z || 0],
          color: VEL_COLOR,
          scale: vScale,
        })
      }
      if (settings.showForces && st.force) {
        const f = st.force
        items.push({
          key: `f-${st.id}`,
          origin,
          dir: [f.x || 0, f.y || 0, f.z || 0],
          color: FORCE_COLOR,
          scale: 0.045,
        })
      }
      return items
    }).flat()

    return { vecs }
  }, [frame, settings.showVectors, settings.showForces, settings.vectorScale])

  if (!settings.showVectors && !settings.showForces) return null

  return (
    <group>
      {vecs.map(v => (
        <Arrow key={v.key} {...v} />
      ))}
    </group>
  )
}

export default VectorOverlay