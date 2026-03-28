export const SIM_UNITS = {
    TARGET_FRAME_DT: 0.016,
    WORLD_UNITS_PER_MM: 0.2,
    V6_CRANK_RADIUS_MM: 45,
    V6_ROD_LENGTH_MM: 130,
    V6_ROD_LENGTH_MIN: 8,
    V6_ROD_LENGTH_MAX: 60
}

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

export const isFiniteNumber = (value) => Number.isFinite(value) && !Number.isNaN(value)

export const isFiniteVec2 = (value) => value && isFiniteNumber(value.x) && isFiniteNumber(value.y)

export const isFiniteVec3 = (value) => value && isFiniteNumber(value.x) && isFiniteNumber(value.y) && isFiniteNumber(value.z)

export const lerp = (a, b, t) => a + (b - a) * t

export const smoothstep = (t) => {
    const u = clamp(t, 0, 1)
    return u * u * (3 - 2 * u)
}

export const lerpVec3 = (a, b, t) => ({
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t)
})

export const toVec3 = (value, fallback = { x: 0, y: 0, z: 0 }) => {
    if (!value) return fallback
    if (Array.isArray(value)) {
        return { x: value[0] || 0, y: value[1] || 0, z: value[2] || 0 }
    }
    return { x: value.x || 0, y: value.y || 0, z: value.z || 0 }
}

export const createSimulationLogger = (namespace, options = {}) => {
    const throttleFrames = options.throttleFrames ?? 60
    const enabled = options.enabled ?? true
    const lastFrameByKey = new Map()

    const log = (frame, key, payload = {}, level = 'warn') => {
        if (!enabled) return
        const last = lastFrameByKey.get(key) ?? -Infinity
        if (frame - last < throttleFrames) return
        lastFrameByKey.set(key, frame)
        const entry = {
            ns: namespace,
            frame,
            key,
            ...payload
        }
        if (level === 'error') console.error(entry)
        else if (level === 'info') console.info(entry)
        else console.warn(entry)
    }

    return { log }
}
