import SceneCanvas from '../components/Canvas/SceneCanvas'

export default function DesignWorkspace() {
    return (
        <main className="flex-1 relative overflow-hidden"
            style={{ backgroundColor: 'var(--color-bg-base)' }}>
            <SceneCanvas />
        </main>
    )
}
