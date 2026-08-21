import { useState } from 'react'
import { Eye, EyeOff, Lock, Unlock, Plus, Layers, Check, Trash2 } from 'lucide-react'
import useStore from '../store/useStore'

/**
 * Layers are a view grouping over the scene: hiding one hides its geometry in
 * both the 2D canvas and the 3D viewport; deleting one re-homes its objects onto
 * the active layer rather than destroying them (see store `removeLayer`).
 *
 * Identity and defaults come from the store's `addLayer`, not from here — this
 * panel and the command line each used to mint their own random layer id, and
 * two layers sharing an id would silently capture each other's objects.
 */
export default function LayerPanel() {
    const layers = useStore(s => s.layers)
    const setLayers = useStore(s => s.setLayers)
    const addLayer = useStore(s => s.addLayer)
    const removeLayer = useStore(s => s.removeLayer)
    const renameLayer = useStore(s => s.renameLayer)
    const activeLayerId = useStore(s => s.activeLayerId)
    const setActiveLayerId = useStore(s => s.setActiveLayerId)
    const objects = useStore(s => s.objects)
    const shapes3D = useStore(s => s.shapes3D)

    const [isAdding, setIsAdding] = useState(false)
    const [newName, setNewName] = useState('')
    const [editingId, setEditingId] = useState(null)
    const [editName, setEditName] = useState('')

    const toggle = (id, field) => {
        setLayers(prev => prev.map(l => l.id === id ? { ...l, [field]: !l[field] } : l))
    }

    const handleAdd = () => {
        if (!newName.trim()) return
        addLayer({ name: newName.trim() })
        setNewName('')
        setIsAdding(false)
    }

    const commitRename = () => {
        if (editName.trim()) renameLayer(editingId, editName.trim())
        setEditingId(null)
    }

    // Shown on the delete button so the user knows what is about to move rather
    // than guessing (§1.4 — the consequence of an action must be visible).
    const countOn = (id) =>
        objects.filter(o => o.layerId === id).length + shapes3D.filter(s => s.layerId === id).length

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <Layers size={13} className="text-primary" /> Layers
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="size-5 flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/10 rounded transition-colors cursor-pointer"
                    title="New layer"
                >
                    <Plus size={13} />
                </button>
            </div>

            {isAdding && (
                <div className="p-2 border-b border-slate-800 flex gap-1">
                    <input
                        autoFocus
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setIsAdding(false) }}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs outline-none focus:border-primary"
                        placeholder="Layer name…"
                    />
                    <button onClick={handleAdd} className="text-primary px-2 text-xs cursor-pointer">OK</button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {layers.map(layer => {
                    const n = countOn(layer.id)
                    return (
                        <div
                            key={layer.id}
                            className={`group flex items-center gap-2 px-3 py-2 border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors cursor-pointer ${activeLayerId === layer.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                            onClick={() => setActiveLayerId(layer.id)}
                            onDoubleClick={() => { setEditingId(layer.id); setEditName(layer.name) }}
                        >
                            <span className="size-3 rounded-full shrink-0 border border-white/20" style={{ background: layer.color }} />

                            {editingId === layer.id ? (
                                <input
                                    autoFocus
                                    value={editName}
                                    onClick={e => e.stopPropagation()}
                                    onChange={e => setEditName(e.target.value)}
                                    onBlur={commitRename}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') commitRename()
                                        if (e.key === 'Escape') setEditingId(null)
                                    }}
                                    className="flex-1 min-w-0 bg-slate-800 border border-primary/50 rounded px-1 text-[11px] outline-none"
                                />
                            ) : (
                                <span className={`text-[11px] flex-1 truncate ${layer.visible ? 'text-slate-300' : 'text-slate-600'}`}>
                                    {layer.name}
                                    {n > 0 && <span className="text-slate-600 ml-1.5 font-mono">{n}</span>}
                                </span>
                            )}

                            {activeLayerId === layer.id && <Check size={10} className="text-primary shrink-0" />}

                            <button
                                onClick={e => { e.stopPropagation(); toggle(layer.id, 'visible') }}
                                title={layer.visible ? 'Hide layer' : 'Show layer'}
                                className={`text-slate-500 hover:text-slate-300 transition-all cursor-pointer ${layer.visible ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}
                            >
                                {layer.visible ? <Eye size={11} /> : <EyeOff size={11} className="text-slate-700" />}
                            </button>

                            <button
                                onClick={e => { e.stopPropagation(); toggle(layer.id, 'locked') }}
                                title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                                className={`text-slate-500 hover:text-slate-300 transition-all cursor-pointer ${layer.locked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            >
                                {layer.locked ? <Lock size={11} className="text-amber-500" /> : <Unlock size={11} />}
                            </button>

                            {layers.length > 1 && (
                                <button
                                    onClick={e => { e.stopPropagation(); removeLayer(layer.id) }}
                                    title={n > 0 ? `Delete layer — ${n} object(s) move to the active layer` : 'Delete layer'}
                                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-500 transition-all cursor-pointer"
                                >
                                    <Trash2 size={11} />
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
