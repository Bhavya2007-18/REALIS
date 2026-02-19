import { useState, useCallback, useEffect, useRef } from 'react'

export default function useResizable({ initial, min, max, direction = 'right' }) {
    const [size, setSize] = useState(initial)
    const dragging = useRef(false)
    const startX = useRef(0)
    const startSize = useRef(initial)

    const onMouseDown = useCallback((e) => {
        e.preventDefault()
        dragging.current = true
        startX.current = e.clientX
        startSize.current = size
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
    }, [size])

    useEffect(() => {
        function onMouseMove(e) {
            if (!dragging.current) return
            const delta = direction === 'right'
                ? e.clientX - startX.current
                : startX.current - e.clientX
            const next = Math.max(min, Math.min(max, startSize.current + delta))
            setSize(next)
        }

        function onMouseUp() {
            if (!dragging.current) return
            dragging.current = false
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }

        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
        return () => {
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', onMouseUp)
        }
    }, [min, max, direction])

    return { size, onMouseDown }
}
