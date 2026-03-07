import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import * as THREE from 'three'

export default function Viewport3D({ objects, isSimulating }) {
    // Convert 2D draft objects to 3D extruded shapes

    return (
        <Canvas camera={{ position: [200, 200, 200], fov: 50 }}>
            <color attach="background" args={['#0a0f1a']} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[100, 200, 50]} intensity={1} castShadow />

            <Environment preset="city" />

            <Grid
                infiniteGrid
                fadeDistance={1000}
                sectionColor="#256af4"
                cellColor="#1e293b"
                args={[100, 100]}
                position={[0, -0.1, 0]}
            />

            {/* Map over draft objects and extrude them */}
            {objects.map((obj) => {
                if (obj.type === 'rect') {
                    // SVG coordinates: (0,0) is top-left, x goes right, y goes down.
                    // 3D coordinates: x goes right, y goes up, z goes forward.
                    // Let's map SVG x -> 3D x, SVG y -> 3D z
                    const depth = obj.depth !== undefined ? obj.depth : 20; // Dynamic extrusion depth
                    const cx = obj.x + obj.width / 2;
                    const cz = obj.y + obj.height / 2;

                    return (
                        <mesh
                            key={obj.id}
                            position={[cx, obj.y_override !== undefined ? obj.y_override : depth / 2, cz]}
                            rotation={[0, obj.rotation ? -obj.rotation * Math.PI / 180 : 0, 0]}
                            castShadow
                        >
                            <boxGeometry args={[obj.width, depth, obj.height]} />
                            <meshStandardMaterial color={obj.stroke} transparent opacity={0.8} />
                        </mesh>
                    );
                }

                if (obj.type === 'circle') {
                    const depth = obj.depth !== undefined ? obj.depth : 20; // Dynamic extrusion depth
                    return (
                        <mesh
                            key={obj.id}
                            position={[obj.cx, obj.y_override !== undefined ? obj.y_override : depth / 2, obj.cy]}
                            castShadow
                        >
                            <cylinderGeometry args={[obj.r, obj.r, depth, 32]} />
                            <meshStandardMaterial color={obj.stroke} transparent opacity={0.8} />
                        </mesh>
                    );
                }

                if (obj.type === 'path' && obj.points && obj.points.length > 1) {
                    const depth = obj.depth !== undefined ? obj.depth : 20;
                    const shape = new THREE.Shape();
                    shape.moveTo(obj.points[0].x, obj.points[0].y);
                    for (let i = 1; i < obj.points.length; i++) {
                        shape.lineTo(obj.points[i].x, obj.points[i].y);
                    }

                    return (
                        <mesh
                            key={obj.id}
                            rotation={[-Math.PI / 2, 0, 0]}
                            position={[0, depth, 0]}
                            castShadow
                        >
                            <extrudeGeometry args={[shape, { depth: depth, bevelEnabled: false }]} />
                            <meshStandardMaterial color={obj.stroke} transparent opacity={0.8} />
                        </mesh>
                    );
                }

                return null;
            })}

            <OrbitControls makeDefault />
        </Canvas>
    )
}
