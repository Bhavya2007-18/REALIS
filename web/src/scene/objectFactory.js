let nextId = 1

const DEFAULTS = {
    circle: {
        type: 'circle',
        radius: 30,
        color: '#4b7cf3',
    },
    box: {
        type: 'box',
        width: 60,
        height: 60,
        color: '#22c55e',
    },
    particle: {
        type: 'particle',
        radius: 6,
        color: '#eab308',
    },
}

export function createObject(type, overrides = {}) {
    const base = DEFAULTS[type]
    if (!base) throw new Error(`Unknown object type: ${type}`)

    const id = `obj_${nextId++}`
    return {
        id,
        name: `${type}_${nextId - 1}`,
        ...base,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        mass: 1,
        restitution: 0.8,
        friction: 0.3,
        fixed: false,
        ...overrides,
    }
}

export const OBJECT_TYPES = Object.keys(DEFAULTS)
