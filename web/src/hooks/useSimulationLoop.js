import { useEffect, useRef } from 'react'
import useStore from '../store/useStore'
import { stepSimulation, createEngineState, computeEnergy } from '../engine/physics'

const engine = createEngineState()

export default function useSimulationLoop() {
    const rafId = useRef(null)
    const lastTime = useRef(null)
    const simTime = useRef(0)
    const frameCount = useRef(0)
    const fpsTime = useRef(performance.now())
    const fps = useRef(60)

    useEffect(() => {
        function tick(now) {
            const state = useStore.getState()

            if (state.simulationState === 'running') {
                const objects = stepSimulation(state.sceneObjects, engine)
                const energy = computeEnergy(objects, engine.gravity)
                simTime.current += engine.dt

                useStore.setState((s) => ({
                    sceneObjects: objects,
                    simTime: simTime.current,
                    fps: fps.current,
                    energyHistory: [
                        ...s.energyHistory,
                        { t: simTime.current, k: energy.kinetic, p: energy.potential, tot: energy.total }
                    ].slice(-600) // Keep last ~10s at 60fps
                }))
            }

            frameCount.current++
            const elapsed = now - fpsTime.current
            if (elapsed >= 500) {
                fps.current = Math.round(frameCount.current / (elapsed / 1000))
                frameCount.current = 0
                fpsTime.current = now
                useStore.setState({ fps: fps.current })
            }

            rafId.current = requestAnimationFrame(tick)
        }

        rafId.current = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(rafId.current)
    }, [])

    useEffect(() => {
        const unsub = useStore.subscribe((state, prev) => {
            if (prev.simulationState !== 'idle' && state.simulationState === 'idle') {
                simTime.current = 0
                useStore.setState({ simTime: 0 })
            }
        })
        return unsub
    }, [])
}
