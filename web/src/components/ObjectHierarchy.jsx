import useStore from '../store/useStore'
import { Box, Circle, Ruler, Pencil, Trash2, Layers } from 'lucide-react'

export default function ObjectHierarchy() {
    const objects = useStore(s => s.objects)
    const activeFileId = useStore(s => s.activeFileId)
    const setObjects = useStore(s => s.setObjects)

    const handleSelect = (id) => {
        // Toggle selection or single selection
        // In our current store, activeFileId acts as the selection ID
        const state = useStore.getState()
        state.setObjects(prev => prev) // Just a trigger if needed, but we use standalone setter
        // Actually, we use activeFileId for PropertiesPanel
        useStore.setState({ activeFileId: activeFileId === id ? null : id })
    }

    const handleDelete = (id, e) => {
        e.stopPropagation()
        setObjects(prev => prev.filter(o => o.id !== id))
    }

    const getIcon = (type) => {
        switch (type) {
            case 'rect': return <Box size={12} className="text-blue-400" />
            case 'circle': return <Circle size={12} className="text-purple-400" />
            case 'path': return <Pencil size={12} className="text-emerald-400" />
            case 'ruler': return <Ruler size={12} className="text-red-400" />
            default: return <Layers size={12} className="text-slate-400" />
        }
    }

    // Helper to render an item
    const renderItem = (obj, isChild = false) => (
        <div
            key={obj.id}
            onClick={() => handleSelect(obj.id)}
            className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer transition-all group ${activeFileId === obj.id
                    ? 'bg-primary/20 text-primary border border-primary/20'
                    : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400'
                } ${isChild ? 'ml-4 border-l border-slate-700/50 pl-2' : ''}`}
        >
            <div className="flex items-center gap-2 overflow-hidden">
                {getIcon(obj.type)}
                <span className="text-[11px] font-mono truncate">
                    {obj.name || `${obj.type}_${obj.id.substring(0, 4)}`}
                </span>
            </div>
            <button
                onClick={(e) => handleDelete(obj.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
            >
                <Trash2 size={10} />
            </button>
        </div>
    );

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
            {objects.length === 0 ? (
                <div className="text-[10px] text-slate-500 text-center py-4 italic">
                    No objects in scene
                </div>
            ) : (
                <>
                    {/* Standalone Objects */}
                    {standalone.map(obj => renderItem(obj))}

                    {/* Grouped Objects */}
                    {Object.entries(groups).map(([groupId, groupObjs]) => (
                        <div key={groupId} className="space-y-0.5">
                            <div className="flex items-center gap-2 px-1 py-1 text-[10px] uppercase font-bold text-slate-500 bg-slate-800/20 rounded cursor-default">
                                <Layers size={10} />
                                <span>Group {groupId.substring(0, 4)}</span>
                            </div>
                            {groupObjs.map(obj => renderItem(obj, true))}
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}
