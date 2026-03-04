import { useState } from 'react'
import { Folder, FolderOpen, FileText, ChevronRight, ChevronDown } from 'lucide-react'
import useStore from '../store/useStore'

function FileIcon({ name }) {
    const extension = name.split('.').pop().toLowerCase()
    if (['cpp', 'hpp', 'c', 'h'].includes(extension)) return <span className="text-blue-400 font-bold mr-1.5 text-[10px]">C++</span>
    if (extension === 'md') return <FileText size={14} className="text-blue-300 mr-1.5" />
    if (extension === 'txt') return <FileText size={14} className="text-slate-400 mr-1.5" />
    return <FileText size={14} className="text-slate-400 mr-1.5" />
}

function FileTreeNode({ item, depth = 0 }) {
    const [isOpen, setIsOpen] = useState(item.isOpen || false)
    const activeFileId = useStore((s) => s.activeFileId)
    const setActiveFileId = useStore((s) => s.setActiveFileId)

    const isSelected = activeFileId === item.id
    const isFolder = item.type === 'folder'

    const handleClick = (e) => {
        e.stopPropagation()
        if (isFolder) {
            setIsOpen(!isOpen)
        } else {
            setActiveFileId(item.id)
        }
    }

    return (
        <div className="select-none">
            <div
                onClick={handleClick}
                className={`flex items-center py-0.5 px-2 cursor-pointer transition-colors group ${isSelected
                        ? 'bg-primary/20 text-white'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
                <span className="w-4 flex items-center justify-center mr-1">
                    {isFolder && (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                </span>

                <span className="flex items-center">
                    {isFolder ? (
                        isOpen ? <FolderOpen size={16} className="text-blue-400 mr-1.5" /> : <Folder size={16} className="text-blue-400 mr-1.5" />
                    ) : (
                        <FileIcon name={item.name} />
                    )}
                    <span className="text-xs truncate">{item.name}</span>
                </span>
            </div>

            {isFolder && isOpen && item.children && (
                <div>
                    {item.children.map((child) => (
                        <FileTreeNode key={child.id} item={child} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default function FileTree() {
    const fileTree = useStore((s) => s.fileTree)

    return (
        <div className="flex flex-col h-full overflow-y-auto py-1">
            {fileTree.map((item) => (
                <FileTreeNode key={item.id} item={item} />
            ))}
        </div>
    )
}
