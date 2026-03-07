import { useState } from 'react'
import { Square, Circle, Ruler, PencilRuler, ChevronRight, ChevronDown, Layers, Target } from 'lucide-react'
import useStore from '../store/useStore'

function ObjectIcon({ type, color }) {
    const iconProps = { size: 14, color: color || '#94a3b8', className: "mr-1.5" };
    switch (type) {
        case 'rect': return <Square {...iconProps} />;
        case 'circle': return <Circle {...iconProps} />;
        case 'ruler': return <Ruler {...iconProps} />;
        case 'path': return <PencilRuler {...iconProps} />;
        case 'group': return <Layers {...iconProps} />;
        default: return <Target {...iconProps} />;
    }
}

function ObjectTreeNode({ item, depth = 0 }) {
    const [isOpen, setIsOpen] = useState(true)
    // Using activeFileId as selected object id for simplicity in this MVP
    const activeFileId = useStore((s) => s.activeFileId)
    const setActiveFileId = useStore((s) => s.setActiveFileId)

    const isSelected = activeFileId === item.id
    const isGroup = item.type === 'group'

    const handleClick = (e) => {
        e.stopPropagation()
        if (isGroup) {
            setIsOpen(!isOpen)
        } else {
            setActiveFileId(item.id)
        }
    }

    return (
        <div className="select-none">
            <div
                onClick={handleClick}
                className={`flex items-center py-1 px-2 cursor-pointer transition-colors group ${isSelected
                    ? 'bg-primary/20 text-white'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
                <span className="w-4 flex items-center justify-center mr-1">
                    {isGroup && (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                </span>

                <span className="flex items-center">
                    <ObjectIcon type={item.type} color={item.stroke} />
                    <span className="text-xs truncate">{item.name || `${item.type}_${item.id.substring(0, 4)}`}</span>
                </span>
            </div>

            {isGroup && isOpen && item.children && (
                <div>
                    {item.children.map((child) => (
                        <ObjectTreeNode key={child.id} item={child} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default function FileTree() {
    const objects = useStore((s) => s.objects)

    if (!objects || objects.length === 0) {
        return <div className="p-4 text-xs text-slate-500 italic">No objects in scene</div>
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto py-1">
            {objects.map((item) => (
                <ObjectTreeNode key={item.id} item={item} />
            ))}
        </div>
    )
}
