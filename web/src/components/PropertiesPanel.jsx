import { useState, useEffect } from 'react'
import { Settings, Maximize, Palette, Trash2, SlidersHorizontal, Activity, Link, Plus, Layers } from 'lucide-react'
import useStore from '../store/useStore'
import { isClosedProfile } from '../utils/ProfileValidator'

const MATERIALS = {
    custom: { name: 'Custom' },
    aluminum: { name: 'Aluminum', color: '#d1d5db', roughness: 0.3, metalness: 0.8, friction: 0.1, restitution: 0.2 },
    steel: { name: 'Steel', color: '#9ca3af', roughness: 0.4, metalness: 0.9, friction: 0.3, restitution: 0.3 },
    cast_iron: { name: 'Cast Iron', color: '#4b5563', roughness: 0.6, metalness: 0.6, friction: 0.2, restitution: 0.1 },
    structural_steel: { name: 'Structural Steel', color: '#eab308', roughness: 0.7, metalness: 0.8, friction: 0.4, restitution: 0.1 },
    plastic: { name: 'Generic Plastic', color: '#3b82f6', roughness: 0.8, metalness: 0.1, friction: 0.5, restitution: 0.6 },
    rubber: { name: 'Rubber', color: '#1f2937', roughness: 0.9, metalness: 0.0, friction: 0.9, restitution: 0.8 },
    titanium: { name: 'Titanium', color: '#e5e7eb', roughness: 0.2, metalness: 0.8, friction: 0.3, restitution: 0.4 }
}

export default function PropertiesPanel() {
    const objects = useStore(s => s.objects)
    const setObjects = useStore(s => s.setObjects)
    const activeFileId = useStore(s => s.activeFileId)
    const selectedIds = useStore(s => s.selectedIds)
    const groupObjects = useStore(s => s.groupObjects)
    const ungroupObjects = useStore(s => s.ungroupObjects)
    const constraints = useStore(s => s.constraints)
    const setConstraints = useStore(s => s.setConstraints)

    const shapes3D = useStore(s => s.shapes3D)
    const setShapes3D = useStore(s => s.setShapes3D)
    const addShape3D = useStore(s => s.addShape3D)

    const active3DTool = useStore(s => s.active3DTool)
    const extrudeOperation = useStore(s => s.extrudeOperation)
    const setExtrudeOperation = useStore(s => s.setExtrudeOperation)

    const [selectedObject, setSelectedObject] = useState(null)

    // Joint form state
    const [jointType, setJointType] = useState('distance')
    const [jointTargetA, setJointTargetA] = useState('')
    const [jointTargetB, setJointTargetB] = useState('')
    const [jointDistance, setJointDistance] = useState(100)

    useEffect(() => {
        if (activeFileId) {
            let obj = objects.find(o => o.id === activeFileId)
            let is3D = false;
            if (!obj) {
                obj = shapes3D.find(o => o.id === activeFileId);
                is3D = !!obj;
            }
            setSelectedObject(obj ? { ...obj, is3D } : null)
            if (obj) setJointTargetA(obj.id)
        } else {
            setSelectedObject(null)
        }
    }, [activeFileId, objects, shapes3D])

    const Layers = Maximize // placeholder for missing icon

    if (!selectedObject) {
        return (
            <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-background-light dark:bg-background-dark flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
                    <SlidersHorizontal size={14} className="text-slate-500" />
                    <h3 className="font-bold text-sm text-slate-500">Properties</h3>
                </div>
                <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-500">
                    <p className="text-xs">Select an object to view its properties.</p>
                </div>

                {/* Global Joints List */}
                {constraints.length > 0 && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 mb-2">
                            <Link size={12} /> Joints ({constraints.length})
                        </h4>
                        <div className="space-y-1">
                            {constraints.map(c => (
                                <div key={c.id} className="flex items-center justify-between bg-slate-800/50 px-2 py-1 rounded text-[10px] font-mono">
                                    <span className="text-primary">{c.type}</span>
                                    <span className="text-slate-400 truncate mx-1">{c.targetA} ↔ {c.targetB || '⚓'}</span>
                                    <button onClick={() => setConstraints(prev => prev.filter(x => x.id !== c.id))} className="text-red-400 hover:text-red-300 transition-colors shrink-0">
                                        <Trash2 size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </aside>
        )
    }

    const handleChange = (field, value, subfield = null) => {
        if (selectedObject.is3D) {
            setShapes3D(prev => prev.map(o => {
                if (o.id === selectedObject.id) {
                    if (subfield) {
                        const val = value === '' ? 0 : parseFloat(value);
                        return { ...o, [field]: { ...o[field], [subfield]: isNaN(val) ? 0 : val } }
                    }
                    if (field === 'params') {
                        const newParams = { ...o.params };
                        Object.entries(value).forEach(([k, v]) => {
                            const val = v === '' ? 0 : parseFloat(v);
                            newParams[k] = isNaN(val) ? 0 : val;
                        });
                        return { ...o, params: newParams }
                    }

                    // Handle Boolean fields like isStatic
                    if (field === 'isStatic') {
                        return { ...o, [field]: !!value }
                    }

                    if (field === 'color' || field === 'name') {
                        return { ...o, [field]: value }
                    }

                    const val = value === '' ? 0 : parseFloat(value);
                    return { ...o, [field]: isNaN(val) ? 0 : val }
                }
                return o;
            }))
        } else {
            const parsedValue =
                (field === 'stroke' || field === 'name' || field === 'points') ? value
                    : field === 'isStatic' ? !!value
                        : parseFloat(value) || 0;
            setObjects(prev => prev.map(o => o.id === selectedObject.id ? { ...o, [field]: parsedValue } : o))
        }
    }

    const handleDelete = () => {
        if (selectedObject.is3D) {
            setShapes3D(prev => prev.filter(o => o.id !== selectedObject.id))
        } else {
            setObjects(prev => prev.filter(o => o.id !== selectedObject.id))
        }
        useStore.setState({ activeFileId: null })
    }

    const handleAddJoint = () => {
        if (!jointTargetA) return;
        if (jointType === 'distance' && !jointTargetB) return;

        const newConstraint = {
            id: `joint_${Math.random().toString(36).substring(2, 7)}`,
            type: jointType,
            targetA: jointTargetA,
            targetB: jointTargetB || null,
            distance: parseFloat(jointDistance),
        };
        setConstraints(prev => [...prev, newConstraint]);
    };

    return (
        <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-background-light dark:bg-background-dark flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {selectedIds.length > 1 && (
                        <button
                            onClick={groupObjects}
                            className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-md transition-colors"
                            title="Group Selected"
                        >
                            <Layers size={14} />
                        </button>
                    )}
                    {(selectedObject.groupId || (selectedIds.length === 1 && objects.find(o => o.id === selectedIds[0])?.groupId)) && (
                        <button
                            onClick={ungroupObjects}
                            className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-md transition-colors"
                            title="Ungroup"
                        >
                            <Maximize size={14} />
                        </button>
                    )}
                    <button onClick={handleDelete} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-md transition-colors" title="Delete Object">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Advanced Extrude Setup */}
                {active3DTool === 'extrude' && selectedObject && !selectedObject.is3D && isClosedProfile(selectedObject) && (
                    <div className="space-y-3 bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                            <Layers size={12} /> Extrude Profile
                        </h4>
                        
                        <div className="space-y-2">
                            <label className="text-xs text-slate-300">Distance</label>
                            <input
                                type="number"
                                value={extrudeOperation.distance}
                                onChange={e => setExtrudeOperation({ distance: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-slate-300">Direction</label>
                            <select
                                value={extrudeOperation.direction}
                                onChange={e => setExtrudeOperation({ direction: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300"
                            >
                                <option value="positive">+Z Direction</option>
                                <option value="negative">-Z Direction</option>
                                <option value="symmetric">Symmetric (Both)</option>
                            </select>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-xs text-slate-300">Operation</label>
                            <select
                                value={extrudeOperation.type}
                                onChange={e => setExtrudeOperation({ type: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300"
                            >
                                <option value="new">New Solid</option>
                                <option value="join" disabled>Join (CSG TBD)</option>
                                <option value="cut" disabled>Cut (CSG TBD)</option>
                            </select>
                        </div>

                        <button 
                            className="w-full py-1.5 mt-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-md transition-colors"
                            onClick={() => {
                                const solidId = `extsolid_${Math.random().toString(36).substring(2, 7)}`;
                                addShape3D({
                                    id: solidId,
                                    type: 'extruded_solid',
                                    profileId: selectedObject.id,
                                    distance: extrudeOperation.distance,
                                    direction: extrudeOperation.direction,
                                    operation: extrudeOperation.type,
                                    position: [0, 0, 0],
                                    rotation: [0, 0, 0],
                                    scale: [1, 1, 1],
                                    color: selectedObject.stroke || '#3b82f6',
                                    params: { ...extrudeOperation }
                                });
                                useStore.setState({ active3DTool: 'select', selectedIds: [], selected3DIds: [solidId], activeFileId: solidId });
                            }}
                        >
                            Generate 3D Solid
                        </button>
                    </div>
                )}
                
                {active3DTool === 'extrude' && selectedObject && !selectedObject.is3D && !isClosedProfile(selectedObject) && (
                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-xs text-red-500">
                        <strong>Invalid Profile</strong><br/>
                        Extrude requires a closed 2D profile. The selected {selectedObject.type} is not properly closed.
                    </div>
                )}

                {/* General Info */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Settings size={12} /> General
                    </h4>

                    <div className="grid grid-cols-3 items-center gap-2 mb-2">
                        <label className="text-xs text-slate-400">Name</label>
                        <div className="col-span-2">
                            <input
                                type="text"
                                value={selectedObject.name || ''}
                                placeholder={`${selectedObject.type}_${selectedObject.id.substring(0, 4)}`}
                                onChange={e => handleChange('name', e.target.value)}
                                className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 items-center gap-2">
                        <label className="text-xs text-slate-400">Type</label>
                        <div className="col-span-2 text-xs font-mono uppercase bg-slate-100 dark:bg-slate-800/50 px-2 py-1 rounded">
                            {selectedObject.type}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 items-center gap-2">
                        <label className="text-xs text-slate-400">ID</label>
                        <div className="col-span-2 text-[10px] font-mono text-slate-500 truncate">
                            {selectedObject.id}
                        </div>
                    </div>
                </div>

                {/* 3D Transform */}
                {selectedObject.is3D && (
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Maximize size={12} /> 3D Transform
                        </h4>

                        <div className="space-y-3">
                            <label className="text-[10px] text-slate-400 pl-1 uppercase tracking-tight font-bold">Position</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['x', 'y', 'z'].map(axis => (
                                    <div key={axis} className="space-y-1">
                                        <label className="text-[9px] text-slate-500 pl-1 uppercase">{axis}</label>
                                        <input
                                            type="number"
                                            value={selectedObject.position[axis]}
                                            onChange={e => handleChange('position', e.target.value, axis)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-1 text-[10px] font-mono"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] text-slate-400 pl-1 uppercase tracking-tight font-bold">Rotation (rad)</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['x', 'y', 'z'].map(axis => (
                                    <div key={axis} className="space-y-1">
                                        <label className="text-[9px] text-slate-500 pl-1 uppercase">{axis}</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={selectedObject.rotation[axis]}
                                            onChange={e => handleChange('rotation', e.target.value, axis)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-1 text-[10px] font-mono"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] text-slate-400 pl-1 uppercase tracking-tight font-bold">Scale</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['x', 'y', 'z'].map(axis => (
                                    <div key={axis} className="space-y-1">
                                        <label className="text-[9px] text-slate-500 pl-1 uppercase">{axis}</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={selectedObject.scale[axis]}
                                            onChange={e => handleChange('scale', e.target.value, axis)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-1 text-[10px] font-mono"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 2D Transform */}
                {!selectedObject.is3D && (
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Maximize size={12} /> Transform
                        </h4>

                        {selectedObject.type === 'rect' && (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">X Pos</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.x)}
                                            onChange={e => handleChange('x', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Y Pos</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.y)}
                                            onChange={e => handleChange('y', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Width</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.width)}
                                            onChange={e => handleChange('width', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Height</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.height)}
                                            onChange={e => handleChange('height', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Rotation (deg)</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.rotation || 0)}
                                            onChange={e => handleChange('rotation', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1 font-bold text-primary">3D Depth</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.depth || 20)}
                                            onChange={e => handleChange('depth', e.target.value)}
                                            className="w-full bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-md px-2 py-1 text-xs text-primary font-bold"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {selectedObject.type === 'path' && (
                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-400 pl-1">Vertices ({selectedObject.points?.length || 0})</label>
                                <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                    {selectedObject.points?.map((pt, i) => (
                                        <div key={i} className="flex gap-1 items-center bg-slate-100 dark:bg-slate-800/50 p-1 rounded">
                                            <span className="text-[9px] text-slate-500 w-3">{i}</span>
                                            <div className="flex-1 grid grid-cols-2 gap-1">
                                                <input
                                                    type="number"
                                                    value={Math.round(pt.x)}
                                                    onChange={e => {
                                                        const newPoints = [...selectedObject.points];
                                                        newPoints[i] = { ...newPoints[i], x: parseFloat(e.target.value) || 0 };
                                                        handleChange('points', newPoints)
                                                    }}
                                                    className="w-full bg-slate-200 dark:bg-slate-900 border-none rounded px-1 py-0.5 text-[10px]"
                                                />
                                                <input
                                                    type="number"
                                                    value={Math.round(pt.y)}
                                                    onChange={e => {
                                                        const newPoints = [...selectedObject.points];
                                                        newPoints[i] = { ...newPoints[i], y: parseFloat(e.target.value) || 0 };
                                                        handleChange('points', newPoints)
                                                    }}
                                                    className="w-full bg-slate-200 dark:bg-slate-900 border-none rounded px-1 py-0.5 text-[10px]"
                                                />
                                            </div>
                                            {selectedObject.points.length > 2 && (
                                                <button
                                                    onClick={() => {
                                                        const newPoints = selectedObject.points.filter((_, index) => index !== i);
                                                        handleChange('points', newPoints)
                                                    }}
                                                    className="text-slate-400 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 size={10} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-1 mt-2">
                                    <label className="text-[10px] text-slate-400 pl-1 font-bold text-primary">3D Depth</label>
                                    <input
                                        type="number"
                                        value={Math.round(selectedObject.depth || 20)}
                                        onChange={e => handleChange('depth', e.target.value)}
                                        className="w-full bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-md px-2 py-1 text-xs text-primary font-bold"
                                    />
                                </div>
                            </div>
                        )}

                        {selectedObject.type === 'circle' && (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Center X</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.cx)}
                                            onChange={e => handleChange('cx', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Center Y</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.cy)}
                                            onChange={e => handleChange('cy', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Radius</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.r)}
                                            onChange={e => handleChange('r', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1 font-bold text-primary">3D Depth</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.depth || 20)}
                                            onChange={e => handleChange('depth', e.target.value)}
                                            className="w-full bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-md px-2 py-1 text-xs text-primary font-bold"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {selectedObject.type === 'ruler' && (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">X1</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.x1)}
                                            onChange={e => handleChange('x1', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Y1</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.y1)}
                                            onChange={e => handleChange('y1', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">X2</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.x2)}
                                            onChange={e => handleChange('x2', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Y2</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.y2)}
                                            onChange={e => handleChange('y2', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {selectedObject.type === 'polygon' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Radius</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.r)}
                                            onChange={e => handleChange('r', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Sides</label>
                                        <input
                                            type="number"
                                            value={selectedObject.sides}
                                            onChange={e => handleChange('sides', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-400 pl-1 font-bold text-primary">3D Depth</label>
                                    <input
                                        type="number"
                                        value={Math.round(selectedObject.depth || 0)}
                                        onChange={e => handleChange('depth', e.target.value)}
                                        className="w-full bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-md px-2 py-1 text-xs text-primary font-bold"
                                    />
                                </div>
                            </div>
                        )}

                        {selectedObject.type === 'arc' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Radius</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.radius)}
                                            onChange={e => handleChange('radius', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1 font-bold text-primary">3D Depth</label>
                                        <input
                                            type="number"
                                            value={Math.round(selectedObject.depth || 0)}
                                            onChange={e => handleChange('depth', e.target.value)}
                                            className="w-full bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-md px-2 py-1 text-xs text-primary font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3D Parameters */}
                {selectedObject.is3D && (
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Settings size={12} /> Parameters
                        </h4>

                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(selectedObject.params || {}).map(([key, val]) => (
                                <div key={key} className="space-y-1">
                                    <label className="text-[10px] text-slate-400 pl-1 capitalize">{key}</label>
                                    <input
                                        type="number"
                                        value={val}
                                        onChange={e => handleChange('params', { [key]: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs font-mono"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Appearance */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Palette size={12} /> Appearance
                    </h4>

                    <div className="space-y-3 pt-1">
                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 pl-1">Material</label>
                            <select
                                value={selectedObject.material || 'custom'}
                                onChange={e => {
                                    const mat = e.target.value;
                                    handleChange('material', mat);
                                    if (mat !== 'custom') {
                                        const props = MATERIALS[mat];
                                        if (selectedObject.is3D) {
                                            handleChange('color', props.color);
                                            handleChange('roughness', props.roughness);
                                            handleChange('metalness', props.metalness);
                                        } else {
                                            handleChange('stroke', props.color);
                                        }
                                        handleChange('friction', props.friction);
                                        handleChange('restitution', props.restitution);
                                    }
                                }}
                                className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300 cursor-pointer mb-2"
                            >
                                {Object.entries(MATERIALS).map(([key, m]) => (
                                    <option key={key} value={key}>{m.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={selectedObject.is3D ? (selectedObject.color || '#ffffff') : (selectedObject.stroke || '#ffffff')}
                                onChange={e => {
                                    handleChange('material', 'custom');
                                    handleChange(selectedObject.is3D ? 'color' : 'stroke', e.target.value);
                                }}
                                className="size-6 p-0 border-0 rounded overflow-hidden cursor-pointer"
                            />
                            <label className="text-xs text-slate-300">{selectedObject.is3D ? 'Base Color' : 'Stroke Color'}</label>
                        </div>

                        {selectedObject.is3D && (
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[9px] text-slate-500 pl-1">Roughness</label>
                                    <input
                                        type="range" min="0" max="1" step="0.01"
                                        value={selectedObject.roughness || 0.5}
                                        onChange={e => handleChange('roughness', e.target.value)}
                                        className="w-full accent-primary h-1 bg-slate-700 rounded-full appearance-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] text-slate-500 pl-1">Metalness</label>
                                    <input
                                        type="range" min="0" max="1" step="0.01"
                                        value={selectedObject.metalness || 0.1}
                                        onChange={e => handleChange('metalness', e.target.value)}
                                        className="w-full accent-primary h-1 bg-slate-700 rounded-full appearance-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Physics */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Activity size={12} /> Physics
                    </h4>

                    <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={selectedObject.isStatic || false}
                                onChange={e => handleChange('isStatic', e.target.checked)}
                                className="size-3 cursor-pointer"
                            />
                            <label className="text-xs text-slate-300">Is Static (Floor/Wall)</label>
                        </div>

                        {!selectedObject.isStatic && (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Mass (kg)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={selectedObject.mass !== undefined ? selectedObject.mass : 1.0}
                                            onChange={e => handleChange('mass', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 pl-1">Friction</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={selectedObject.friction !== undefined ? selectedObject.friction : 0.3}
                                            onChange={e => handleChange('friction', e.target.value)}
                                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-400 pl-1">Restitution (Bounciness)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={selectedObject.restitution !== undefined ? selectedObject.restitution : 0.5}
                                        onChange={e => handleChange('restitution', e.target.value)}
                                        className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-xs"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Joints & Constraints */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Link size={12} /> Joints & Constraints
                    </h4>

                    <div className="space-y-2 pt-1 p-3 bg-slate-800/30 rounded-xl border border-slate-700/40">
                        {/* Joint Type */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 pl-1">Constraint Type</label>
                            <select
                                value={jointType}
                                onChange={e => setJointType(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300 cursor-pointer"
                            >
                                <option value="distance">Distance Joint (Rod)</option>
                                <option value="fixed">Fixed Anchor (Pin to World)</option>
                            </select>
                        </div>

                        {/* Body A */}
                        <div className="space-y-1">
                            <label className="text-[10px] text-slate-400 pl-1">Body A</label>
                            <select
                                value={jointTargetA}
                                onChange={e => setJointTargetA(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300 cursor-pointer"
                            >
                                <option value="">-- Select Object --</option>
                                {objects.map(o => (
                                    <option key={o.id} value={o.id}>{o.type} ({o.id.substring(0, 6)}…)</option>
                                ))}
                            </select>
                        </div>

                        {/* Body B (only for distance joint) */}
                        {jointType === 'distance' && (
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 pl-1">Body B</label>
                                <select
                                    value={jointTargetB}
                                    onChange={e => setJointTargetB(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300 cursor-pointer"
                                >
                                    <option value="">-- Select Object --</option>
                                    {objects.filter(o => o.id !== jointTargetA).map(o => (
                                        <option key={o.id} value={o.id}>{o.type} ({o.id.substring(0, 6)}…)</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Distance parameter */}
                        {jointType === 'distance' && (
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 pl-1">Target Distance</label>
                                <input
                                    type="number"
                                    value={jointDistance}
                                    onChange={e => setJointDistance(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs"
                                />
                            </div>
                        )}

                        <button
                            onClick={handleAddJoint}
                            disabled={!jointTargetA || (jointType === 'distance' && !jointTargetB)}
                            className="w-full flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/40 text-primary text-xs font-bold py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <Plus size={12} /> Add Constraint
                        </button>
                    </div>

                    {/* Existing Joints */}
                    {constraints.length > 0 && (
                        <div className="space-y-1">
                            {constraints.map(c => (
                                <div key={c.id} className="flex items-center justify-between bg-slate-800/50 px-2 py-1.5 rounded-lg text-[10px] font-mono border border-slate-700/30">
                                    <div className="flex flex-col">
                                        <span className="text-primary font-bold">{c.type}</span>
                                        <span className="text-slate-400">{c.targetA?.substring(0, 6)} ↔ {c.targetB?.substring(0, 6) || '⚓ world'}</span>
                                    </div>
                                    <button
                                        onClick={() => setConstraints(prev => prev.filter(x => x.id !== c.id))}
                                        className="text-red-400 hover:text-red-300 transition-colors p-1"
                                    >
                                        <Trash2 size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </aside>
    )
}

