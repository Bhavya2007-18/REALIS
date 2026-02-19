import { create } from 'zustand'

const useStore = create((set, get) => ({
    activeTab: 'Design',
    activeWorkspace: 'design',
    simulationState: 'idle',

    selectedObject: null,
    sceneObjects: [],

    setActiveTab: (tab) => set({ activeTab: tab }),
    setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
    setSimulationState: (state) => set({ simulationState: state }),
    setSelectedObject: (id) => set({ selectedObject: id }),

    addObject: (obj) =>
        set((s) => ({
            sceneObjects: [...s.sceneObjects, obj],
            selectedObject: obj.id,
        })),

    removeObject: (id) =>
        set((s) => ({
            sceneObjects: s.sceneObjects.filter((o) => o.id !== id),
            selectedObject: s.selectedObject === id ? null : s.selectedObject,
        })),

    updateObject: (id, changes) =>
        set((s) => ({
            sceneObjects: s.sceneObjects.map((o) =>
                o.id === id ? { ...o, ...changes } : o
            ),
        })),

    getSelectedObject: () => {
        const s = get()
        return s.sceneObjects.find((o) => o.id === s.selectedObject) ?? null
    },
}))

export default useStore
