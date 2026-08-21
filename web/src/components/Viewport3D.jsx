import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useLoader, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, TransformControls, GizmoHelper, GizmoViewport, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Grid as GridIcon, Maximize2, Minimize2 } from 'lucide-react';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import useStore from '../store/useStore';
import { createThreeShapeFrom2D } from '../utils/geometryHelpers';
import WaterSurface from './WaterSurface';
import VectorOverlay from './VectorOverlay';

function Loader() {
  const { progress } = useProgress()
  return <Html center className="text-white text-xs font-mono bg-black/50 p-2 rounded">{progress.toFixed(0)}% loaded</Html>
}

// Maps a 2D canvas object to its 3D world origin.
// default: 2D (x=cx, y=cy) -> 3D (x, y=thickness/2, z)
// vertical3D: 2D (x=cx, y=cy) -> 3D upright: world y = -cy (cy grows downward on canvas)
const objToWorldPos = (o, fallbackY = 0.05) => {
    if (o.position) {
        if (Array.isArray(o.position)) return o.position;
        return [o.position.x || 0, o.position.y || 0, o.position.z || 0];
    }
    const isVertical = !!o.vertical3D;
    let px = 0, py = 0;
    if (o.x !== undefined && o.width !== undefined) {
        px = o.x + o.width / 2;
    } else {
        px = o.cx || 0;
    }

    if (o.y !== undefined && o.height !== undefined) {
        py = o.y + o.height / 2;
    } else {
        py = o.cy || 0;
    }

    return isVertical
        ? [px, -py, 0]
        : [px, fallbackY, py];
};

 

const OBJModelWithMTL = ({ objPath, mtlPath }) => {
    const materials = useLoader(MTLLoader, mtlPath);
    const obj = useLoader(OBJLoader, objPath, (loader) => {
        materials.preload();
        loader.setMaterials(materials);
    });

    useEffect(() => {
        if (obj) {
            const box = new THREE.Box3().setFromObject(obj);
            const center = box.getCenter(new THREE.Vector3());
            obj.position.sub(center);
        }
    }, [obj]);

    return <primitive object={obj} />;
};

const OBJModelPlain = ({ objPath }) => {
    const obj = useLoader(OBJLoader, objPath);

    useEffect(() => {
        if (obj) {
            const box = new THREE.Box3().setFromObject(obj);
            const center = box.getCenter(new THREE.Vector3());
            obj.position.sub(center);
        }
    }, [obj]);

    return <primitive object={obj} />;
};

const OBJModel = ({ objPath, mtlPath }) => {
    if (mtlPath) return <OBJModelWithMTL objPath={objPath} mtlPath={mtlPath} />;
    return <OBJModelPlain objPath={objPath} />;
};

const Shape3DNode = React.memo(({ shape, renderBodies }) => {
    const groupRef = useRef();
    const selected3DIds = useStore(state => state.selected3DIds);
    const setSelected3DIds = useStore(state => state.setSelected3DIds);
    const active3DTool = useStore(state => state.active3DTool);
    const setShapes3D = useStore(state => state.setShapes3D);
    const beginHistoryGesture = useStore(state => state.beginHistoryGesture);
    const endHistoryGesture = useStore(state => state.endHistoryGesture);
    const profile = useStore(state => shape.type === 'extruded_solid' ? state.objects.find(o => o.id === (shape.params?.profileId || shape.profileId)) : null);
    const isV6Active = useStore(state => state.simulationPreset === 'v6_engine_simulation');

    // Simulation state
    const simulationFrames = useStore(state => state.simulationFrames);
    const currentFrameIndex = useStore(state => state.currentFrameIndex);
    const isPlaying = useStore(state => state.isPlaying);

    const isSelected = selected3DIds.includes(shape.id);
    const isTransforming = isSelected && ['translate', 'rotate', 'scale'].includes(active3DTool);

    // Get simulated state if playing
    const simState = (!isV6Active && !shape.isStatic && isPlaying && simulationFrames[currentFrameIndex])
        ? simulationFrames[currentFrameIndex].states.find(s => s.id === shape.id)
        : null;

    const liveBody = renderBodies?.find(b => String(b.id) === String(shape.id));

    // Helper to safely format vectors for R3F
    const formatVec = (vec, def) => {
        if (!vec) return def;
        if (Array.isArray(vec)) return vec;
        if (typeof vec === 'object') return [vec.x || 0, vec.y || 0, vec.z || 0];
        return def;
    };

    const currentPos = liveBody
        ? (Array.isArray(liveBody.position) ? liveBody.position : [liveBody.position.x || 0, liveBody.position.y || 0, liveBody.position.z || 0])
        : (simState ? [simState.position.x, simState.position.y, simState.position.z] : formatVec(shape.position, [0, 0, 0]));

    const currentRot = liveBody
        ? (Array.isArray(liveBody.rotation) ? liveBody.rotation : [liveBody.rotation?.x || 0, liveBody.rotation?.y || 0, liveBody.rotation?.z || 0])
        : (simState ? [simState.rotation.x, simState.rotation.y, simState.rotation.z] : formatVec(shape.rotation, [0, 0, 0]));
    const currentScale = formatVec(shape.scale, [1, 1, 1]);
    const trailRef = useRef([]);
    const [trailPositions, setTrailPositions] = useState([]);
    const hasTrail = shape.id?.startsWith('v6_piston_');
    const lastTrailUpdateRef = useRef(0);

    useFrame(({ clock }) => {
        if (!hasTrail) return;
        if (!Array.isArray(currentPos) || currentPos.length < 3) return;
        const now = clock.getElapsedTime();
        if (now - lastTrailUpdateRef.current < 0.08) return; // ~12 FPS trail update throttle
        lastTrailUpdateRef.current = now;

        const prev = trailRef.current[trailRef.current.length - 1];
        const next = prev
            ? [
                prev[0] + (currentPos[0] - prev[0]) * 0.2,
                prev[1] + (currentPos[1] - prev[1]) * 0.2,
                prev[2] + (currentPos[2] - prev[2]) * 0.2
            ]
            : [...currentPos];
        trailRef.current.push(next);
        if (trailRef.current.length > 3) trailRef.current.shift();
        setTrailPositions([...trailRef.current]);
    });

    // Use a hash of params for more stable memoization
    const paramsKey = JSON.stringify(shape.params || {});

    // Better geometry management to avoid leaks
    const geometry = React.useMemo(() => {
        if (shape.type === 'obj') return null;
        let geo;
        switch (shape.type) {
            case 'cube': geo = new THREE.BoxGeometry(shape.params?.width || 10, shape.params?.height || 10, shape.params?.depth || 10); break;
            case 'sphere': geo = new THREE.SphereGeometry(shape.params?.radius || 5, shape.params?.segments || 32, shape.params?.rings || 32); break;
            case 'cylinder': geo = new THREE.CylinderGeometry(shape.params?.radiusTop || 5, shape.params?.radiusBottom || 5, shape.params?.height || 10, shape.params?.segments || 32); break;
            case 'cone': geo = new THREE.ConeGeometry(shape.params?.radius || 5, shape.params?.height || 10, shape.params?.segments || 32); break;
            case 'torus': geo = new THREE.TorusGeometry(shape.params?.radius || 5, shape.params?.tube || 2, shape.params?.radialSegments || 16, shape.params?.tubularSegments || 100); break;
            case 'plane': geo = new THREE.PlaneGeometry(shape.params?.width || 20, shape.params?.depth || 20); break;
            case 'capsule': geo = new THREE.CapsuleGeometry(shape.params?.radius || 2, shape.params?.length || 10, 4, 16); break;
            case 'extruded_solid':
                if (profile) {
                    const tShape = createThreeShapeFrom2D(profile);
                    if (tShape) {
                        const depth = shape.params?.distance || shape.distance || 10;
                        geo = new THREE.ExtrudeGeometry(tShape, { depth, bevelEnabled: false });
                        const dir = shape.params?.direction || shape.direction || 'positive';
                        if (dir === 'negative') {
                            geo.translate(0, 0, -depth);
                        } else if (dir === 'symmetric') {
                            geo.translate(0, 0, -depth / 2);
                        }
                    }
                }
                if (!geo) geo = new THREE.BoxGeometry(10, 10, 10);
                break;
            default: geo = new THREE.BoxGeometry(10, 10, 10);
        }
        return geo;
    }, [shape.type, paramsKey, profile]);

    // Cleanup geometry on unmount
    useEffect(() => {
        return () => {
            if (geometry) geometry.dispose();
        };
    }, [geometry]);

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
        endHistoryGesture();
    };

    const meshNode = (
        <group
            ref={groupRef}
            position={currentPos}
            rotation={currentRot}
            scale={currentScale}
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
            {shape.type === 'obj' ? (
                <OBJModel objPath={shape.params?.objPath} mtlPath={shape.params?.mtlPath} />
            ) : (
                <mesh castShadow receiveShadow geometry={geometry}>
                    <meshStandardMaterial
                        color={shape.color || '#3b82f6'}
                        roughness={shape.roughness !== undefined ? shape.roughness : 0.2}
                        metalness={shape.metalness !== undefined ? shape.metalness : 0.8}
                        transparent={shape.transparent ?? (shape.opacity !== undefined && shape.opacity < 1.0)}
                        opacity={shape.opacity !== undefined ? shape.opacity : 1.0}
                    />
                </mesh>
            )}
            {isSelected && geometry && (
                <lineSegments>
                    <edgesGeometry attach="geometry" args={[geometry]} />
                    <lineBasicMaterial attach="material" color="white" />
                </lineSegments>
            )}
            {hasTrail && geometry && trailPositions.map((trailPos, idx) => (
                <mesh key={`${shape.id}_trail_${idx}`} position={trailPos} geometry={geometry}>
                    <meshStandardMaterial
                        color={shape.color || '#3b82f6'}
                        transparent
                        opacity={0.12 * (idx + 1)}
                        depthWrite={false}
                        blending={THREE.AdditiveBlending}
                        roughness={0.15}
                        metalness={0.85}
                    />
                </mesh>
            ))}
        </group>
    );

    return (
        <>
            {meshNode}
            {isTransforming && !isPlaying && (
                <TransformControls
                    object={groupRef}
                    mode={active3DTool}
                    onMouseDown={beginHistoryGesture}
                    onMouseUp={onTransformEnd}
                />
            )}
        </>
    );
});

const JointMarker = ({ constraint }) => {
    const shapes3D = useStore(state => state.shapes3D);
    const objects = useStore(state => state.objects);

    // Find targets to position the marker
    const allEntities = [...shapes3D, ...objects];
    const targetA = allEntities.find(e => e.id === constraint.targetA);

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

const CollisionMarker = React.memo(({ contact }) => {
    return (
        <mesh position={[contact.point.x, contact.point.y, contact.point.z]}>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshBasicMaterial color="#ef4444" />
        </mesh>
    );
});

const DistanceRod = ({ constraint }) => {
    const shapes3D = useStore(s => s.shapes3D);
    const objects = useStore(s => s.objects);
    const allEntities = [...(shapes3D || []), ...(objects || [])];

    const targetA = allEntities.find(o => String(o.id) === String(constraint.targetA));
    const targetB = allEntities.find(o => String(o.id) === String(constraint.targetB));
    if (!targetA || !targetB) return null;

    const pA = objToWorldPos(targetA);
    const pB = objToWorldPos(targetB);
    if (!pA || !pB) return null;

    const dx = pB[0] - pA[0];
    const dy = pB[1] - pA[1];
    const dz = pB[2] - pA[2];
    const length = Math.hypot(dx, dy, dz);
    if (!length || !isFinite(length) || length < 0.001) return null;

    const mid = [(pA[0] + pB[0]) / 2, (pA[1] + pB[1]) / 2, (pA[2] + pB[2]) / 2];
    const dir = [dx / length, dy / length, dz / length];

    const up = new THREE.Vector3(0, 1, 0);
    const targetVec = new THREE.Vector3(dir[0], dir[1], dir[2]);
    const quat = new THREE.Quaternion();

    if (Math.abs(up.dot(targetVec) + 1) < 0.0001) {
        quat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
    } else {
        quat.setFromUnitVectors(up, targetVec);
    }

    return (
        <mesh position={mid} quaternion={quat}>
            <cylinderGeometry args={[0.3, 0.3, length, 6]} />
            <meshBasicMaterial color="#a855f7" transparent opacity={0.7} />
        </mesh>
    );
};

const ExtrudePreview = () => {
    const active3DTool = useStore(s => s.active3DTool);
    const extrudeOperation = useStore(s => s.extrudeOperation);
    const selectedIds = useStore(s => s.selectedIds);
    const objects = useStore(s => s.objects);
    
    if (active3DTool !== 'extrude' || selectedIds.length !== 1) return null;
    
    const profile = objects.find(o => o.id === selectedIds[0]);
    if (!profile) return null;
    
    const shape = createThreeShapeFrom2D(profile);
    if (!shape) return null;
    
    const depth = extrudeOperation.distance;
    
    const currentPos = [profile.x + (profile.width || 0) / 2 || profile.cx || 0, 0, profile.y + (profile.height || 0) / 2 || profile.cy || 0];
    const currentRot = [0, profile.rotation ? -profile.rotation * Math.PI / 180 : 0, 0];

    const isNegative = extrudeOperation.direction === 'negative';
    const isSymmetric = extrudeOperation.direction === 'symmetric';
    
    const zOffset = isNegative ? -depth : (isSymmetric ? -depth / 2 : 0);

    return (
        <group position={currentPos} rotation={[-Math.PI / 2, 0, 0]}>
            <group rotation={currentRot}>
                <mesh position={[0, 0, zOffset]}>
                    <extrudeGeometry args={[shape, { depth: depth, bevelEnabled: false }]} />
                    <meshStandardMaterial 
                        color="#22c55e" 
                        transparent 
                        opacity={0.6} 
                        emissive="#22c55e" 
                        emissiveIntensity={0.5} 
                        side={THREE.DoubleSide} 
                    />
                </mesh>
            </group>
        </group>
    );
};

const Extrudable2DShape = React.memo(({ obj, isPlaying, simulationFrames, currentFrameIndex, renderBodies }) => {
    const depth = obj.depth !== undefined ? obj.depth : 0.1;
    const isV6Active = useStore(state => state.simulationPreset === 'v6_engine_simulation');
    const simState = (!isV6Active && isPlaying && simulationFrames[currentFrameIndex])
        ? simulationFrames[currentFrameIndex].states.find(s => s.id === obj.id)
        : null;

    const liveBody = renderBodies?.find(b => String(b.id) === String(obj.id));
    const yPosOverride = obj.y_override !== undefined ? obj.y_override : depth / 2;

    const currentPos = liveBody
        ? (Array.isArray(liveBody.position) ? liveBody.position : [liveBody.position.x || 0, liveBody.position.y || 0, liveBody.position.z || 0])
        : (simState ? [simState.position.x, simState.position.y, simState.position.z] : objToWorldPos(obj, yPosOverride));

    const currentRot = liveBody
        ? (Array.isArray(liveBody.rotation) ? liveBody.rotation : [liveBody.rotation?.x || 0, liveBody.rotation?.y || 0, liveBody.rotation?.z || 0])
        : (simState ? [simState.rotation.x, simState.rotation.y, simState.rotation.z] : [0, obj.rotation ? -obj.rotation * Math.PI / 180 : 0, 0]);

    const active3DTool = useStore(state => state.active3DTool);
    const extrudeOperation = useStore(state => state.extrudeOperation);
    const setExtrudeOperation = useStore(state => state.setExtrudeOperation);
    const setObjects = useStore(state => state.setObjects);
    const selectedIds = useStore(state => state.selectedIds);
    const setSelectedIds = useStore(state => state.setSelectedIds);
    const beginHistoryGesture = useStore(state => state.beginHistoryGesture);
    const endHistoryGesture = useStore(state => state.endHistoryGesture);
    const isSelected = selectedIds.includes(obj.id);
    const isTransforming = isSelected && ['translate', 'rotate', 'scale'].includes(active3DTool);

    const groupRef = useRef();

    const onTransformEnd = () => {
        if (!groupRef.current) return;
        const o = groupRef.current;
        setObjects(objs => objs.map(item => {
            if (item.id === obj.id) {
                // In 2D map, x,y match x,z in 3D.
                let update = { ...item };
                
                // Map the new 3D positions back to the 2D schema structure (since REALIS models use cx/cy or x/y)
                if (item.cx !== undefined) {
                    update.cx = o.position.x;
                    update.cy = o.position.z;
                } else if (item.x !== undefined) {
                    update.x = o.position.x - (item.width || 0) / 2;
                    update.y = o.position.z - (item.height || 0) / 2;
                }

                if (active3DTool === 'rotate') {
                    // Approximate rotation back to 2D
                    update.rotation = -(o.rotation.y * 180 / Math.PI);
                }
                
                return update;
            }
            return item;
        }));
        endHistoryGesture();
    };

    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [startDepth, setStartDepth] = useState(0);

    const handlePointerDown = (e) => {
        e.stopPropagation();
        if (active3DTool === 'extrude') {
            beginHistoryGesture();
            setIsDragging(true);
            setStartY(e.clientY);
            if (isSelected) {
                setStartDepth(extrudeOperation.distance);
            } else {
                setStartDepth(depth);
                setSelectedIds([obj.id]);
                useStore.setState({ activeFileId: obj.id });
                setExtrudeOperation({ distance: depth, profileId: obj.id });
            }
            e.target.setPointerCapture(e.pointerId);
        } else if (active3DTool === 'select') {
            const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
            if (isMulti) {
                setSelectedIds(prev => prev.includes(obj.id) ? prev.filter(id => id !== obj.id) : [...prev, obj.id]);
            } else {
                setSelectedIds([obj.id]);
                useStore.setState({ activeFileId: obj.id });
            }
        }
    };

    const handlePointerMove = (e) => {
        if (!isDragging) return;
        e.stopPropagation();
        const deltaY = startY - e.clientY; 
        const newDepth = Math.max(0.1, startDepth + deltaY * 0.5);
        if (active3DTool === 'extrude') {
            setExtrudeOperation({ distance: newDepth });
        } else {
            setObjects(objs => objs.map(o => o.id === obj.id ? { ...o, depth: newDepth } : o));
        }
    };

    const handlePointerUp = (e) => {
        if (isDragging) {
            setIsDragging(false);
            e.target.releasePointerCapture(e.pointerId);
            endHistoryGesture();
        }
    };

    const customShape = React.useMemo(() => {
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
            } else if (obj.type === 'arc' && obj.radius) {
                shape.absarc(0, 0, obj.radius, (obj.startAngle || 0) * Math.PI / 180, (obj.endAngle || 90) * Math.PI / 180, false);
                shape.lineTo(0, 0); shape.closePath();
            } else if (obj.type === 'path' && obj.points && obj.points.length > 1) {
                shape.moveTo(obj.points[0].x, obj.points[0].y);
                for (let i = 1; i < obj.points.length; i++) shape.lineTo(obj.points[i].x, obj.points[i].y);
                if (obj.closed) shape.closePath();
            }
            return shape;
        }
        return null;
    }, [obj]);

    const geometryProps = React.useMemo(() => {
        if (obj.type === 'rect') return { type: 'box', args: [obj.width, depth, obj.height] };
        if (obj.type === 'circle') {
            if (obj.vertical3D) return { type: 'sphere', args: [obj.r || (obj.width || 10) / 2, 32, 32] };
            return { type: 'cylinder', args: [obj.r, obj.r, depth, 32] };
        }
        if (customShape) return { type: 'extrude', args: [customShape, { depth: depth, bevelEnabled: false }] };
        return null;
    }, [obj, depth, customShape]);

    if (!geometryProps) return null;

    const selectionEdgeGeo = React.useMemo(() => {
        if (!isSelected || !geometryProps) return null;
        let baseGeo;
        if (geometryProps.type === 'box') baseGeo = new THREE.BoxGeometry(...geometryProps.args);
        else if (geometryProps.type === 'cylinder') baseGeo = new THREE.CylinderGeometry(...geometryProps.args);
        else if (geometryProps.type === 'sphere') baseGeo = new THREE.SphereGeometry(...geometryProps.args);
        else if (geometryProps.type === 'extrude') baseGeo = new THREE.ExtrudeGeometry(...geometryProps.args);
        if (!baseGeo) return null;
        const edgeGeo = new THREE.EdgesGeometry(baseGeo);
        baseGeo.dispose();
        return edgeGeo;
    }, [isSelected, geometryProps]);

    useEffect(() => {
        return () => {
            if (selectionEdgeGeo) selectionEdgeGeo.dispose();
        };
    }, [selectionEdgeGeo]);

    const meshNode = (
        <group ref={groupRef} position={currentPos} rotation={simState ? currentRot : (customShape ? [-Math.PI / 2, 0, 0] : currentRot)}>
            <mesh 
                castShadow
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerOut={handlePointerUp}
            >
                {geometryProps.type === 'box' && <boxGeometry args={geometryProps.args} />}
                {geometryProps.type === 'cylinder' && <cylinderGeometry args={geometryProps.args} />}
                {geometryProps.type === 'sphere' && <sphereGeometry args={geometryProps.args} />}
                {geometryProps.type === 'extrude' && <extrudeGeometry args={geometryProps.args} />}
                <meshStandardMaterial 
                    color={obj.fill || obj.stroke || '#3b82f6'} 
                    transparent 
                    opacity={isSelected ? 0.9 : 0.8} 
                    side={THREE.DoubleSide} 
                    emissive={isSelected || (active3DTool === 'extrude' && isDragging) ? obj.stroke || '#3b82f6' : '#000000'}
                    emissiveIntensity={isSelected ? 0.2 : (isDragging ? 0.4 : 0)}
                />
            </mesh>
            {isSelected && selectionEdgeGeo && (
                <lineSegments geometry={selectionEdgeGeo}>
                    <lineBasicMaterial attach="material" color="white" />
                </lineSegments>
            )}
        </group>
    );

    return (
        <>
            {meshNode}
            {isTransforming && !isPlaying && (
                <TransformControls
                    object={groupRef}
                    mode={active3DTool}
                    onMouseDown={beginHistoryGesture}
                    onMouseUp={onTransformEnd}
                />
            )}
        </>
    );
});

const CameraRig = ({ objects, shapes3D, disabled }) => {
    const camera = useThree(s => s.camera);
    const controls = useThree(s => s.controls);
    const signatureRef = useRef('');

    useEffect(() => {
        if (disabled) return;
        const sig = JSON.stringify([
            (objects || []).map(o => [o.id, o.cx, o.cy, o.x, o.y, o.width, o.height, o.r, o.depth, o.y_override]),
            (shapes3D || []).map(s => [s.id, s.position, s.params])
        ]);
        if (sig === signatureRef.current) return;
        signatureRef.current = sig;
        if (!objects?.length && !shapes3D?.length) return;

        const box = new THREE.Box3();
        objects.forEach(o => {
            const ext = {
                x: (o.width || (o.r || 0) * 2 || 2) / 2,
                y: (o.depth ?? 0.1) / 2,
                z: (o.height || (o.r || 0) * 2 || 2) / 2
            };
            const p = objToWorldPos(o);
            const c = new THREE.Vector3(p[0], p[1], p[2]);
            box.expandByPoint(new THREE.Vector3(c.x - ext.x, c.y - ext.y, c.z - ext.z));
            box.expandByPoint(new THREE.Vector3(c.x + ext.x, c.y + ext.y, c.z + ext.z));
        });
        shapes3D.forEach(s => {
            const p = s.position || [0, 0, 0];
            const pr = s.params || {};
            const ex = pr.width || pr.radiusTop || pr.radius || pr.radiusBottom || 2;
            const ey = pr.height || pr.length || pr.radius || 2;
            const ez = pr.width || pr.depth || pr.radius || pr.radiusBottom || 2;
            box.expandByPoint(new THREE.Vector3(p[0] - ex / 2, p[1] - ey / 2, p[2] - ez / 2));
            box.expandByPoint(new THREE.Vector3(p[0] + ex / 2, p[1] + ey / 2, p[2] + ez / 2));
        });

        if (box.isEmpty()) return;
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 1);
        const dist = maxDim * 2.2;

        camera.position.set(center.x + dist * 0.6, center.y + dist * 0.7, center.z + dist);
        camera.lookAt(center);
        if (controls) {
            controls.target.copy(center);
            controls.update();
        }
    }, [objects, shapes3D, camera, controls, disabled]);

    return null;
};

export default function Viewport3D({ objects, renderBodies }) {
    const shapes3D = useStore(state => state.shapes3D);
    const active3DTool = useStore(state => state.active3DTool);
    const addShape3D = useStore(state => state.addShape3D);
    const showGrid = useStore(state => state.showGrid);
    const toggleGrid = useStore(state => state.toggleGrid);

    // Simulation state
    const simulationFrames = useStore(state => state.simulationFrames);
    const currentFrameIndex = useStore(state => state.currentFrameIndex);
    const isPlaying = useStore(state => state.isPlaying);
    const constraints = useStore(state => state.constraints);

    return (
        <div className="w-full h-full relative group">
            {/* Viewport UI Overlay */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <button
                    onClick={toggleGrid}
                    className={`p-2 rounded-lg border transition-all ${
                        showGrid 
                        ? 'bg-primary/20 border-primary text-primary shadow-lg shadow-primary/20' 
                        : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                    title={showGrid ? "Hide Grid" : "Show Grid"}
                >
                    <GridIcon size={18} />
                </button>
            </div>

            <Canvas
                camera={{ position: [100, 100, 100], fov: 46 }}
                shadows
                gl={{
                    antialias: true,
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.12,
                    outputColorSpace: THREE.SRGBColorSpace
                }}
            >
                <color attach="background" args={['#0a0f1a']} />
                <fog attach="fog" args={['#0a0f1a', 180, 520]} />
                <ambientLight intensity={0.14} />
                <directionalLight position={[120, 220, 90]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0002} />
                <directionalLight position={[-90, 100, -70]} intensity={0.42} />
                <directionalLight position={[0, 80, -220]} intensity={0.26} color="#a5b4fc" />

                <Environment preset="city" />
                {useStore.getState().water?.enabled && <WaterSurface />}

                {/* Engineering Grid */}
                {showGrid && (
                    <Grid
                        infiniteGrid
                        fadeDistance={1000}
                        sectionColor="#256af4"
                        sectionSize={10}
                        cellColor="#1e293b"
                        cellSize={1}
                        position={[0, -0.01, 0]}
                    />
                )}

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
                                isStatic: false,
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

            <Suspense fallback={<Loader />}>
                {/* Project Objects (Both Drafting Extrusions and Simulation Trajectories) */}
                {objects.map((obj) => (
                    <Extrudable2DShape 
                        key={`ext-${obj.id}`} 
                        obj={obj} 
                        isPlaying={isPlaying} 
                        simulationFrames={simulationFrames} 
                        currentFrameIndex={currentFrameIndex} 
                        renderBodies={renderBodies}
                    />
                ))}

                {/* Native 3D Objects */}
                {shapes3D.map(shape => (
                    <Shape3DNode key={shape.id} shape={shape} renderBodies={renderBodies} />
                ))}

                <ExtrudePreview />
            </Suspense>

            {/* Constraints / Joints */}
            {constraints.map(c => (
                <React.Fragment key={c.id}>
                    <JointMarker constraint={c} />
                    {c.type === 'distance' && <DistanceRod constraint={c} />}
                </React.Fragment>
            ))}

            {/* Collisions for current frame */}
            {simulationFrames[currentFrameIndex]?.contacts?.map((contact, idx) => (
                <CollisionMarker key={`contact-${idx}`} contact={contact} />
            ))}

            <VectorOverlay />

            <OrbitControls makeDefault />

            <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
                <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="white" />
            </GizmoHelper>

            <CameraRig objects={objects} shapes3D={shapes3D} disabled={isPlaying} />
        </Canvas>
        </div>
    );
}
