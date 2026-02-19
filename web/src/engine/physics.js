/**
 * REALIS Client-Side Physics Engine
 * RK4 integrator · gravity · damping · floor collision
 */

const FLOOR_Y = 300

export function createEngineState() {
    return {
        time: 0,
        gravity: 9.81,
        damping: 0.001,
        dt: 1 / 60,
        subSteps: 1,
        floorY: FLOOR_Y,
    }
}

export function stepSimulation(objects, engine) {
    const dt = engine.dt / engine.subSteps

    for (let sub = 0; sub < engine.subSteps; sub++) {
        const updated = objects.map((obj) => {
            if (obj.fixed) return obj

            const state = rk4Step(
                { x: obj.x, y: obj.y, vx: obj.vx, vy: obj.vy },
                dt,
                obj.mass,
                engine.gravity,
                engine.damping,
            )

            let { x, y, vx, vy } = state

            // Floor collision
            const bottom = getBottom(obj, y)
            if (bottom >= engine.floorY) {
                y = engine.floorY - getHalfHeight(obj)
                vy = -vy * obj.restitution
                vx *= (1 - obj.friction)
                if (Math.abs(vy) < 0.5) vy = 0
            }

            return { ...obj, x, y, vx, vy }
        })

        objects = updated
    }

    return objects
}

function rk4Step(s, dt, mass, gravity, damping) {
    function deriv(state) {
        return {
            dx: state.vx,
            dy: state.vy,
            dvx: -damping * state.vx,
            dvy: gravity - damping * state.vy,
        }
    }

    const k1 = deriv(s)
    const k2 = deriv({
        x: s.x + k1.dx * dt / 2, y: s.y + k1.dy * dt / 2,
        vx: s.vx + k1.dvx * dt / 2, vy: s.vy + k1.dvy * dt / 2,
    })
    const k3 = deriv({
        x: s.x + k2.dx * dt / 2, y: s.y + k2.dy * dt / 2,
        vx: s.vx + k2.dvx * dt / 2, vy: s.vy + k2.dvy * dt / 2,
    })
    const k4 = deriv({
        x: s.x + k3.dx * dt, y: s.y + k3.dy * dt,
        vx: s.vx + k3.dvx * dt, vy: s.vy + k3.dvy * dt,
    })

    return {
        x: s.x + (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx),
        y: s.y + (dt / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy),
        vx: s.vx + (dt / 6) * (k1.dvx + 2 * k2.dvx + 2 * k3.dvx + k4.dvx),
        vy: s.vy + (dt / 6) * (k1.dvy + 2 * k2.dvy + 2 * k3.dvy + k4.dvy),
    }
}

function getBottom(obj, y) {
    if (obj.type === 'box') return y + (obj.height || 60) / 2
    return y + (obj.radius || 6)
}

function getHalfHeight(obj) {
    if (obj.type === 'box') return (obj.height || 60) / 2
    return obj.radius || 6
}

export function computeEnergy(objects, gravity) {
    let kinetic = 0
    let potential = 0
    for (const obj of objects) {
        if (obj.fixed) continue
        const speed2 = obj.vx * obj.vx + obj.vy * obj.vy
        kinetic += 0.5 * obj.mass * speed2
        potential += obj.mass * gravity * -obj.y
    }
    return { kinetic, potential, total: kinetic + potential }
}
