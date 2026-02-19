import useStore from '../../store/useStore'
import { createObject, OBJECT_TYPES } from '../../scene/objectFactory'

const TYPE_ICONS = {
    circle: '●',
    box: '■',
    particle: '•',
}

const TYPE_COLORS = {
    circle: '#4b7cf3',
    box: '#22c55e',
    particle: '#eab308',
}

export default function ObjectList() {
    const sceneObjects = useStore((s) => s.sceneObjects)
    const selectedObject = useStore((s) => s.selectedObject)
    const setSelectedObject = useStore((s) => s.setSelectedObject)
    const addObject = useStore((s) => s.addObject)
    const removeObject = useStore((s) => s.removeObject)

    return (
        <div className="flex flex-col">
            <div className="flex gap-1 px-2 pb-2">
                {OBJECT_TYPES.map((type) => (
                    <button
                        key={type}
                        onClick={() => {
                            const obj = createObject(type, {
                                x: Math.round((Math.random() - 0.5) * 300),
                                y: Math.round((Math.random() - 0.5) * 200),
                            })
                            addObject(obj)
                        }}
                        className="flex-1 py-1 rounded text-[10px] font-medium capitalize transition-colors duration-100 cursor-pointer flex items-center justify-center gap-1"
                        style={{
                            backgroundColor: 'var(--color-bg-base)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-muted)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = TYPE_COLORS[type]
                            e.currentTarget.style.color = 'var(--color-text-primary)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-border)'
                            e.currentTarget.style.color = 'var(--color-text-muted)'
                        }}>
                        <span style={{ color: TYPE_COLORS[type], fontSize: '8px' }}>{TYPE_ICONS[type]}</span>
                        {type}
                    </button>
                ))}
            </div>

            {sceneObjects.length === 0 && (
                <div className="px-2 py-3 text-[10px] text-center"
                    style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
                    No objects — click above to add
                </div>
            )}

            {sceneObjects.map((obj) => (
                <button
                    key={obj.id}
                    onClick={() => setSelectedObject(obj.id)}
                    className="flex items-center gap-2 px-2 py-1 text-[11px] transition-colors duration-100 cursor-pointer w-full text-left group"
                    style={{
                        backgroundColor: selectedObject === obj.id ? 'var(--color-bg-panel-hover)' : 'transparent',
                        color: selectedObject === obj.id ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                    }}
                    onMouseEnter={(e) => {
                        if (selectedObject !== obj.id) e.currentTarget.style.backgroundColor = 'var(--color-bg-panel-hover)'
                    }}
                    onMouseLeave={(e) => {
                        if (selectedObject !== obj.id) e.currentTarget.style.backgroundColor = 'transparent'
                    }}>
                    <span style={{ color: obj.color, fontSize: '8px' }}>{TYPE_ICONS[obj.type]}</span>
                    <span className="flex-1 truncate">{obj.name}</span>
                    <span
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-100 text-[10px] px-1 rounded"
                        style={{ color: 'var(--color-text-muted)' }}
                        onClick={(e) => {
                            e.stopPropagation()
                            removeObject(obj.id)
                        }}>
                        ✕
                    </span>
                </button>
            ))}
        </div>
    )
}
