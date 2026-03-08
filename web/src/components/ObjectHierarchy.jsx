import useStore from '../store/useStore'
import { Box, Circle, Ruler, Pencil, Trash2, Layers } from 'lucide-react'

export default function ObjectHierarchy() {
    const objects = useStore(s => s.objects)
    const setObjects = useStore(s => s.setObjects)
    const activeFileId = useStore(s => s.activeFileId)
    const shapes3D = useStore(s => s.shapes3D)
    const selected3DIds = useStore(s => s.selected3DIds)
    const setSelected3DIds = useStore(s => s.setSelected3DIds)
    const setSelectedIds = useStore(s => s.setSelectedIds)
    const setShapes3D = useStore(s => s.setShapes3D)

    const handleSelect = (id, is3D = false) => {
        if (is3D) {
            setSelected3DIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [id])
            setSelectedIds([]) // Clear 2D selection
        } else {
            setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [id])
            setSelected3DIds([]) // Clear 3D selection
        }
        useStore.setState({ activeFileId: activeFileId === id ? null : id })
    }

    const handleDelete = (id, is3D, e) => {
        e.stopPropagation()
        if (is3D) {
            setShapes3D(prev => prev.filter(o => o.id !== id))
        } else {
            setObjects(prev => prev.filter(o => o.id !== id))
        }
        if (activeFileId === id) useStore.setState({ activeFileId: null })
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

    // Helper to render an item
    const renderItem = (obj, isChild = false, is3D = false) => {
        const isSelected = is3D ? selected3DIds.includes(obj.id) : activeFileId === obj.id;
        return (
            <div
                key={obj.id}
                onClick={() => handleSelect(obj.id, is3D)}
                className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer transition-all group ${isSelected
                    ? 'bg-primary/20 text-primary border border-primary/20'
                    : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400'
                    } ${isChild ? 'ml-4 border-l border-slate-700/50 pl-2' : ''}`}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    {getIcon(obj.type, is3D)}
                    <span className="text-[11px] font-mono truncate">
                        {obj.name || `${obj.type}_${obj.id.substring(0, 4)}`}
                    </span>
                </div>
                <button
                    onClick={(e) => handleDelete(obj.id, is3D, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                >
                    <Trash2 size={10} />
                </button>
            </div>
        )
    };

    // Group objects by groupId
    const groups = {};
    const standalone = [];

    objects.forEach(obj => {
        if (obj.groupId) {
            if (!groups[obj.groupId]) groups[obj.groupId] = [];
            groups[obj.groupId].push(obj);
        } else {
            standalone.push(obj);
        }
    });

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {objects.length === 0 && shapes3D.length === 0 ? (
                <div className="text-[10px] text-slate-500 text-center py-4 italic">
                    No objects in scene
                </div>
            ) : (
                <>
                    {/* 3D Shapes */}
                    {shapes3D.length > 0 && (
                        <div className="mb-2">
                            <div className="px-1 py-1 text-[10px] uppercase font-bold text-slate-500 mb-1">3D Models</div>
                            {shapes3D.map(obj => renderItem(obj, false, true))}
                        </div>
                    )}

                    {/* 2D Drafts */}
                    {objects.length > 0 && (
                        <div>
                            <div className="px-1 py-1 text-[10px] uppercase font-bold text-slate-500 mb-1">2D Drafts</div>
                            {/* Standalone Objects */}
                            {standalone.map(obj => renderItem(obj))}

                            {/* Grouped Objects */}
                            {Object.entries(groups).map(([groupId, groupObjs]) => (
                                <div key={groupId} className="space-y-0.5 mt-1">
                                    <div className="flex items-center gap-2 px-1 py-1 text-[10px] uppercase font-bold text-slate-500 bg-slate-800/20 rounded cursor-default">
                                        <Layers size={10} />
                                        <span>Group {groupId.substring(0, 4)}</span>
                                    </div>
                                    {groupObjs.map(obj => renderItem(obj, true))}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
