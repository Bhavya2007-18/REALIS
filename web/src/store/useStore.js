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

    // Typed coordinates from CommandLine (e.g. user typed "100,200")
    typedCoordinates: null,
    setTypedCoordinates: (coords) => set({ typedCoordinates: coords }),

    // Global CAD Objects state
    objects: [],

    // Global 3D Modeler Objects state
    shapes3D: [],
    setShapes3D: (shapes) => set({ shapes3D: typeof shapes === 'function' ? shapes(useStore.getState().shapes3D) : shapes }),
    addShape3D: (shape) => set((state) => {
        state.saveHistorySnapshot();
        const physicsDefaults = {
            mass: 1.0,
            restitution: 0.5,
            friction: 0.3,
            isStatic: false
        };
        return { shapes3D: [...state.shapes3D, { ...physicsDefaults, ...shape }] };
    }),
    active3DTool: 'select', // 'select', 'translate', 'rotate', 'scale', 'cube', 'sphere', etc.
    setActive3DTool: (tool) => set({ active3DTool: tool }),

    // Advanced Extrude State
    extrudeOperation: {
        profileId: null,
        distance: 20,
        direction: 'positive', // 'positive', 'negative', 'symmetric'
        type: 'new' // 'new', 'join', 'cut'
    },
    setExtrudeOperation: (op) => set(state => ({ extrudeOperation: { ...state.extrudeOperation, ...op } })),
    
    // Demo Overlay State
    demoOverlay: null,
    setDemoOverlay: (overlay) => set({ demoOverlay: overlay }),

    // History State
    history: [],
    historyIndex: -1,

    saveHistorySnapshot: () => set((state) => {
        // Prune any "redo" future if we are performing a new action
        const nextHistory = state.history.slice(0, state.historyIndex + 1);

        const snapshot = {
            objects: JSON.parse(JSON.stringify(state.objects)),
            layers: JSON.parse(JSON.stringify(state.layers)),
            shapes3D: JSON.parse(JSON.stringify(state.shapes3D)),
            constraints: JSON.parse(JSON.stringify(state.constraints || [])),
            activeLayerId: state.activeLayerId
        };

        // Don't save identical consecutive snapshots
        if (nextHistory.length > 0) {
            const last = nextHistory[nextHistory.length - 1];
            if (JSON.stringify(last.objects) === JSON.stringify(snapshot.objects) &&
                JSON.stringify(last.layers) === JSON.stringify(snapshot.layers) &&
                JSON.stringify(last.shapes3D) === JSON.stringify(snapshot.shapes3D)) {
                return state;
            }
        }

        nextHistory.push(snapshot);
        if (nextHistory.length > 50) nextHistory.shift();

        return {
            history: nextHistory,
            historyIndex: nextHistory.length - 1
        };
    }),

    undo: () => set((state) => {
        let { history, historyIndex, objects, layers, shapes3D, constraints, activeLayerId } = state;
        if (historyIndex < 0 && history.length === 0) return state;

        const currentState = {
            objects: JSON.parse(JSON.stringify(objects)),
            layers: JSON.parse(JSON.stringify(layers)),
            shapes3D: JSON.parse(JSON.stringify(shapes3D)),
            constraints: JSON.parse(JSON.stringify(constraints || [])),
            activeLayerId
        };

        // If at current head, save current as "future" if not same as last snapshot
        let currentHistory = [...history];
        let cIdx = historyIndex;

        if (cIdx === currentHistory.length - 1) {
            if (JSON.stringify(currentState) !== JSON.stringify(currentHistory[cIdx])) {
                currentHistory.push(currentState);
                cIdx = currentHistory.length - 1;
            }
        }

        if (cIdx <= 0) return state;

        const targetIdx = cIdx - 1;
        const target = currentHistory[targetIdx];

        return {
            history: currentHistory,
            historyIndex: targetIdx,
            objects: JSON.parse(JSON.stringify(target.objects)),
            layers: JSON.parse(JSON.stringify(target.layers)),
            shapes3D: JSON.parse(JSON.stringify(target.shapes3D)),
            constraints: JSON.parse(JSON.stringify(target.constraints || [])),
            activeLayerId: target.activeLayerId
        };
    }),

    redo: () => set((state) => {
        if (state.historyIndex >= state.history.length - 1) return state;

        const targetIdx = state.historyIndex + 1;
        const target = state.history[targetIdx];

        return {
            historyIndex: targetIdx,
            objects: JSON.parse(JSON.stringify(target.objects)),
            layers: JSON.parse(JSON.stringify(target.layers)),
            shapes3D: JSON.parse(JSON.stringify(target.shapes3D)),
            constraints: JSON.parse(JSON.stringify(target.constraints || [])),
            activeLayerId: target.activeLayerId
        };
    }),

    clearDesign: () => set({
        objects: [],
        shapes3D: [],
        constraints: [],
        history: [],
        historyIndex: -1,
        selectedIds: [],
        selected3DIds: []
    }),

    // Override setObjects to automatically capture history if requested, or manual
    setObjects: (objs) => set({ objects: typeof objs === 'function' ? objs(useStore.getState().objects) : objs }),
    addCADObject: (obj) => set((state) => {
        state.saveHistorySnapshot();
        const physicsDefaults = {
            mass: 1.0,
            restitution: 0.5,
            friction: 0.3,
            isStatic: false
        };
        return { objects: [...state.objects, { ...physicsDefaults, ...obj }] };
    }),

    // Layer System
    layers: [
        { id: 'default', name: 'Layer 0', color: '#3b82f6', visible: true, locked: false },
        { id: 'layer1', name: 'Layer 1', color: '#10b981', visible: true, locked: false },
        { id: 'layer2', name: 'Dimensions', color: '#f59e0b', visible: true, locked: false },
    ],
    activeLayerId: 'default',

    // Material presets
    materials: {
        steel: { density: 7850, restitution: 0.2, friction: 0.4 },
        rubber: { density: 1100, restitution: 0.8, friction: 0.9 },
        wood: { density: 700, restitution: 0.4, friction: 0.5 },
        plastic: { density: 1000, restitution: 0.6, friction: 0.3 }
    },
    applyMaterial: (objectId, materialKey) => set((state) => {
        const mat = state.materials[materialKey];
        if (!mat) return state;
        const updateShapeOrObject = (list) => list.map(o => {
            if (o.id !== objectId) return o;
            // Mass calculation could happen here if we had volume,
            // for now just update properties.
            return { ...o, restitution: mat.restitution, friction: mat.friction };
        });
        return {
            objects: updateShapeOrObject(state.objects),
            shapes3D: updateShapeOrObject(state.shapes3D)
        };
    }),

    setLayers: (layers) => set({ layers: typeof layers === 'function' ? layers(useStore.getState().layers) : layers }),
    addLayer: (layer) => set((state) => ({ layers: [...state.layers, layer] })),
    setActiveLayerId: (id) => set({ activeLayerId: id }),

    // Delete selected objects
    deleteObjects: () => set((state) => {
        const { selectedIds, objects, selected3DIds, shapes3D } = state;
        if (selectedIds.length === 0 && selected3DIds.length === 0) return state;
        state.saveHistorySnapshot();
        return {
            objects: objects.filter(o => !selectedIds.includes(o.id)),
            shapes3D: shapes3D.filter(s => !selected3DIds.includes(s.id)),
            selectedIds: [],
            selected3DIds: []
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
        if (selectedIds.length === 0) return state;
        state.saveHistorySnapshot();
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
        if (selectedIds.length === 0) return state;
        state.saveHistorySnapshot();
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
        if (selectedIds.length === 0) return state;
        state.saveHistorySnapshot();
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
    addConstraint: (constraint) => set((state) => {
        state.saveHistorySnapshot();
        const motorDefaults = {
            motorEnabled: false,
            targetVelocity: 0,
            maxForce: 1000
        };
        return { constraints: [...state.constraints, { id: Math.random().toString(36).substring(2, 9), ...motorDefaults, ...constraint }] };
    }),
    updateConstraint: (id, updates) => set((state) => ({
        constraints: state.constraints.map(c => c.id === id ? { ...c, ...updates } : c)
    })),
    removeConstraint: (id) => set((state) => {
        state.saveHistorySnapshot();
        return { constraints: state.constraints.filter(c => c.id !== id) };
    }),
    // Right Panel state
    rightPanelView: 'properties', // 'ai' or 'properties'
    setRightPanelView: (view) => set({ rightPanelView: view }),

    isRightPanelOpen: true,
    toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),

    isAIPanelOpen: false,
    toggleAIPanel: () => set((state) => ({ isAIPanelOpen: !state.isAIPanelOpen })),

    // File Tree state
    // Selection state
    selectedIds: [],
    setSelectedIds: (ids) => set({ selectedIds: typeof ids === 'function' ? ids(useStore.getState().selectedIds) : ids }),

    selected3DIds: [],
    setSelected3DIds: (ids) => set({ selected3DIds: typeof ids === 'function' ? ids(useStore.getState().selected3DIds) : ids }),

    selectedJointId: null,
    setSelectedJointId: (id) => set({ selectedJointId: id }),

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

    // --- Simulation Settings ---
    simulationMode: 'preview', // 'preview' | 'accurate'
    simulationType: 'rigid', // 'rigid' | 'thermal' | 'fluid'
    simulationPreset: null,
    
    simulationSettings: {
        gravity: { x: 0, y: 9.81, z: 0 },
        timeStep: 0.016,
        solverIterations: 10,
        subSteps: 1,
        airResistance: 0.01,
        frictionCoeff: 0.3,
        ambientTemp: 20
    },
    setSimulationSettings: (settings) => set((state) => ({
        simulationSettings: { ...state.simulationSettings, ...settings }
    })),

    // --- Simulation State ───────────────────────────────────────────────────
    simulationState: {
        time: 0,
        energy: { kinetic: 0, potential: 0, total: 0 },
        thermalAnalytics: { maxTemp: 20, avgTemp: 20, heatRisk: 'LOW' }
    },
    setSimulationState: (stateUpdate) => set(state => ({
        simulationState: { ...state.simulationState, ...stateUpdate }
    })),

    // Used for backend-dependent playback, though we are shifting to client-side
    simulationFrames: [], 
    setSimulationFrames: (frames) => set({ simulationFrames: frames }),
    isPlaying: false,
    setIsPlaying: (playing) => set({ isPlaying: playing }),
    currentFrameIndex: 0,
    setCurrentFrameIndex: (index) => set({ currentFrameIndex: index }),

    // Helper to control playback
    togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
    resetPlayback: () => set({ currentFrameIndex: 0, isPlaying: false, simTime: 0 }),

    // --- Analysis & Visualization (ANSYS Upgrade) ---
    analysisSettings: {
        showVectors: false,
        showHeatmap: false,
        vectorScale: 2.0,
        colorTheme: 'thermal'
    },
    setAnalysisSettings: (settings) => set((state) => ({
        analysisSettings: { ...state.analysisSettings, ...settings }
    })),

    energyHistory: [], // [{ time, kinetic, potential, total }, ...]
    addEnergySnapshot: (snapshot) => set((state) => {
        const nextHistory = [...state.energyHistory, snapshot];
        if (nextHistory.length > 200) nextHistory.shift();
        return { energyHistory: nextHistory };
    }),
    clearEnergyHistory: () => set({ energyHistory: [] }),

    // --- AI Chatbot Context ─────────────────────────────────────────────────
    aiMemory: [], // Track user actions
    addAIMemory: (action) => set(state => {
        const memory = [...state.aiMemory, action];
        if (memory.length > 10) memory.shift();
        return { aiMemory: memory };
    })
}))

export default useStore
