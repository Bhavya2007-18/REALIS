import { useState } from 'react'
import useStore from '../store/useStore'
import { Box, Circle, Ruler, Pencil, Trash2, Layers, Eye, EyeOff } from 'lucide-react'

/**
 * The scene tree — the one place an entity can be reached by name to select,
 * rename, hide, or delete it. The viewport can only reach what it draws.
 *
 * Selection and deletion are delegated wholesale to the store so this tree and
 * the viewport produce the same state:
 *
 *  • Selection went through `selectEntities`, replacing a local copy that
 *    highlighted 2D drafts by `activeFileId` while the viewport tracked them in
 *    `selectedIds` — so a shift-multi-select in the viewport lit up only one row.
 *  • Deletion went through `deleteEntities`, replacing a local filter that left
 *    every constraint referencing the deleted body dangling.
 */
export default function ObjectHierarchy() {
    const objects = useStore(s => s.objects)
    const shapes3D = useStore(s => s.shapes3D)
    const selectedIds = useStore(s => s.selectedIds)
    const selected3DIds = useStore(s => s.selected3DIds)
    const selectEntities = useStore(s => s.selectEntities)
    const deleteEntities = useStore(s => s.deleteEntities)
    const toggleVisibility = useStore(s => s.toggleVisibility)
    const renameEntity = useStore(s => s.renameEntity)

    const [editingId, setEditingId] = useState(null)
    const [draftName, setDraftName] = useState('')

    const beginRename = (obj, e) => {
        e.stopPropagation()
        setEditingId(obj.id)
        setDraftName(obj.name || '')
    }

    const commitRename = () => {
        const name = draftName.trim()
        // An empty name would leave the row labelled by its raw id, so keep the
        // previous name rather than writing a body nobody can identify.
        if (name) renameEntity(editingId, name)
        setEditingId(null)
    }

    const getIcon = (type, is3D = false) => {
        if (is3D) return <Box size={12} className="text-orange-400" />
        switch (type) {
            case 'rect': return <Box size={12} className="text-blue-400" />
            case 'circle': return <Circle size={12} className="text-purple-400" />
            case 'path': return <Pencil size={12} className="text-emerald-400" />
            case 'ruler': return <Ruler size={12} className="text-red-400" />
            default: return <Layers size={12} className="text-slate-400" />
        }
    }

    const renderItem = (obj, isChild = false, is3D = false) => {
        const isSelected = is3D ? selected3DIds.includes(obj.id) : selectedIds.includes(obj.id)
        const isHidden = obj.visible === false
        return (
            <div
                key={obj.id}
                onClick={(e) => selectEntities([obj.id], {
                    additive: e.ctrlKey || e.metaKey || e.shiftKey,
                    toggle: true
                })}
                onDoubleClick={(e) => beginRename(obj, e)}
                title={`${obj.name || obj.type} · ${obj.id}${isHidden ? ' · hidden' : ''}`}
                className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer transition-all group ${isSelected
                    ? 'bg-primary/20 text-primary border border-primary/20'
                    : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400'
                    } ${isChild ? 'ml-4 border-l border-slate-700/50 pl-2' : ''}`}
            >
                <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                    <span className={isHidden ? 'opacity-40' : ''}>{getIcon(obj.type, is3D)}</span>
                    {editingId === obj.id ? (
                        <input
                            autoFocus
                            value={draftName}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setDraftName(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') commitRename()
                                if (e.key === 'Escape') setEditingId(null)
                            }}
                            className="flex-1 min-w-0 bg-slate-800 border border-primary/50 rounded px-1 text-[11px] font-mono outline-none"
                        />
                    ) : (
                        <span className={`text-[11px] font-mono truncate ${isHidden ? 'italic text-slate-600' : ''}`}>
                            {obj.name || `${obj.type}_${obj.id.substring(0, 4)}`}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleVisibility(obj.id) }}
                        title={isHidden ? 'Show' : 'Hide'}
                        className={`p-1 transition-all hover:text-primary ${isHidden ? 'opacity-100 text-slate-600' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                        {isHidden ? <EyeOff size={10} /> : <Eye size={10} />}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); deleteEntities([obj.id]) }}
                        title="Delete"
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                    >
                        <Trash2 size={10} />
                    </button>
                </div>
            </div>
        )
    }

    const groups = {}
    const standalone = []

    objects.forEach(obj => {
        if (obj.groupId) {
            if (!groups[obj.groupId]) groups[obj.groupId] = []
            groups[obj.groupId].push(obj)
        } else {
            standalone.push(obj)
        }
    })

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {objects.length === 0 && shapes3D.length === 0 ? (
                <div className="text-[10px] text-slate-500 text-center py-4 italic">
                    No objects in scene
                </div>
            ) : (
                <>
                    {shapes3D.length > 0 && (
                        <div className="mb-2">
                            <div className="px-1 py-1 text-[10px] uppercase font-bold text-slate-500 mb-1">
                                3D Models <span className="text-slate-600">({shapes3D.length})</span>
                            </div>
                            {shapes3D.map(obj => renderItem(obj, false, true))}
                        </div>
                    )}

                    {objects.length > 0 && (
                        <div>
                            <div className="px-1 py-1 text-[10px] uppercase font-bold text-slate-500 mb-1">
                                2D Drafts <span className="text-slate-600">({objects.length})</span>
                            </div>
                            {standalone.map(obj => renderItem(obj))}

                            {Object.entries(groups).map(([groupId, groupObjs]) => (
                                <div key={groupId} className="space-y-0.5 mt-1">
                                    <div
                                        onClick={(e) => selectEntities(groupObjs.map(o => o.id), {
                                            additive: e.ctrlKey || e.metaKey || e.shiftKey
                                        })}
                                        className="flex items-center gap-2 px-1 py-1 text-[10px] uppercase font-bold text-slate-500 bg-slate-800/20 rounded cursor-pointer hover:text-slate-300"
                                    >
                                        <Layers size={10} />
                                        <span>Group {groupId.substring(0, 8)}</span>
                                    </div>
                                    {groupObjs.map(obj => renderItem(obj, true))}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
