/**
 * draftEntityAdapter.js — REALIS Canonical 2D Draft Entity Converter & Normalizer
 *
 * Pipeline:
 *   DraftEntity (2D Canvas) → Validate & Normalize → SimulationObject (Physics World)
 */

export function validateDraftEntity(obj) {
    if (!obj || typeof obj !== 'object' || !obj.id) {
        return { valid: false, reason: 'Missing or invalid entity object/ID' };
    }

    const type = obj.type;
    if (!['rect', 'circle', 'polygon', 'arc', 'path', 'pencil', 'bezier', 'ruler', 'dimension'].includes(type)) {
        return { valid: false, reason: `Unsupported entity type: ${type}` };
    }

    if (type === 'rect') {
        const w = Number(obj.width);
        const h = Number(obj.height);
        if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
            return { valid: false, reason: `Invalid rectangle dimensions (${w}x${h})` };
        }
    }

    if (type === 'circle' || type === 'polygon' || type === 'arc') {
        const r = Number(obj.r ?? obj.radius);
        if (!Number.isFinite(r) || r <= 0) {
            return { valid: false, reason: `Invalid circle/polygon radius (${r})` };
        }
    }

    if (type === 'path' || type === 'pencil') {
        if (!Array.isArray(obj.points) || obj.points.length < 2) {
            return { valid: false, reason: 'Invalid or empty path points array' };
        }
    }

    return { valid: true };
}

/**
 * Ensures a 2D drafting entity carries complete physics property defaults.
 */
export function normalizePhysicsProps(obj) {
    return {
        mass: Number.isFinite(Number(obj.mass)) ? Number(obj.mass) : 1.0,
        restitution: Number.isFinite(Number(obj.restitution)) ? Number(obj.restitution) : 0.5,
        friction: Number.isFinite(Number(obj.friction)) ? Number(obj.friction) : 0.3,
        isStatic: Boolean(obj.isStatic),
        velocity: {
            x: Number(obj.velocity?.x || 0),
            y: Number(obj.velocity?.y || 0),
            z: Number(obj.velocity?.z || 0)
        }
    };
}

/**
 * Converts a 2D Draft Entity into a canonical Simulation Object.
 * Preserves 1:1 stable ID mapping: draftEntityId === simulationObjectId.
 */
export function normalizeDraftToSimObject(obj) {
    const validation = validateDraftEntity(obj);
    if (!validation.valid) {
        console.warn(`[draftEntityAdapter] Entity validation skipped for ${obj?.id}: ${validation.reason}`);
        return null;
    }

    const physics = normalizePhysicsProps(obj);
    const depth = Number.isFinite(Number(obj.depth)) ? Number(obj.depth) : 20.0;

    let posX = 0, posY = 0, posZ = 0;
    let dimX = 10, dimY = 10, dimZ = depth;

    if (obj.type === 'rect') {
        dimX = Math.max(0.1, Number(obj.width));
        dimZ = Math.max(0.1, Number(obj.height));
        dimY = depth;

        // Convert top-left (x, y) to center position
        const rawX = Number(obj.x || 0);
        const rawY = Number(obj.y || 0);
        posX = rawX + dimX / 2;
        posZ = rawY + dimZ / 2;
        posY = Number(obj.y_override ?? (depth / 2));
    } else if (obj.type === 'circle') {
        const r = Math.max(0.1, Number(obj.r ?? obj.radius));
        dimX = r * 2;
        dimZ = r * 2;
        dimY = obj.vertical3D ? r * 2 : depth;

        posX = Number(obj.cx ?? obj.x ?? 0);
        posZ = Number(obj.cy ?? obj.y ?? 0);
        posY = Number(obj.y_override ?? (dimY / 2));
    } else if (obj.type === 'polygon' || obj.type === 'arc') {
        const r = Math.max(0.1, Number(obj.r ?? obj.radius ?? 10));
        dimX = r * 2;
        dimZ = r * 2;
        dimY = depth;

        posX = Number(obj.cx ?? obj.x ?? 0);
        posZ = Number(obj.cy ?? obj.y ?? 0);
        posY = Number(obj.y_override ?? (depth / 2));
    } else if (obj.type === 'path' || obj.type === 'pencil') {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        obj.points.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        });
        dimX = Math.max(1.0, maxX - minX);
        dimZ = Math.max(1.0, maxY - minY);
        dimY = depth;

        posX = minX + dimX / 2;
        posZ = minY + dimZ / 2;
        posY = Number(obj.y_override ?? (depth / 2));
    }

    const halfExtents = {
        x: dimX / 2,
        y: dimY / 2,
        z: dimZ / 2
    };

    const boundingRadius = Math.sqrt(halfExtents.x ** 2 + halfExtents.y ** 2 + halfExtents.z ** 2);

    return {
        id: obj.id,
        draftEntityId: obj.id,
        type: obj.type,
        position: { x: posX, y: posY, z: posZ },
        rotation: Array.isArray(obj.rotation)
            ? { x: obj.rotation[0] || 0, y: obj.rotation[1] || 0, z: obj.rotation[2] || 0 }
            : { x: 0, y: obj.rotation ? -Number(obj.rotation) * Math.PI / 180 : 0, z: 0 },
        dimensions: { x: dimX, y: dimY, z: dimZ },
        halfExtents,
        radius: boundingRadius,
        depth,
        physics
    };
}
