import {
    SIM_UNITS,
    clamp,
    isFiniteNumber,
    isFiniteVec2,
    smoothstep,
    createSimulationLogger
} from './simulationSafety'

const parseV6Part = (shapeId) => {
    const m = shapeId.match(/v6_(crank_throw|con_rod|piston)_(\d+)/)
    if (!m) return null
    return { partType: m[1], index: parseInt(m[2], 10) }
}

export default class V6RenderAdapter {
    constructor(options = {}) {
        this.unitsPerMm = options.unitsPerMm ?? SIM_UNITS.WORLD_UNITS_PER_MM
        this.rodMin = options.rodMin ?? SIM_UNITS.V6_ROD_LENGTH_MIN
        this.rodMax = options.rodMax ?? SIM_UNITS.V6_ROD_LENGTH_MAX
        this.prevTransforms = new Map()
        this.currTransforms = new Map()
        this.lastValidTransforms = new Map()
        this.lastPistonPosByCylinder = new Map()
        this.invalidShapeIds = new Set()
        this.frame = 0
        this.logger = createSimulationLogger('V6RenderAdapter', { throttleFrames: 30 })
    }

    computePistonFromSliderCrank(crankAngle, bankRad, zPos, config = {}) {
        const rMm = config.crankRadius ?? SIM_UNITS.V6_CRANK_RADIUS_MM
        const lMm = config.rodLength ?? SIM_UNITS.V6_ROD_LENGTH_MM
        const r = rMm * this.unitsPerMm
        const l = lMm * this.unitsPerMm

        const sinTheta = Math.sin(crankAngle)
        const cosTheta = Math.cos(crankAngle)
        const underRoot = (l * l) - ((r * sinTheta) * (r * sinTheta))
        if (!isFiniteNumber(underRoot) || underRoot < 0) return null
        const x = (r * cosTheta) + Math.sqrt(underRoot)
        if (!isFiniteNumber(x)) return null

        const axis = { x: Math.sin(bankRad), y: -Math.cos(bankRad) }
        const pistonPos = { x: axis.x * x, y: axis.y * x, z: zPos }
        return { pistonPos, r, l }
    }

    getCylinderAngle(snap, cyl) {
        const base = (snap.crankAngle || 0) + (cyl.phaseOffset ?? 0)
        const cycle = ((snap.time || 0) * 0.6) % 1
        const easedCycle = smoothstep(cycle)
        const easedDelta = (easedCycle - cycle) * 0.04
        const wobble = Math.sin((snap.time || 0) * 2) * 0.01
        return base + easedDelta + wobble
    }

    getLaggedPistonPosition(cylinderIndex, computedPos) {
        const prev = this.lastPistonPosByCylinder.get(cylinderIndex) || computedPos
        const lag = 0.85
        const next = {
            x: prev.x + (computedPos.x - prev.x) * lag,
            y: prev.y + (computedPos.y - prev.y) * lag,
            z: prev.z + (computedPos.z - prev.z) * lag
        }
        this.lastPistonPosByCylinder.set(cylinderIndex, next)
        return next
    }

    validateTransform(transform) {
        const pos = transform?.position
        const rot = transform?.rotation
        const scl = transform?.scale
        if (!pos || !rot || !scl) return false
        return pos.every(isFiniteNumber) && rot.every(isFiniteNumber) && scl.every(isFiniteNumber)
    }

    fallback(shapeId) {
        return this.lastValidTransforms.get(shapeId) || null
    }

    snapshotToTransforms(snap, shapes, dt, config = {}) {
        this.frame += 1
        this.prevTransforms = this.currTransforms
        this.currTransforms = new Map()
        this.invalidShapeIds.clear()

        if (!snap || !Array.isArray(snap.cylinders)) {
            this.logger.log(this.frame, 'invalid_snapshot', { dt, snapTime: snap?.time })
            return
        }

        shapes.forEach((shape) => {
            let next = null
            if (shape.id === 'v6_crankshaft' || shape.id === 'v6_flywheel') {
                const angle = (snap.crankAngle || 0) + Math.sin((snap.time || 0) * 2) * 0.01
                if (isFiniteNumber(angle)) {
                    next = {
                        position: Array.isArray(shape.position) ? [...shape.position] : [0, 0, 0],
                        rotation: [Math.PI / 2, angle, 0],
                        scale: Array.isArray(shape.scale) ? [...shape.scale] : [1, 1, 1]
                    }
                }
            } else {
                const parsed = parseV6Part(shape.id)
                if (parsed && parsed.index < 6) {
                    const cyl = snap.cylinders[parsed.index]
                    if (cyl) {
                        const zPos = Array.isArray(shape.position) ? shape.position[2] : 0
                        if (parsed.partType === 'crank_throw') {
                            if (isFiniteVec2(cyl.crankPinPos)) {
                                next = {
                                    position: [cyl.crankPinPos.x * this.unitsPerMm, cyl.crankPinPos.y * this.unitsPerMm, zPos],
                                    rotation: Array.isArray(shape.rotation) ? [...shape.rotation] : [Math.PI / 2, 0, 0],
                                    scale: Array.isArray(shape.scale) ? [...shape.scale] : [1, 1, 1]
                                }
                            }
                        } else if (parsed.partType === 'piston') {
                            const derived = this.computePistonFromSliderCrank(
                                this.getCylinderAngle(snap, cyl),
                                cyl.bankRad ?? 0,
                                zPos,
                                config
                            )
                            if (derived && isFiniteVec2(derived.pistonPos)) {
                                const laggedPiston = this.getLaggedPistonPosition(parsed.index, derived.pistonPos)
                                next = {
                                    position: [laggedPiston.x, laggedPiston.y, zPos],
                                    rotation: Array.isArray(shape.rotation) ? [...shape.rotation] : [0, 0, 0],
                                    scale: Array.isArray(shape.scale) ? [...shape.scale] : [1, 1, 1]
                                }
                            }
                        } else if (parsed.partType === 'con_rod') {
                            const derived = this.computePistonFromSliderCrank(
                                this.getCylinderAngle(snap, cyl),
                                cyl.bankRad ?? 0,
                                zPos,
                                config
                            )
                            if (derived && isFiniteVec2(cyl.crankPinPos)) {
                                const crankPin = {
                                    x: cyl.crankPinPos.x * this.unitsPerMm,
                                    y: cyl.crankPinPos.y * this.unitsPerMm
                                }
                                const laggedPiston = this.getLaggedPistonPosition(parsed.index, derived.pistonPos)
                                const piston = { x: laggedPiston.x, y: laggedPiston.y }
                                const mx = (crankPin.x + piston.x) * 0.5
                                const my = (crankPin.y + piston.y) * 0.5
                                const dx = piston.x - crankPin.x
                                const dy = piston.y - crankPin.y
                                const rawLen = Math.sqrt(dx * dx + dy * dy)
                                const clampedLen = clamp(rawLen, this.rodMin, this.rodMax)
                                if (isFiniteNumber(clampedLen)) {
                                    next = {
                                        position: [mx, my, zPos],
                                        rotation: [0, 0, Math.atan2(dy, dx) + Math.PI / 2],
                                        scale: Array.isArray(shape.scale) ? [...shape.scale] : [1, 1, 1],
                                        rodHeight: clampedLen
                                    }
                                    if (rawLen !== clampedLen) {
                                        this.logger.log(this.frame, 'rod_length_clamped', {
                                            dt,
                                            shapeId: shape.id,
                                            rawLen,
                                            clampedLen
                                        })
                                    }
                                    const expectedLen = derived.l
                                    if (Math.abs(rawLen - expectedLen) > 2.5) {
                                        this.logger.log(this.frame, 'rod_linkage_deviation', {
                                            dt,
                                            shapeId: shape.id,
                                            expectedLen,
                                            actualLen: rawLen,
                                            crankPin,
                                            piston
                                        })
                                    }
                                    this.logger.log(this.frame, 'linkage_state', {
                                        dt,
                                        shapeId: shape.id,
                                        rodLength: rawLen,
                                        pistonPos: piston,
                                        crankPos: crankPin
                                    }, 'info')
                                }
                            }
                        }
                    }
                }
            }

            if (!this.validateTransform(next)) {
                const fb = this.fallback(shape.id)
                if (fb) {
                    this.currTransforms.set(shape.id, fb)
                    this.invalidShapeIds.add(shape.id)
                    this.logger.log(this.frame, 'fallback_transform', { dt, shapeId: shape.id })
                }
                return
            }
            this.currTransforms.set(shape.id, next)
            this.lastValidTransforms.set(shape.id, next)
        })
    }

    getInterpolatedTransforms(alpha) {
        const a = smoothstep(clamp(alpha, 0, 1))
        const out = new Map()
        this.currTransforms.forEach((curr, id) => {
            const prev = this.prevTransforms.get(id) || curr
            const interp = {
                position: [
                    prev.position[0] + (curr.position[0] - prev.position[0]) * a,
                    prev.position[1] + (curr.position[1] - prev.position[1]) * a,
                    prev.position[2] + (curr.position[2] - prev.position[2]) * a
                ],
                rotation: [
                    prev.rotation[0] + (curr.rotation[0] - prev.rotation[0]) * a,
                    prev.rotation[1] + (curr.rotation[1] - prev.rotation[1]) * a,
                    prev.rotation[2] + (curr.rotation[2] - prev.rotation[2]) * a
                ],
                scale: [
                    prev.scale[0] + (curr.scale[0] - prev.scale[0]) * a,
                    prev.scale[1] + (curr.scale[1] - prev.scale[1]) * a,
                    prev.scale[2] + (curr.scale[2] - prev.scale[2]) * a
                ],
                rodHeight: isFiniteNumber(curr.rodHeight) ? curr.rodHeight : prev.rodHeight
            }
            if (!this.validateTransform(interp)) {
                const fb = this.fallback(id)
                if (fb) out.set(id, fb)
                return
            }
            out.set(id, interp)
        })
        return out
    }

    apply(shapes, transforms) {
        return shapes.map((shape) => {
            const tr = transforms.get(shape.id)
            if (!tr) return shape
            const next = {
                ...shape,
                position: tr.position,
                rotation: tr.rotation,
                scale: tr.scale
            }
            if (isFiniteNumber(tr.rodHeight) && shape.id.includes('v6_con_rod_')) {
                next.params = { ...shape.params, height: tr.rodHeight }
            }
            if (this.invalidShapeIds.has(shape.id)) {
                next.color = '#ef4444'
                next.emissiveIntensity = 0.4
            }
            return next
        })
    }
}
