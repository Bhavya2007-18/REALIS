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

    // Global 3D Modeler Objects state
    shapes3D: [],
    setShapes3D: (shapes) => set({ shapes3D: typeof shapes === 'function' ? shapes(useStore.getState().shapes3D) : shapes }),
    addShape3D: (shape) => set((state) => {
        // We will likely want to hook this into history later, for now just append
        return { shapes3D: [...state.shapes3D, shape] };
    }),
    active3DTool: 'select', // 'select', 'translate', 'rotate', 'scale', 'cube', 'sphere', etc.
    setActive3DTool: (tool) => set({ active3DTool: tool }),

    // History State
    history: [],
    historyIndex: -1,

    // Saves a snapshot. Should be called BEFORE modifying the objects array for an operation.
    saveHistorySnapshot: () => set((state) => {
        const nextHistory = state.history.slice(0, state.historyIndex + 1);
        // Only save if different from last state to avoid duplicate snapshots
        if (nextHistory.length > 0 && JSON.stringify(nextHistory[nextHistory.length - 1].objects) === JSON.stringify(state.objects)) {
            return state;
        }
        nextHistory.push({ objects: JSON.parse(JSON.stringify(state.objects)) });
        // Cap history at 50 to prevent memory blowup
        if (nextHistory.length > 50) nextHistory.shift();
        return { history: nextHistory, historyIndex: nextHistory.length - 1 };
    }),

    undo: () => set((state) => {
        if (state.historyIndex < 0) return state; // Nothing to undo

        // If we are at the front of the queue, we need to save our current state as the "future" before stepping back
        let currentHistory = state.history;
        let cIdx = state.historyIndex;

        if (cIdx === currentHistory.length - 1) {
            const headState = JSON.parse(JSON.stringify(state.objects));
            if (JSON.stringify(headState) !== JSON.stringify(currentHistory[cIdx].objects)) {
                currentHistory = [...currentHistory, { objects: headState }];
            }
        }

        const newIndex = Math.max(0, cIdx);
        // Need to restore state.history[newIndex] objects
        return {
            history: currentHistory,
            historyIndex: newIndex - 1,
            objects: JSON.parse(JSON.stringify(currentHistory[newIndex].objects))
        };
    }),

    redo: () => set((state) => {
        if (state.historyIndex >= state.history.length - 1) return state; // Nothing to redo
        const newIndex = state.historyIndex + 1;
        return {
            historyIndex: newIndex,
            objects: JSON.parse(JSON.stringify(state.history[newIndex].objects))
        };
    }),

    // Override setObjects to automatically capture history if requested, or manual
    setObjects: (objs) => set({ objects: typeof objs === 'function' ? objs(useStore.getState().objects) : objs }),
    addCADObject: (obj) => set((state) => {
        state.saveHistorySnapshot();
        return { objects: [...state.objects, obj] };
    }),

    // Layer System
    layers: [
        { id: 'default', name: 'Layer 0', color: '#3b82f6', visible: true, locked: false },
        { id: 'layer1', name: 'Layer 1', color: '#10b981', visible: true, locked: false },
        { id: 'layer2', name: 'Dimensions', color: '#f59e0b', visible: true, locked: false },
    ],
    activeLayerId: 'default',
    setLayers: (layers) => set({ layers: typeof layers === 'function' ? layers(useStore.getState().layers) : layers }),
    addLayer: (layer) => set((state) => ({ layers: [...state.layers, layer] })),
    setActiveLayerId: (id) => set({ activeLayerId: id }),

    // Delete selected objects
    deleteObjects: () => set((state) => {
        const { selectedIds, objects } = state;
        if (selectedIds.length === 0) return state;
        state.saveHistorySnapshot();
        return {
            objects: objects.filter(o => !selectedIds.includes(o.id)),
            selectedIds: []
        };
    }),

    // Duplicate selected objects (offset slightly so they don't exactly overlap)
    duplicateObjects: () => set((state) => {
        const { selectedIds, objects } = state;
        if (selectedIds.length === 0) return state;
        state.saveHistorySnapshot();
        const clones = objects.filter(o => selectedIds.includes(o.id)).map(obj => {
            const clone = { ...obj, id: Math.random().toString(36).substring(2, 9) };
            const offset = 20; // 20px offset
            if (clone.type === 'rect') { clone.x += offset; clone.y += offset; }
            else if (clone.type === 'circle' || clone.type === 'polygon' || clone.type === 'arc') { clone.cx += offset; clone.cy += offset; }
            else if (clone.type === 'path' && clone.points) { clone.points = clone.points.map(p => ({ ...p, x: p.x + offset, y: p.y + offset })); }
            else if (clone.type === 'ruler' || clone.type === 'dimension') { clone.x1 += offset; clone.y1 += offset; clone.x2 += offset; clone.y2 += offset; }
            return clone;
        });
        return {
            objects: [...objects, ...clones],
            selectedIds: clones.map(c => c.id) // Automatically select the new clones
        };
    }),

    // Mirror selected objects over X or Y axis
    mirrorObjects: (axis) => set((state) => {
        const { selectedIds, objects } = state;
        const clones = objects.filter(o => selectedIds.includes(o.id)).map(obj => {
            const clone = { ...obj, id: Math.random().toString(36).substring(2, 9) };
            if (axis === 'x') {
                if (clone.type === 'rect') { clone.y = -(clone.y + clone.height); }
                else if (clone.type === 'circle') { clone.cy = -clone.cy; }
                else if (clone.type === 'path' && clone.points) { clone.points = clone.points.map(p => ({ ...p, x: p.x, y: -p.y })); }
                else if (clone.type === 'ruler') { clone.y1 = -clone.y1; clone.y2 = -clone.y2; }
            } else {
                if (clone.type === 'rect') { clone.x = -(clone.x + clone.width); }
                else if (clone.type === 'circle') { clone.cx = -clone.cx; }
                else if (clone.type === 'path' && clone.points) { clone.points = clone.points.map(p => ({ ...p, x: -p.x, y: p.y })); }
                else if (clone.type === 'ruler') { clone.x1 = -clone.x1; clone.x2 = -clone.x2; }
            }
            return clone;
        });
        return { objects: [...objects, ...clones] };
    }),

    // Offset (expand/shrink) selected rect or circle by amount
    offsetObject: (amount) => set((state) => {
        const { selectedIds, objects } = state;
        return {
            objects: objects.map(obj => {
                if (!selectedIds.includes(obj.id)) return obj;
                if (obj.type === 'rect') {
                    return { ...obj, x: obj.x - amount, y: obj.y - amount, width: obj.width + amount * 2, height: obj.height + amount * 2 };
                }
                if (obj.type === 'circle') {
                    return { ...obj, r: Math.max(1, obj.r + amount) };
                }
                return obj;
            })
        };
    }),

    // Rectangular array: duplicate selected objects in a grid
    arrayObjects: (rows, cols, spacingX, spacingY) => set((state) => {
        const { selectedIds, objects } = state;
        const selected = objects.filter(o => selectedIds.includes(o.id));
        const clones = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (r === 0 && c === 0) continue; // skip original
                selected.forEach(obj => {
                    const clone = { ...obj, id: Math.random().toString(36).substring(2, 9) };
                    const dx = c * spacingX, dy = r * spacingY;
                    if (clone.type === 'rect') { clone.x += dx; clone.y += dy; }
                    else if (clone.type === 'circle') { clone.cx += dx; clone.cy += dy; }
                    else if (clone.type === 'path' && clone.points) { clone.points = clone.points.map(p => ({ ...p, x: p.x + dx, y: p.y + dy })); }
                    clones.push(clone);
                });
            }
        }
        return { objects: [...objects, ...clones] };
    }),

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

    selected3DIds: [],
    setSelected3DIds: (ids) => set({ selected3DIds: typeof ids === 'function' ? ids(useStore.getState().selected3DIds) : ids }),

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
