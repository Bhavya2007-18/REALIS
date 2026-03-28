import {
    clamp,
    isFiniteNumber,
    isFiniteVec3,
    toVec3,
    createSimulationLogger
} from '../simulationSafety'

const normalize = (v) => {
    const len = Math.hypot(v.x, v.y, v.z);
    if (!len || len < 1e-6) return { x: 0, y: 0, z: 1 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
};

const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;

const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });

const mul = (v, s) => ({ x: v.x * s, y: v.y * s, z: v.z * s });

const lerp = (a, b, t) => a + (b - a) * t;

const lerpVec = (a, b, t) => ({
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
});

const smoothstep = (t) => {
    const u = clamp(t, 0, 1);
    return u * u * (3 - 2 * u);
};

const vecToArr = (v) => [v.x, v.y, v.z];

const isShaft = (shape) => {
    const key = `${shape.id || ''} ${shape.label || ''}`.toLowerCase();
    return key.includes('shaft');
};

const isRing = (shape) => {
    const key = `${shape.id || ''} ${shape.label || ''}`.toLowerCase();
    return key.includes('ring');
};

export default class MechanicalAssemblySolver {
    constructor(options = {}) {
        this.dt = options.dt ?? 0.016;
        this.substeps = options.substeps ?? 4;
        this.accumulator = 0;
        this.time = 0;
        this.shaftId = null;
        this.ringIds = [];
        this.states = new Map();
        this.previousStates = new Map();
        this.running = false;
        this.frame = 0;
        this.logger = createSimulationLogger('MechanicalAssemblySolver', { throttleFrames: 30 });
    }

    initialize(shapes = []) {
        this.shaftId = null;
        this.ringIds = [];
        this.states.clear();
        this.previousStates.clear();
        this.accumulator = 0;
        this.time = 0;

        const shaft = shapes.find(isShaft);
        if (!shaft) {
            this.running = false;
            return false;
        }

        this.shaftId = shaft.id;
        const shaftPos = toVec3(shaft.position);
        const shaftAxis = normalize(
            toVec3(shaft.meta?.shaftAxis || shaft.axis || { x: 0, y: 0, z: 1 })
        );
        const shaftState = {
            id: shaft.id,
            kind: 'shaft',
            origin: shaftPos,
            axis: shaftAxis,
            position: shaftPos,
            previousPosition: shaftPos,
            angle: 0,
            previousAngle: 0,
            angularVelocity: shaft.meta?.angularVelocity ?? 1.4,
            angularAcceleration: 0,
        };
        this.states.set(shaft.id, shaftState);
        this.previousStates.set(shaft.id, { ...shaftState });

        const rings = shapes.filter(isRing);
        rings.forEach((ring, index) => {
            this.ringIds.push(ring.id);
            const ringPos = toVec3(ring.position);
            const rel = sub(ringPos, shaftPos);
            const projected = dot(rel, shaftAxis);
            const span = ring.meta?.travelRange ?? [-80, 80];
            const minProj = Math.min(span[0], span[1]);
            const maxProj = Math.max(span[0], span[1]);
            const clampedProj = clamp(projected, minProj, maxProj);
            const constrainedPos = add(shaftPos, mul(shaftAxis, clampedProj));
            const phase = ring.meta?.phase ?? index * 0.6;
            const speed = ring.meta?.slideSpeed ?? 0.35 + index * 0.08;
            const ringState = {
                id: ring.id,
                kind: 'ring',
                axis: shaftAxis,
                origin: shaftPos,
                position: constrainedPos,
                previousPosition: constrainedPos,
                velocity: { x: 0, y: 0, z: 0 },
                acceleration: { x: 0, y: 0, z: 0 },
                axisPos: clampedProj,
                axisVel: 0,
                axisAccel: 0,
                minProj,
                maxProj,
                phase,
                speed,
                mode: ring.meta?.motionMode ?? 'eased',
            };
            this.states.set(ring.id, ringState);
            this.previousStates.set(ring.id, { ...ringState });
        });

        this.running = this.ringIds.length > 0;
        return this.running;
    }

    hasMechanicalAssembly() {
        return this.running;
    }

    tick(realDt) {
        if (!this.running) return { alpha: 0, states: new Map() };
        const safeDt = clamp(realDt, 0, 0.05);
        if (!isFiniteNumber(safeDt)) {
            this.logger.log(this.frame, 'invalid_real_dt', { realDt });
            return { alpha: 0, states: new Map(), time: this.time };
        }
        this.frame += 1;
        this.accumulator += safeDt;
        while (this.accumulator >= this.dt) {
            for (let i = 0; i < this.substeps; i++) {
                this.step(this.dt / this.substeps);
            }
            this.accumulator -= this.dt;
        }
        const alpha = clamp(this.accumulator / this.dt, 0, 1);
        return {
            alpha,
            states: this.getInterpolatedStates(alpha),
            time: this.time,
        };
    }

    step(stepDt) {
        const shaft = this.states.get(this.shaftId);
        if (!shaft) return;

        this.previousStates.forEach((_, id) => {
            const st = this.states.get(id);
            this.previousStates.set(id, {
                ...st,
                position: { ...st.position },
                velocity: st.velocity ? { ...st.velocity } : undefined,
                acceleration: st.acceleration ? { ...st.acceleration } : undefined,
            });
        });

        shaft.previousAngle = shaft.angle;
        shaft.previousPosition = shaft.position;
        shaft.angularVelocity += shaft.angularAcceleration * stepDt;
        shaft.angularVelocity *= 0.99;
        shaft.angle += shaft.angularVelocity * stepDt;

        this.ringIds.forEach((id) => {
            const ring = this.states.get(id);
            const waveT = 0.5 + 0.5 * Math.sin((this.time + ring.phase) * ring.speed * Math.PI * 2);
            const easedT = smoothstep(waveT);
            const targetAxisPos = lerp(ring.minProj, ring.maxProj, easedT);

            if (ring.mode === 'force') {
                const springK = 28;
                const damper = 7;
                ring.axisAccel = springK * (targetAxisPos - ring.axisPos) - damper * ring.axisVel;
                ring.axisVel += ring.axisAccel * stepDt;
                ring.axisVel *= 0.98;
                ring.axisPos += ring.axisVel * stepDt;
            } else {
                const desiredVel = (targetAxisPos - ring.axisPos) * 8;
                ring.axisAccel = (desiredVel - ring.axisVel) * 10;
                ring.axisVel += ring.axisAccel * stepDt;
                ring.axisVel *= 0.98;
                ring.axisPos += ring.axisVel * stepDt;
            }

            ring.axisPos = clamp(ring.axisPos, ring.minProj, ring.maxProj);
            const unconstrained = add(ring.origin, mul(ring.axis, ring.axisPos));
            const relative = sub(unconstrained, ring.origin);
            const proj = dot(relative, ring.axis);
            ring.position = add(ring.origin, mul(ring.axis, proj));
            ring.velocity = mul(ring.axis, ring.axisVel);
            ring.acceleration = mul(ring.axis, ring.axisAccel);
            if (!isFiniteVec3(ring.position)) {
                this.logger.log(this.frame, 'invalid_ring_position', {
                    id: ring.id,
                    axisPos: ring.axisPos,
                    axisVel: ring.axisVel,
                    axisAccel: ring.axisAccel,
                });
                ring.axisPos = clamp(0, ring.minProj, ring.maxProj);
                ring.axisVel = 0;
                ring.axisAccel = 0;
                ring.position = add(ring.origin, mul(ring.axis, ring.axisPos));
            }
        });

        this.time += stepDt;
    }

    getInterpolatedStates(alpha) {
        const renderStates = new Map();
        this.states.forEach((current, id) => {
            const previous = this.previousStates.get(id) || current;
            const position = lerpVec(previous.position, current.position, alpha);
            const angle = lerp(previous.angle || 0, current.angle || 0, alpha);
            if (!isFiniteVec3(position) || !isFiniteNumber(angle)) {
                this.logger.log(this.frame, 'invalid_interpolated_state', { id, position, angle, alpha });
                renderStates.set(id, {
                    position: isFiniteVec3(current.position) ? current.position : { x: 0, y: 0, z: 0 },
                    angle: isFiniteNumber(current.angle) ? current.angle : 0,
                });
                return;
            }
            renderStates.set(id, { position, angle });
        });
        return renderStates;
    }

    applyToShapes(shapes, renderStates) {
        return shapes.map((shape) => {
            const render = renderStates.get(shape.id);
            if (!render) return shape;
            if (shape.id === this.shaftId) {
                const baseRotation = Array.isArray(shape.rotation) ? [...shape.rotation] : [0, 0, 0];
                baseRotation[1] = render.angle;
                return {
                    ...shape,
                    position: vecToArr(render.position),
                    rotation: baseRotation,
                };
            }
            return {
                ...shape,
                position: vecToArr(render.position),
            };
        });
    }
}
