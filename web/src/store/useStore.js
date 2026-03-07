import { create } from 'zustand'

const useStore = create((set) => ({
    activeWorkspace: 'design',
    setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),

    activeTool: 'select', // 'select', 'move', 'rotate', 'rect', 'ruler', 'pencil'
    setActiveTool: (tool) => set({ activeTool: tool }),

    // Sidebar/Activity Bar state
    sidebarView: 'explorer', // 'explorer', 'search', 'git', 'debug'
    setSidebarView: (view) => set({ sidebarView: view }),

    isSidebarOpen: true,
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

    // Global CAD Objects state
    objects: [],
    setObjects: (objs) => set({ objects: typeof objs === 'function' ? objs(useStore.getState().objects) : objs }),
    addCADObject: (obj) => set((state) => ({ objects: [...state.objects, obj] })),

    constraints: [],
    setConstraints: (cons) => set({ constraints: typeof cons === 'function' ? cons(useStore.getState().constraints) : cons }),

    // Right Panel state
    rightPanelView: 'properties', // 'ai' or 'properties'
    setRightPanelView: (view) => set({ rightPanelView: view }),

    isRightPanelOpen: true,
    toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),

    // File Tree state
    // Selection state
    selectedIds: [],
    setSelectedIds: (ids) => set({ selectedIds: typeof ids === 'function' ? ids(useStore.getState().selectedIds) : ids }),
    activeFileId: null, // Still used for primary inspector focus
    setActiveFileId: (id) => set({ activeFileId: id }),

    groupObjects: () => set((state) => {
        const { selectedIds, objects } = state;
        if (selectedIds.length < 2) return state;

        const groupId = Math.random().toString(36).substring(2, 9);
        const newObjects = objects.map(obj =>
            selectedIds.includes(obj.id) ? { ...obj, groupId } : obj
        );

        return { objects: newObjects };
    }),

    ungroupObjects: () => set((state) => {
        const { selectedIds, objects } = state;
        const newObjects = objects.map(obj =>
            selectedIds.includes(obj.id) || (obj.groupId && selectedIds.includes(obj.groupId))
                ? { ...obj, groupId: null } : obj
        );
        return { objects: newObjects };
    }),
    fileTree: [
        {
            id: 'root',
            name: 'REALIS',
            type: 'folder',
            isOpen: true,
            children: [
                {
                    id: 'src',
                    name: 'renderer',
                    type: 'folder',
                    children: [
                        { id: 'main-cpp', name: 'main.cpp', type: 'file' },
                        { id: 'scene-hpp', name: 'SceneNode.hpp', type: 'file' },
                    ]
                },
                {
                    id: 'physics',
                    name: 'physics',
                    type: 'folder',
                    children: [
                        { id: 'rigid-body', name: 'RigidBody.cpp', type: 'file' },
                        { id: 'solver', name: 'ContactSolver.cpp', type: 'file' },
                    ]
                },
                { id: 'cmake', name: 'CMakeLists.txt', type: 'file' },
                { id: 'readme', name: 'README.md', type: 'file' },
            ]
        }
    ],

    fps: 60,
    simTime: 0,
    setSimTime: (time) => set({ simTime: time }),

    // --- Simulation & Playback State ---
    simulationFrames: [], // Array of frames from the backend
    setSimulationFrames: (frames) => set({ simulationFrames: frames }),
    isPlaying: false,
    setIsPlaying: (playing) => set({ isPlaying: playing }),
    currentFrameIndex: 0,
    setCurrentFrameIndex: (index) => set({ currentFrameIndex: index }),

    // Helper to control playback
    togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
    resetPlayback: () => set({ currentFrameIndex: 0, isPlaying: false, simTime: 0 }),
}))

export default useStore
