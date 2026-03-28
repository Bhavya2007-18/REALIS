import useStore from '../store/useStore';

let gridW = 0;
let gridH = 0;
let cellSize = 5;
let origin = { x: -100, z: -100 };
let heights = [];
let velocities = [];

function ensureHeightfield() {
    const water = useStore.getState().water;
    const g = Math.max(8, water?.ripple?.grid || 40);
    const s = Math.max(50, water?.ripple?.size || 200);
    if (gridW !== g || gridH !== g || cellSize !== Math.max(1, Math.floor(s / g))) {
        gridW = g;
        gridH = g;
        cellSize = Math.max(1, Math.floor(s / g));
        origin = { x: -Math.floor((gridW * cellSize) / 2), z: -Math.floor((gridH * cellSize) / 2) };
        heights = new Array(gridW * gridH).fill(0);
        velocities = new Array(gridW * gridH).fill(0);
        useStore.getState().setWater({ heightfield: { grid: gridW, size: s, cellSize, origin } });
    }
}

function idx(ix, iz) {
    if (ix < 0 || iz < 0 || ix >= gridW || iz >= gridH) return -1;
    return iz * gridW + ix;
}

function worldToGrid(x, z) {
    const ix = Math.floor((x - origin.x) / cellSize);
    const iz = Math.floor((z - origin.z) / cellSize);
    return { ix, iz };
}

export function stepWater(dt, bodies) {
    ensureHeightfield();
    const water = useStore.getState().water;
    const k = water?.ripple?.stiffness ?? 0.015;
    const d = water?.ripple?.damping ?? 0.04;
    const activeRadius = 180;

    const preset = useStore.getState().simulationPreset;
    if (preset === 'ashwins_workplace') {
        const ctrl = useStore.getState().boatControl;
        if (ctrl?.enabled || (ctrl?.thrust || 0) > 0) {
            const boat = bodies?.find(b => b.id === 'ship_hull_bottom') || bodies?.find(b => (b.name || '').toLowerCase().includes('ship'));
            if (boat) {
                const w = boat.params?.width || 40;
                const propX = (boat.position?.x || 0) - w / 2 - 2;
                const propZ = (boat.position?.z || 0) + (ctrl?.steer || 0) * 0.5;
                const propArea = Math.PI * 2 * 2;
                const rho = water?.density ?? 1000;
                const vJet = Math.min(8, Math.max(0, ctrl?.thrust || 0) * 0.02);
                const dir = { x: -1, z: (ctrl?.steer || 0) * 0.3 };

                const { ix, iz } = worldToGrid(propX, propZ);
                for (let oz = -3; oz <= 3; oz++) {
                    for (let ox = -4; ox <= 4; ox++) {
                        const gi = idx(ix + ox, iz + oz);
                        if (gi < 0) continue;
                        const r2 = ox * ox + oz * oz;
                        const falloff = Math.exp(-r2 / 6);
                        
                        const dirBias = ox < 0 ? 1.0 : -0.3;
                        const impulse = vJet * 0.01 * falloff * dirBias;
                        const newH = (heights[gi] || 0) + impulse;
                        heights[gi] = Math.max(-5, Math.min(5, newH));
                    }
                }

                const massFlow = rho * propArea * vJet;
                const dv = vJet;
                const thrust = massFlow * dv * 0.002;
                boat.externalForce = {
                    x: thrust,
                    y: 0,
                    z: dir.z * thrust * 0.5
                };
                const lever = (w / 2) * 0.05;
                boat.externalTorque = { z: -thrust * lever };
            } else if (boat) {
                boat.externalForce = null;
                boat.externalTorque = null;
            }
        }
    }

    const nextVel = velocities.slice();
    
    let centerX = 0, centerZ = 0;
    const boatForWindow = bodies?.find(b => b.id === 'ship_hull_bottom') || null;
    if (boatForWindow) {
        centerX = boatForWindow.position?.x || 0;
        centerZ = boatForWindow.position?.z || 0;
    }
    const { ix: cix, iz: ciz } = worldToGrid(centerX, centerZ);
    const radiusCells = Math.ceil(activeRadius / cellSize);
    const minX = Math.max(0, cix - radiusCells);
    const maxX = Math.min(gridW - 1, cix + radiusCells);
    const minZ = Math.max(0, ciz - radiusCells);
    const maxZ = Math.min(gridH - 1, ciz + radiusCells);

    for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
            const i = idx(x, z);
            const hC = heights[i];
            const hL = x > 0 ? heights[idx(x - 1, z)] : hC;
            const hR = x < gridW - 1 ? heights[idx(x + 1, z)] : hC;
            const hU = z > 0 ? heights[idx(x, z - 1)] : hC;
            const hD = z < gridH - 1 ? heights[idx(x, z + 1)] : hC;
            const lap = (hL + hR + hU + hD - 4 * hC);
            const v = (velocities[i] + k * lap) * (1 - d);
            nextVel[i] = v;
        }
    }
    velocities = nextVel;
    for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
            const i = idx(x, z);
            heights[i] += velocities[i] * dt;
            heights[i] *= 0.999;
        }
    }

    useStore.getState().setWater({ heightfield: { ...useStore.getState().water.heightfield, heights } });
}

export function applyWaterForces(bodies, water, gravity) {
    ensureHeightfield();
    const rho = water?.density ?? 1000;
    const g = Math.abs(gravity?.y ?? 9.81);
    const activeRadius = 200;
    const boat = bodies?.find(b => b.id === 'ship_hull_bottom') || null;
    const bx = boat?.position?.x || 0;
    const bz = boat?.position?.z || 0;
    bodies.forEach(b => {
        if (b.isStatic) return;
        const pos = b.position || { x: b.cx || 0, y: b.cy || 0, z: 0 };
        const dx = pos.x - bx;
        const dz = (pos.z || 0) - bz;
        const dist2 = dx * dx + dz * dz;
        if (b.id !== 'ship_hull_bottom' && dist2 > activeRadius * activeRadius) return;
        const dimY = b.params?.height || b.dimensions?.y || (b.radius ? b.radius * 2 : 10);
        const dimX = b.params?.width || b.dimensions?.x || (b.radius ? b.radius * 2 : 10);
        const dimZ = b.params?.depth || b.dimensions?.z || (b.radius ? b.radius * 2 : 10);

        const { ix, iz } = worldToGrid(pos.x, pos.z || 0);
        let h = useStore.getState().water.level || 0;
        let samples = 0;
        for (let oz = -1; oz <= 1; oz++) {
            for (let ox = -1; ox <= 1; ox++) {
                const gi = idx(ix + ox, iz + oz);
                if (gi >= 0) { h += heights[gi] || 0; samples++; }
            }
        }
        if (samples > 0) h /= (samples + 1);

        let vx = 0, vz = 0;
        const giC = idx(ix, iz);
        const giL = idx(ix - 1, iz);
        const giR = idx(ix + 1, iz);
        const giU = idx(ix, iz - 1);
        const giD = idx(ix, iz + 1);
        const hC = giC >= 0 ? (heights[giC] || 0) : 0;
        const hL = giL >= 0 ? (heights[giL] || 0) : hC;
        const hR = giR >= 0 ? (heights[giR] || 0) : hC;
        const hU = giU >= 0 ? (heights[giU] || 0) : hC;
        const hD = giD >= 0 ? (heights[giD] || 0) : hC;
        vx = -(hR - hL) / Math.max(cellSize, 1);
        vz = -(hD - hU) / Math.max(cellSize, 1);

        const bottom = pos.y - dimY / 2;
        const subDepth = Math.max(0, h - bottom);
        const subHeight = Math.min(subDepth, dimY);
        const fraction = Math.max(0, Math.min(1, subHeight / dimY));
        if (fraction > 0) {
            const volume = (dimX * dimZ * dimY);
            const displaced = volume * fraction;
            const Fb = rho * g * displaced * 0.00015;
            const mInv = 1 / Math.max(b.mass || 1, 1e-6);
            b.acceleration.y -= Fb * mInv; 
            if (b.acceleration.y < -(g * 0.6)) b.acceleration.y = -(g * 0.6);

            const v = b.velocity || { x: 0, y: 0, z: 0 };
            let CdLin = water?.linearDrag ?? 0.8;
            let CdQuad = water?.quadDrag ?? 0.2;
            if (b.id === 'ship_hull_bottom') {
                CdLin *= 0.3;
                CdQuad *= 0.3;
            }
            const areaX = dimY * dimZ;
            const areaZ = dimX * dimY;
            const relX = (v.x - vx);
            const relZ = ((v.z || 0) - vz);
            const speedX = Math.abs(relX);
            const speedZ = Math.abs(relZ);
            const dragX = CdLin * relX + 0.5 * rho * CdQuad * areaX * speedX * relX * 0.0001;
            const dragZ = CdLin * relZ + 0.5 * rho * CdQuad * areaZ * speedZ * relZ * 0.0001;
            b.acceleration.x -= dragX / (b.mass || 1);
            b.acceleration.z = (b.acceleration.z || 0) - dragZ / (b.mass || 1);

            b.velocity.y = (b.velocity.y || 0) * (1 - 0.15 * fraction);
            b.velocity.z = (b.velocity.z || 0) * 0.99;
        }
    });
}

export function getHeightfield() {
    ensureHeightfield();
    return { grid: gridW, cellSize, origin, heights };
}