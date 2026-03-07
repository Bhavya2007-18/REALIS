import { useState, useEffect } from 'react'
import { Settings, Maximize, Palette, Trash2, SlidersHorizontal, Activity } from 'lucide-react'
import useStore from '../store/useStore'

export default function PropertiesPanel() {
    // We repurpose the AIChatBot panel area for the Properties Panel when AI is hidden,
    // or we can just render it conditionally. For this CAD focus, we'll build the component first.

    const objects = useStore(s => s.objects)
    const setObjects = useStore(s => s.setObjects)
    const activeFileId = useStore(s => s.activeFileId)
    const selectedIds = useStore(s => s.selectedIds)
    const groupObjects = useStore(s => s.groupObjects)
    const ungroupObjects = useStore(s => s.ungroupObjects)

    const [selectedObject, setSelectedObject] = useState(null)

    useEffect(() => {
        if (activeFileId) {
            const obj = objects.find(o => o.id === activeFileId)
            setSelectedObject(obj || null)
        } else {
            setSelectedObject(null)
        }
    }, [activeFileId, objects])

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
            </aside>
        )
    }

    const handleChange = (field, value) => {
        const parsedValue =
            (field === 'stroke' || field === 'name' || field === 'points') ? value
                : field === 'isStatic' ? value
                    : parseFloat(value) || 0;
        setObjects(prev => prev.map(o => o.id === selectedObject.id ? { ...o, [field]: parsedValue } : o))
    }

    const handleDelete = () => {
        setObjects(prev => prev.filter(o => o.id !== selectedObject.id))
    }

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

                {/* General Info */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Settings size={12} /> General
                    </h4>

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

                {/* Transform */}
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

                </div>

                {/* Appearance */}
                <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Palette size={12} /> Appearance
                    </h4>

                    <div className="space-y-1 pt-1">
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={selectedObject.stroke || '#ffffff'}
                                onChange={e => handleChange('stroke', e.target.value)}
                                className="size-6 p-0 border-0 rounded overflow-hidden cursor-pointer"
                            />
                            <label className="text-xs text-slate-300">Stroke Color</label>
                        </div>
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

            </div>
        </aside>
    )
}
