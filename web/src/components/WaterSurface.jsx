import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import useStore from '../store/useStore';

export default function WaterSurface() {
    const { mc } = useMemo(() => {
        const res = 24; // balanced resolution
        const mat = new THREE.MeshStandardMaterial({ 
            color: '#3aa0ff', 
            transparent: true, 
            opacity: 0.55, 
            roughness: 0.2,
            metalness: 0.2,
            side: THREE.DoubleSide
        });
        const mcObj = new MarchingCubes(res, mat, true, false, 18000);
        mcObj.isolation = 0.25; 
        return { mc: mcObj };
    }, []);

    useFrame(() => {
        if (!mc) return;
        
        const state = useStore.getState();
        const hf = state.water.heightfield;
        const depth = state.water.depth || 30;
        const level = state.water.level || 0;
        const size = hf?.size || 200;
        const gridRes = hf?.grid || 40;
        
        if (!hf?.heights) return;

        mc.reset();
        
        // Scale and position the water volume
        mc.scale.set(size / 2, Math.max(20, depth * 0.6), size / 2);
        mc.position.set(0, level - Math.max(10, depth * 0.3), 0);
        
        // Base volume: very mild fill to avoid a dome look
        mc.addPlaneY(0.25, 18);
        
        // Add surface ripples via coarse sampling of the heightfield
        const sampleStep = Math.max(1, Math.floor(gridRes / 24));
        for (let z = 0; z < gridRes; z += sampleStep) {
            for (let x = 0; x < gridRes; x += sampleStep) {
                const idx = z * gridRes + x;
                const hRaw = hf.heights[idx] || 0;
                const h = Math.max(-3, Math.min(3, hRaw)); // clamp ripple height for smoothness
                const lx = x / (gridRes - 1);
                const lz = z / (gridRes - 1);
                const ly = 0.52 + (h / Math.max(30, depth)); // small ripple around mid-plane
                mc.addBall(lx, ly, lz, 0.08, 22);
            }
        }
        
        mc.update();

        const posAttr = mc.geometry?.attributes?.position;
        if (posAttr?.array) {
            const arr = posAttr.array;
            const pts = [];
            const maxPts = 200;
            const step = Math.max(3, Math.floor(arr.length / (maxPts * 3)));
            for (let i = 0, c = 0; i < arr.length && c < maxPts; i += step * 3, c++) {
                const wx = arr[i + 0] + mc.position.x;
                const wy = arr[i + 1] + mc.position.y;
                const wz = arr[i + 2] + mc.position.z;
                pts.push({ x: wx, y: wy, z: wz });
            }
            useStore.getState().setWater({ meshPoints: pts });
        }
    });

    return mc ? <primitive object={mc} /> : null;
}
