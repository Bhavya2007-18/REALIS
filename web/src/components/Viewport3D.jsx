import React, { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, TransformControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import useStore from '../store/useStore';

const Shape3DNode = ({ shape }) => {
    const groupRef = useRef();
    const selected3DIds = useStore(state => state.selected3DIds);
    const setSelected3DIds = useStore(state => state.setSelected3DIds);
    const active3DTool = useStore(state => state.active3DTool);
    const setShapes3D = useStore(state => state.setShapes3D);

    // Simulation state
    const simulationFrames = useStore(state => state.simulationFrames);
    const currentFrameIndex = useStore(state => state.currentFrameIndex);
    const isPlaying = useStore(state => state.isPlaying);

    const isSelected = selected3DIds.includes(shape.id);
    const isTransforming = isSelected && ['translate', 'rotate', 'scale'].includes(active3DTool);

    // Get simulated state if playing
    const simState = (isPlaying && simulationFrames[currentFrameIndex])
        ? simulationFrames[currentFrameIndex].states.find(s => s.id === shape.id)
        : null;

    const currentPos = simState ? [simState.position.x, simState.position.y, simState.position.z] : (shape.position || [0, 0, 0]);
    const currentRot = simState ? [simState.rotation.x, simState.rotation.y, simState.rotation.z] : (shape.rotation || [0, 0, 0]);

    // Memoize geometry to prevent frequent re-allocations
    const geometry = React.useMemo(() => {
        switch (shape.type) {
            case 'cube': return new THREE.BoxGeometry(shape.params?.width || 10, shape.params?.height || 10, shape.params?.depth || 10);
            case 'sphere': return new THREE.SphereGeometry(shape.params?.radius || 5, shape.params?.segments || 32, shape.params?.rings || 32);
            case 'cylinder': return new THREE.CylinderGeometry(shape.params?.radiusTop || 5, shape.params?.radiusBottom || 5, shape.params?.height || 10, shape.params?.segments || 32);
            case 'cone': return new THREE.ConeGeometry(shape.params?.radius || 5, shape.params?.height || 10, shape.params?.segments || 32);
            case 'torus': return new THREE.TorusGeometry(shape.params?.radius || 5, shape.params?.tube || 2, shape.params?.radialSegments || 16, shape.params?.tubularSegments || 100);
            case 'plane': return new THREE.PlaneGeometry(shape.params?.width || 20, shape.params?.depth || 20);
            case 'capsule': return new THREE.CapsuleGeometry(shape.params?.radius || 2, shape.params?.length || 10, 4, 16);
            default: return new THREE.BoxGeometry(10, 10, 10);
        }
    }, [shape.type, JSON.stringify(shape.params)]);

    const onTransformEnd = () => {
        if (!groupRef.current) return;
        const o = groupRef.current;
        setShapes3D(shapes => shapes.map(s => {
            if (s.id === shape.id) {
                return {
                    ...s,
                    position: [o.position.x, o.position.y, o.position.z],
                    rotation: [o.rotation.x, o.rotation.y, o.rotation.z],
                    scale: [o.scale.x, o.scale.y, o.scale.z]
                };
            }
            return s;
        }));
    };

    const node = (
        <group
            ref={groupRef}
            position={currentPos}
            rotation={currentRot}
            scale={shape.scale || [1, 1, 1]}
            onClick={(e) => {
                e.stopPropagation();
                if (!isTransforming) {
                    const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
                    if (isMulti) {
                        setSelected3DIds(prev => prev.includes(shape.id) ? prev.filter(id => id !== shape.id) : [...prev, shape.id]);
                    } else {
                        setSelected3DIds([shape.id]);
                        useStore.setState({ activeFileId: shape.id });
                    }
                }
            }}
        >
            <mesh castShadow receiveShadow geometry={geometry}>
                <meshStandardMaterial
                    color={shape.color || '#3b82f6'}
                    roughness={shape.roughness !== undefined ? shape.roughness : 0.5}
                    metalness={shape.metalness !== undefined ? shape.metalness : 0.1}
                    transparent
                    opacity={shape.opacity !== undefined ? shape.opacity : 1.0}
                />
            </mesh>
            {isSelected && (
                <lineSegments>
                    <edgesGeometry attach="geometry" args={[geometry]} />
                    <lineBasicMaterial attach="material" color="white" />
                </lineSegments>
            )}
        </group>
    );

    if (isTransforming) {
        return (
            <TransformControls
                mode={active3DTool}
                onMouseUp={onTransformEnd}
                onObjectChange={() => { }}
            >
                {node}
            </TransformControls>
        );
    }

    return node;
};

const JointMarker = ({ constraint }) => {
    const shapes3D = useStore(state => state.shapes3D);
    const objects = useStore(state => state.objects);

    // Find targets to position the marker
    const allEntities = [...shapes3D, ...objects];
    const targetA = allEntities.find(e => e.id === constraint.targetA);
    const targetB = allEntities.find(e => e.id === constraint.targetB);

    if (!targetA) return null;

    const posA = targetA.position ? (Array.isArray(targetA.position) ? targetA.position : [targetA.position.x, targetA.position.y, targetA.position.z]) : [targetA.x + (targetA.width || 0) / 2, targetA.y_override || 0, targetA.y + (targetA.height || 0) / 2];

    // Marker position is usually at the pivot, for now just at targetA + pivotA
    const markerPos = [
        posA[0] + (constraint.pivotA?.x || 0),
        posA[1] + (constraint.pivotA?.y || 0),
        posA[2] + (constraint.pivotA?.z || 0)
    ];

    if (constraint.type === 'hinge') {
        // Render a cylinder along the axis
        const axis = constraint.axis || { x: 0, y: 1, z: 0 };
        return (
            <group position={markerPos}>
                <mesh rotation={[axis.x * Math.PI / 2, axis.y * Math.PI / 2, axis.z * Math.PI / 2]}>
                    <cylinderGeometry args={[0.5, 0.5, 4, 8]} />
                    <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} />
                </mesh>
                <mesh rotation={[axis.x * Math.PI / 2, axis.y * Math.PI / 2, axis.z * Math.PI / 2]}>
                    <cylinderGeometry args={[0.2, 0.2, 8, 8]} />
                    <meshBasicMaterial color="#fbbf24" />
                </mesh>
            </group>
        );
    }

    if (constraint.type === 'slider') {
        const axis = constraint.axis || { x: 1, y: 0, z: 0 };
        return (
            <group position={markerPos}>
                <mesh rotation={[axis.x * Math.PI / 2, axis.y * Math.PI / 2, axis.z * Math.PI / 2]}>
                    <boxGeometry args={[10, 0.2, 0.2]} />
                    <meshBasicMaterial color="white" transparent opacity={0.5} />
                </mesh>
            </group>
        );
    }

    if (constraint.type === 'fixed') {
        return (
            <mesh position={markerPos}>
                <boxGeometry args={[2, 2, 2]} />
                <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} />
            </mesh>
        );
    }

    return null;
};

const CollisionMarker = ({ contact }) => {
    return (
        <mesh position={[contact.point.x, contact.point.y, contact.point.z]}>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshBasicMaterial color="#ef4444" />
        </mesh>
    );
};

export default function Viewport3D({ objects, isSimulating }) {
    const shapes3D = useStore(state => state.shapes3D);
    const active3DTool = useStore(state => state.active3DTool);
    const addShape3D = useStore(state => state.addShape3D);

    // Simulation state
    const simulationFrames = useStore(state => state.simulationFrames);
    const currentFrameIndex = useStore(state => state.currentFrameIndex);
    const isPlaying = useStore(state => state.isPlaying);
    const constraints = useStore(state => state.constraints);

    return (
        <Canvas camera={{ position: [100, 100, 100], fov: 50 }} shadows>
            <color attach="background" args={['#0a0f1a']} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[100, 200, 50]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />

            <Environment preset="city" />

            {/* Engineering Grid */}
            <Grid
                infiniteGrid
                fadeDistance={1000}
                sectionColor="#256af4"
                sectionSize={10}
                cellColor="#1e293b"
                cellSize={1}
                position={[0, -0.01, 0]}
            />

            {/* Creation tool helper plane */}
            {['cube', 'sphere', 'cylinder', 'cone', 'torus', 'plane', 'capsule'].includes(active3DTool) && (
                <mesh
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[0, 0, 0]}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (e.intersections.length > 0) {
                            const point = e.intersections[0].point;
                            const id = Math.random().toString(36).substring(2, 9);
                            let params = {};
                            if (active3DTool === 'cube') params = { width: 10, height: 10, depth: 10 };
                            else if (active3DTool === 'sphere') params = { radius: 5 };
                            else if (active3DTool === 'cylinder') params = { radiusTop: 5, radiusBottom: 5, height: 10 };
                            else if (active3DTool === 'plane') params = { width: 40, depth: 40 };
                            else if (active3DTool === 'capsule') params = { radius: 2, length: 10 };

                            addShape3D({
                                id,
                                type: active3DTool,
                                position: [point.x, point.y + (params.height ? params.height / 2 : 0), point.z],
                                rotation: [0, 0, 0],
                                scale: [1, 1, 1],
                                color: '#3b82f6',
                                params
                            });
                        }
                    }}
                >
                    <planeGeometry args={[2000, 2000]} />
                    <meshBasicMaterial transparent opacity={0} />
                </mesh>
            )}

            {/* Project Objects (Both Drafting Extrusions and Simulation Trajectories) */}
            {objects.map((obj) => {
                const depth = obj.depth !== undefined ? obj.depth : 0.1;

                // Get simulated state if playing
                const simState = (isPlaying && simulationFrames[currentFrameIndex])
                    ? simulationFrames[currentFrameIndex].states.find(s => s.id === obj.id)
                    : null;

                const yPosOverride = obj.y_override !== undefined ? obj.y_override : depth / 2;

                // Physics Pos [x, y, z] -> Three.js Pos [x, y, z]
                const currentPos = simState
                    ? [simState.position.x, simState.position.y, simState.position.z]
                    : [obj.x + (obj.width || 0) / 2 || obj.cx || 0, yPosOverride, obj.y + (obj.height || 0) / 2 || obj.cy || 0];

                const currentRot = simState
                    ? [simState.rotation.x, simState.rotation.y, simState.rotation.z]
                    : [0, obj.rotation ? -obj.rotation * Math.PI / 180 : 0, 0];

                if (obj.type === 'rect') {
                    return (
                        <mesh key={`ext-${obj.id}`} position={currentPos} rotation={currentRot} castShadow>
                            <boxGeometry args={[obj.width, depth, obj.height]} />
                            <meshStandardMaterial color={obj.stroke} transparent opacity={0.6} />
                        </mesh>
                    );
                }
                if (obj.type === 'circle') {
                    return (
                        <mesh key={`ext-${obj.id}`} position={currentPos} rotation={currentRot} castShadow>
                            <cylinderGeometry args={[obj.r, obj.r, depth, 32]} />
                            <meshStandardMaterial color={obj.stroke} transparent opacity={0.6} side={THREE.DoubleSide} />
                        </mesh>
                    );
                }

                if (obj.type === 'polygon' || obj.type === 'path' || obj.type === 'arc') {
                    const shape = new THREE.Shape();
                    if (obj.type === 'polygon' && obj.sides) {
                        const angleStep = (Math.PI * 2) / obj.sides;
                        for (let i = 0; i < obj.sides; i++) {
                            const px = Math.cos(i * angleStep) * obj.r;
                            const py = Math.sin(i * angleStep) * obj.r;
                            if (i === 0) shape.moveTo(px, py); else shape.lineTo(px, py);
                        }
                        shape.closePath();
                        return (
                            <mesh key={`ext-${obj.id}`} position={currentPos} rotation={simState ? currentRot : [-Math.PI / 2, 0, 0]} castShadow>
                                <extrudeGeometry args={[shape, { depth: depth, bevelEnabled: false }]} />
                                <meshStandardMaterial color={obj.stroke} transparent opacity={0.6} side={THREE.DoubleSide} />
                            </mesh>
                        );
                    }
                    if (obj.type === 'arc' && obj.radius) {
                        shape.absarc(0, 0, obj.radius, obj.startAngle * Math.PI / 180, obj.endAngle * Math.PI / 180, false);
                        shape.lineTo(0, 0); shape.closePath();
                        return (
                            <mesh key={`ext-${obj.id}`} position={currentPos} rotation={simState ? currentRot : [-Math.PI / 2, 0, 0]} castShadow>
                                <extrudeGeometry args={[shape, { depth: depth, bevelEnabled: false }]} />
                                <meshStandardMaterial color={obj.stroke} transparent opacity={0.6} side={THREE.DoubleSide} />
                            </mesh>
                        );
                    }
                    if (obj.type === 'path' && obj.points && obj.points.length > 1) {
                        shape.moveTo(obj.points[0].x, obj.points[0].y);
                        for (let i = 1; i < obj.points.length; i++) shape.lineTo(obj.points[i].x, obj.points[i].y);
                        if (obj.closed) shape.closePath();
                        return (
                            <mesh key={`ext-${obj.id}`} position={currentPos} rotation={simState ? currentRot : [-Math.PI / 2, 0, 0]} castShadow>
                                <extrudeGeometry args={[shape, { depth: depth, bevelEnabled: false }]} />
                                <meshStandardMaterial color={obj.stroke} transparent opacity={0.6} side={THREE.DoubleSide} />
                            </mesh>
                        );
                    }
                }
                return null;
            })}

            {/* Native 3D Objects */}
            {shapes3D.map(shape => (
                <Shape3DNode key={shape.id} shape={shape} />
            ))}

            {/* Constraints / Joints */}
            {constraints.map(c => (
                <JointMarker key={c.id} constraint={c} />
            ))}

            {/* Collisions for current frame */}
            {simulationFrames[currentFrameIndex]?.contacts?.map((contact, idx) => (
                <CollisionMarker key={`contact-${idx}`} contact={contact} />
            ))}

            <OrbitControls makeDefault />

            <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
                <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="white" />
            </GizmoHelper>
        </Canvas>
    );
}
