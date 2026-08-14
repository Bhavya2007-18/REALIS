import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { createThreeShapeFrom2D } from '../utils/geometryHelpers';

// Maps a 2D canvas object to its 3D world origin, matching Viewport3D's objToWorldPos.
// default: 2D (x=cx, y=cy) -> 3D (x, y, z) with y = thickness/2
// vertical3D: 2D (cx=px, cy=py) -> 3D upright on the y axis (cy grows downward).
const objToWorldPos = (o, fallbackY = 0.05) => {
    const isVertical = !!o.vertical3D;
    let px, py;
    if (o.position) {
        px = o.position[0];
        py = o.position[1];
    } else {
        px = o.x + (o.width || 0) / 2 || o.cx || 0;
        py = o.y + (o.height || 0) / 2 || o.cy || 0;
    }
    return isVertical ? [px, -py, 0] : [px, fallbackY, py];
};

const PRIMITIVE_GEOMETRIES = {
    cube: (p) => new THREE.BoxGeometry(p?.width || 10, p?.height || 10, p?.depth || 10),
    sphere: (p) => new THREE.SphereGeometry(p?.radius || 5, p?.segments || 32, p?.rings || 32),
    cylinder: (p) => new THREE.CylinderGeometry(p?.radiusTop || 5, p?.radiusBottom || 5, p?.height || 10, p?.segments || 32),
    cone: (p) => new THREE.ConeGeometry(p?.radius || 5, p?.height || 10, p?.segments || 32),
    torus: (p) => new THREE.TorusGeometry(p?.radius || 5, p?.tube || 2, p?.radialSegments || 16, p?.tubularSegments || 100),
    plane: (p) => new THREE.PlaneGeometry(p?.width || 20, p?.depth || 20),
    capsule: (p) => new THREE.CapsuleGeometry(p?.radius || 2, p?.length || 10, 4, 16)
};

const buildShape3DMesh = (shape) => {
    if (!shape) return null;
    if (shape.type === 'obj') return null;

    let geometry;
    if (shape.type === 'extruded_solid') {
        // Reconstruct from the stored profile (2D object) if available at call time.
        geometry = null;
    } else {
        const builder = PRIMITIVE_GEOMETRIES[shape.type];
        if (!builder) geometry = new THREE.BoxGeometry(10, 10, 10);
        else geometry = builder(shape.params);
    }

    const mesh = new THREE.Mesh(geometry);
    const pos = shape.position || [0, 0, 0];
    const rot = shape.rotation || [0, 0, 0];
    const scale = shape.scale || [1, 1, 1];
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.rotation.set(rot[0], rot[1], rot[2]);
    mesh.scale.set(scale[0], scale[1], scale[2]);
    mesh.name = shape.name || shape.id || 'shape';
    mesh.userData.id = shape.id;
    const mat = new THREE.MeshStandardMaterial({
        color: shape.color || '#3b82f6',
        roughness: shape.roughness !== undefined ? shape.roughness : 0.2,
        metalness: shape.metalness !== undefined ? shape.metalness : 0.8,
        transparent: true,
        opacity: shape.opacity !== undefined ? shape.opacity : 1.0
    });
    mesh.material = mat;
    return mesh;
};

const buildObjectMesh = (obj) => {
    if (!obj) return null;
    const depth = obj.depth !== undefined ? obj.depth : 0.1;
    const color = obj.fill || obj.stroke || '#3b82f6';
    const mat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: obj.opacity || 1.0, side: THREE.DoubleSide });

    let geometry;
    if (obj.type === 'rect') {
        geometry = new THREE.BoxGeometry(obj.width, depth, obj.height);
    } else if (obj.type === 'circle') {
        if (obj.vertical3D) geometry = new THREE.SphereGeometry(obj.r || (obj.width || 10) / 2, 32, 32);
        else geometry = new THREE.CylinderGeometry(obj.r, obj.r, depth, 32);
    } else {
        const shape = createThreeShapeFrom2D(obj);
        if (shape) geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    }
    if (!geometry) return null;

    const mesh = new THREE.Mesh(geometry, mat);
    const isCustomShape = obj.type === 'polygon' || obj.type === 'path' || obj.type === 'arc';
    const pos = objToWorldPos(obj, isCustomShape ? depth / 2 : depth / 2);
    mesh.position.set(pos[0], pos[1], pos[2]);
    if (isCustomShape) {
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.y = obj.rotation ? -obj.rotation * Math.PI / 180 : 0;
    } else {
        mesh.rotation.y = obj.rotation ? -obj.rotation * Math.PI / 180 : 0;
    }
    mesh.name = obj.name || obj.id || 'object';
    mesh.userData.id = obj.id;
    // Scale is applied on the parent group in the renderer; bake it into position already.
    return mesh;
};

export const buildExportScene = (objects, shapes3D) => {
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    group.name = 'scene-renderer';

    (objects || []).forEach((obj) => {
        const mesh = buildObjectMesh(obj);
        if (mesh) group.add(mesh);
    });

    (shapes3D || []).forEach((shape) => {
        let mesh = buildShape3DMesh(shape);
        // extruded_solid references a 2D profile by id.
        if (!mesh && shape.type === 'extruded_solid') {
            const profileId = shape.params?.profileId || shape.profileId;
            const profile = (objects || []).find((o) => o.id === profileId);
            if (profile) {
                const shape2d = createThreeShapeFrom2D(profile);
                if (shape2d) {
                    const depth = shape.params?.distance || shape.distance || 10;
                    const geometry = new THREE.ExtrudeGeometry(shape2d, { depth, bevelEnabled: false });
                    const dir = shape.params?.direction || shape.direction || 'positive';
                    if (dir === 'negative') geometry.translate(0, 0, -depth);
                    else if (dir === 'symmetric') geometry.translate(0, 0, -depth / 2);
                    mesh = new THREE.Mesh(geometry);
                    const pos = shape.position || [0, 0, 0];
                    const rot = shape.rotation || [0, 0, 0];
                    mesh.position.set(pos[0], pos[1], pos[2]);
                    mesh.rotation.set(rot[0], rot[1], rot[2]);
                }
            }
        }
        if (mesh) group.add(mesh);
    });

    scene.add(group);
    return scene;
};

// STL/OBJ read position.count unconditionally; give empty renderables an
// attribute-less position so they serialize as zero vertices instead of crashing.
const EMPTY_POSITION_GEOMETRY = new THREE.BufferGeometry();
EMPTY_POSITION_GEOMETRY.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(0), 3));

function ensurePositionAttributes(root) {
    root.traverse((object) => {
        const renderable = object;
        if (!(renderable.isMesh || renderable.isLine || renderable.isPoints)) return;
        if (!renderable.geometry?.getAttribute('position')) {
            renderable.geometry = EMPTY_POSITION_GEOMETRY;
        }
    });
}

export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

export const exportFormats = {
    glb: { type: 'model/gltf-binary', ext: 'glb', binary: true },
    stl: { type: 'model/stl', ext: 'stl', binary: true },
    obj: { type: 'model/obj', ext: 'obj', binary: false }
};

export async function exportScene(format = 'glb', objects = [], shapes3D = []) {
    const scene = buildExportScene(objects, shapes3D);
    const date = new Date().toISOString().split('T')[0];
    const config = exportFormats[format];
    if (!config) throw new Error(`Unsupported export format: ${format}`);

    if (format === 'glb') {
        const exporter = new GLTFExporter();
        const buffer = await new Promise((resolve, reject) => {
            exporter.parse(scene, (gltf) => resolve(gltf), (error) => reject(error), { binary: true });
        });
        const blob = new Blob([buffer], { type: config.type });
        downloadBlob(blob, `model_${date}.${config.ext}`);
        return blob;
    }

    ensurePositionAttributes(scene);
    if (format === 'stl') {
        const exporter = new STLExporter();
        const result = exporter.parse(scene, { binary: true });
        const blob = new Blob([result], { type: config.type });
        downloadBlob(blob, `model_${date}.${config.ext}`);
        return blob;
    }

    const exporter = new OBJExporter();
    const result = exporter.parse(scene);
    const blob = new Blob([result], { type: config.type });
    downloadBlob(blob, `model_${date}.${config.ext}`);
    return blob;
}