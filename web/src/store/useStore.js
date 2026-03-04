import { create } from 'zustand'

const useStore = create((set) => ({
    activeWorkspace: 'design',
    setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),

    fps: 60,
    simTime: 0,
    setSimTime: (time) => set({ simTime: time }),

    isSidebarOpen: true,
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

    isAIPanelOpen: true,
    toggleAIPanel: () => set((state) => ({ isAIPanelOpen: !state.isAIPanelOpen })),
}))

export default useStore
