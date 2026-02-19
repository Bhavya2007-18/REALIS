import { create } from 'zustand'

const useStore = create((set) => ({
    activeTab: 'Design',
    selectedObject: null,
    simulationState: 'idle',

    setActiveTab: (tab) => set({ activeTab: tab }),
    setSelectedObject: (obj) => set({ selectedObject: obj }),
    setSimulationState: (state) => set({ simulationState: state }),
}))

export default useStore
