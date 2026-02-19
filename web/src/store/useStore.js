import { create } from 'zustand'

const useStore = create((set) => ({
    activeTab: 'Design',
    selectedObject: null,
    simulationState: 'idle',
    activeWorkspace: 'design',

    setActiveTab: (tab) => set({ activeTab: tab }),
    setSelectedObject: (obj) => set({ selectedObject: obj }),
    setSimulationState: (state) => set({ simulationState: state }),
    setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
}))

export default useStore
