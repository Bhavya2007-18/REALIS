import { useState } from 'react'
import { Eye, EyeOff, Lock, Unlock, Plus, Layers, Check } from 'lucide-react'
import useStore from '../store/useStore'

export default function LayerPanel() {
    const layers = useStore(s => s.layers)
    const setLayers = useStore(s => s.setLayers)
    const addLayer = useStore(s => s.addLayer)
    const activeLayerId = useStore(s => s.activeLayerId)
    const setActiveLayerId = useStore(s => s.setActiveLayerId)
    const [isAdding, setIsAdding] = useState(false)
    const [newName, setNewName] = useState('')

    const toggle = (id, field) => {
        setLayers(prev => prev.map(l => l.id === id ? { ...l, [field]: !l[field] } : l))
    }

    const handleAdd = () => {
        if (!newName.trim()) return
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']
        addLayer({
            id: Math.random().toString(36).substring(2, 7),
            name: newName.trim(),
            color: colors[layers.length % colors.length],
            visible: true,
            locked: false
        })
        setNewName('')
        setIsAdding(false)
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <Layers size={13} className="text-primary" /> Layers
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="size-5 flex items-center justify-center text-slate-500 hover:text-primary hover:bg-primary/10 rounded transition-colors cursor-pointer"
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
                {layers.map(layer => (
                    <div
                        key={layer.id}
                        className={`group flex items-center gap-2 px-3 py-2 border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors cursor-pointer ${activeLayerId === layer.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                        onClick={() => setActiveLayerId(layer.id)}
                    >
                        {}
                        <span className="size-3 rounded-full shrink-0 border border-white/20" style={{ background: layer.color }} />

                        {}
                        <span className={`text-[11px] flex-1 truncate ${layer.visible ? 'text-slate-300' : 'text-slate-600'}`}>
                            {layer.name}
                        </span>

                        {}
                        {activeLayerId === layer.id && <Check size={10} className="text-primary shrink-0" />}

                        {}
                        <button
                            onClick={e => { e.stopPropagation(); toggle(layer.id, 'visible') }}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
                        >
                            {layer.visible ? <Eye size={11} /> : <EyeOff size={11} className="text-slate-700" />}
                        </button>

                        {}
                        <button
                            onClick={e => { e.stopPropagation(); toggle(layer.id, 'locked') }}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
                        >
                            {layer.locked ? <Lock size={11} className="text-amber-500" /> : <Unlock size={11} />}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}