import { useState, useCallback } from 'react'

export default function useResizable({ initial = 260, min = 150, max = 500, direction = 'right' } = {}) {
    const [size, setSize] = useState(initial)

    const onMouseDown = useCallback((e) => {
        const startPos = direction === 'right' || direction === 'left' ? e.clientX : e.clientY
        const startSize = size

        const onMouseMove = (moveEvent) => {
            const currentPos = direction === 'right' || direction === 'left' ? moveEvent.clientX : moveEvent.clientY
            const delta = direction === 'right' || direction === 'bottom' ? currentPos - startPos : startPos - currentPos

            const newSize = Math.max(min, Math.min(max, startSize + delta))
            setSize(newSize)
        }

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseUp', onMouseUp)
        }

        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }, [size, min, max, direction])

    return { size, onMouseDown }
}