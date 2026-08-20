import { create } from 'zustand'
import { temporal } from 'zundo'

// Scene fields tracked by the undo/redo history (Pascal use-scene temporal pattern).
const HISTORY_PARTIALIZE = (s) => ({
    objects: s.objects,
    shapes3D: s.shapes3D,
    constraints: s.constraints || [],
    layers: s.layers,
    activeLayerId: s.activeLayerId
});

const HISTORY_LIMIT = 50;

const useStore = create(temporal((set) => ({
    activeWorkspace: 'design',
    setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),

    activeTool: 'select', 
    setActiveTool: (tool) => set({ activeTool: tool }),

    
    is3DView: false,
    setIs3DView: (val) => set({ is3DView: typeof val === 'boolean' ? val : !useStore.getState().is3DView }),

    
    sidebarView: 'explorer', 
    setSidebarView: (view) => set({ sidebarView: view }),

    isSidebarOpen: true,
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

    
    typedCoordinates: null,
    setTypedCoordinates: (coords) => set({ typedCoordinates: coords }),

    
    objects: [],

    
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
    addShapes3D: (newShapes) => set((state) => {
        state.saveHistorySnapshot();
        const physicsDefaults = { mass: 1.0, restitution: 0.5, friction: 0.3, isStatic: false };
        const formatted = newShapes.map(s => ({ ...physicsDefaults, ...s }));
        return { shapes3D: [...state.shapes3D, ...formatted] };
    }),

    constraints: [],
    setConstraints: (constraints) => set({ constraints }),
    addConstraints: (newConstraints) => set((state) => ({ constraints: [...(state.constraints || []), ...newConstraints] })),

    active3DTool: 'select', 
    setActive3DTool: (tool) => set({ active3DTool: tool }),

    water: {
        enabled: true,
        level: 0,
        depth: 60,
        density: 1000,
        linearDrag: 0.4,
        quadDrag: 0.1,
        ripple: { grid: 40, size: 600, stiffness: 0.015, damping: 0.04 }
    },
    setWater: (cfg) => set(state => ({ water: { ...state.water, ...cfg } })),

    
    extrudeOperation: {
        profileId: null,
        distance: 20,
        direction: 'positive', 
        type: 'new' 
    },
    setExtrudeOperation: (op) => set(state => ({ extrudeOperation: { ...state.extrudeOperation, ...op } })),
    
    
    demoOverlay: null,
    setDemoOverlay: (overlay) => set({ demoOverlay: overlay }),

    
    showGrid: true,
    toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

    
    history: [],
    historyIndex: -1,

    // Backed by zundo's temporal store (attached as useStore.temporal).
    saveHistorySnapshot: () => { /* zundo auto-tracks scene sets; kept for caller compat */ },

    undo: () => useStore.temporal.getState().undo(),

    redo: () => useStore.temporal.getState().redo(),

    // Live-gesture controls: pause tracking during a drag, resume once done,
    // so a full drag collapses into a single undo step (Pascal history-control).
    pauseHistory: () => useStore.temporal.getState().pause(),

    resumeHistory: () => useStore.temporal.getState().resume(),

    // Push a snapshot of the current scene into the undo stack, then pause
    // tracking. Use at the START of a continuous gesture (draw / move / slider);
    // call endHistoryGesture() when the gesture finishes.
    beginHistoryGesture: () => {
        const t = useStore.temporal.getState();
        const snapshot = HISTORY_PARTIALIZE(useStore.getState());
        const last = t.pastStates[t.pastStates.length - 1];
        if (!last || JSON.stringify(last) !== JSON.stringify(snapshot)) {
            useStore.temporal.setState({
                pastStates: [...t.pastStates, snapshot].slice(-HISTORY_LIMIT),
                futureStates: []
            });
        }
        t.pause();
    },

    endHistoryGesture: () => {
        useStore.temporal.getState().resume();
    },

    clearDesign: () => {
        useStore.temporal.getState().clear();
        set({
            objects: [],
            shapes3D: [],
            constraints: [],
            history: [],
            historyIndex: -1,
            selectedIds: [],
            selected3DIds: []
        });
    },

    
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

    
    layers: [
        { id: 'default', name: 'Layer 0', color: '#3b82f6', visible: true, locked: false },
        { id: 'layer1', name: 'Layer 1', color: '#10b981', visible: true, locked: false },
        { id: 'layer2', name: 'Dimensions', color: '#f59e0b', visible: true, locked: false },
    ],
    activeLayerId: 'default',

    
    // Canonical Materials System (Section 3.2)
    materials: {
        steel:    { density: 7850, restitution: 0.20, static_friction: 0.4,  dynamic_friction: 0.3  },
        rubber:   { density: 1100, restitution: 0.85, static_friction: 0.9,  dynamic_friction: 0.8  },
        wood:     { density: 700,  restitution: 0.40, static_friction: 0.5,  dynamic_friction: 0.4  },
        ice:      { density: 917,  restitution: 0.10, static_friction: 0.05, dynamic_friction: 0.02 },
        concrete: { density: 2400, restitution: 0.15, static_friction: 0.7,  dynamic_friction: 0.6  },
        plastic:  { density: 1000, restitution: 0.60, static_friction: 0.3,  dynamic_friction: 0.25 },
        custom:   { density: 1000, restitution: 0.50, static_friction: 0.3,  dynamic_friction: 0.3  }
    },
    applyMaterial: (objectId, materialKey) => set((state) => {
        const mat = state.materials[materialKey];
        if (!mat) return state;
        const updateShapeOrObject = (list) => list.map(o => {
            if (o.id !== objectId) return o;
            return { ...o, material_id: materialKey, restitution: mat.restitution, friction: mat.dynamic_friction ?? mat.friction ?? 0.3 };
        });
        return {
            objects: updateShapeOrObject(state.objects),
            shapes3D: updateShapeOrObject(state.shapes3D)
        };
    }),

    setLayers: (layers) => set({ layers: typeof layers === 'function' ? layers(useStore.getState().layers) : layers }),
    addLayer: (layer) => set((state) => ({ layers: [...state.layers, layer] })),
    setActiveLayerId: (id) => set({ activeLayerId: id }),

    
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

    
    duplicateObjects: () => set((state) => {
        const { selectedIds, objects } = state;
        if (selectedIds.length === 0) return state;
        state.saveHistorySnapshot();
        const clones = objects.filter(o => selectedIds.includes(o.id)).map(obj => {
            const clone = { ...obj, id: Math.random().toString(36).substring(2, 9) };
            const offset = 20; 
            if (clone.type === 'rect') { clone.x += offset; clone.y += offset; }
            else if (clone.type === 'circle' || clone.type === 'polygon' || clone.type === 'arc') { clone.cx += offset; clone.cy += offset; }
            else if (clone.type === 'path' && clone.points) { clone.points = clone.points.map(p => ({ ...p, x: p.x + offset, y: p.y + offset })); }
            else if (clone.type === 'ruler' || clone.type === 'dimension') { clone.x1 += offset; clone.y1 += offset; clone.x2 += offset; clone.y2 += offset; }
            return clone;
        });
        return {
            objects: [...objects, ...clones],
            selectedIds: clones.map(c => c.id) 
        };
    }),

    
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

    
    arrayObjects: (rows, cols, spacingX, spacingY) => set((state) => {
        const { selectedIds, objects } = state;
        if (selectedIds.length === 0) return state;
        state.saveHistorySnapshot();
        const selected = objects.filter(o => selectedIds.includes(o.id));
        const clones = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (r === 0 && c === 0) continue; 
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
    
    rightPanelView: 'properties', 
    setRightPanelView: (view) => set({ rightPanelView: view }),

    isRightPanelOpen: true,
    toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),

    isAIPanelOpen: false,
    toggleAIPanel: () => set((state) => ({ isAIPanelOpen: !state.isAIPanelOpen })),

    isAIImportOpen: false,
    toggleAIImport: () => set((state) => ({ isAIImportOpen: !state.isAIImportOpen })),
    aiImportData: null,
    setAIImportData: (data) => set({ aiImportData: data }),

    // File Tree state
    // Selection state
    selectedIds: [],
    setSelectedIds: (ids) => set({ selectedIds: typeof ids === 'function' ? ids(useStore.getState().selectedIds) : ids }),

    selected3DIds: [],
    setSelected3DIds: (ids) => set({ selected3DIds: typeof ids === 'function' ? ids(useStore.getState().selected3DIds) : ids }),

    selectedJointId: null,
    setSelectedJointId: (id) => set({ selectedJointId: id }),

    activeFileId: null, 
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

    
    simulationMode: 'preview', 
    simulationType: 'rigid', 
    simulationPreset: null,
    setSimulationPreset: (preset) => set({ simulationPreset: preset }),

    // Lab data for Properties panel
    labData: null,
    setLabData: (data) => set({ labData: data }),
    clearLabData: () => set({ labData: null }),

    // Camera state (Section 3.2)
    camera: { position: { x: 0, y: 0, z: 500 }, zoom: 1.0, mode: '2d' },
    setCamera: (cam) => set(state => ({ camera: { ...state.camera, ...cam } })),

    // Build Mode tool state
    activeBuildTool: 'select', // select | create_circle | create_box | create_ramp | wire_joint
    setActiveBuildTool: (tool) => set({ activeBuildTool: tool }),
    jointWireSource: null, // body ID of first selected body for joint wiring
    setJointWireSource: (id) => set({ jointWireSource: id }),

    // Debug Physics Mode
    debugPhysics: {
        enabled: false,
        showBoundingBoxes: false,
        showVelocityVectors: false,
        showCollisionNormals: false,
        showContactPoints: false,
        showForceVectors: false,
        showJointAnchors: false,
        showConstraintLines: false,
        showCenterOfMass: false,
        showSleepingBodies: false
    },
    setDebugPhysics: (updates) => set(state => ({ debugPhysics: { ...state.debugPhysics, ...updates } })),
    toggleDebugPhysics: () => set(state => ({ debugPhysics: { ...state.debugPhysics, enabled: !state.debugPhysics.enabled } })),

    simulationSettings: {
        gravity: { x: 0, y: 9.81, z: 0 },
        timeStep: 0.016,
        solverIterations: 10,
        subSteps: 1,
        airResistance: 0.01,
        frictionCoeff: 0.3,
        groundY: 0,
        ambientTemp: 20,
        timeScale: 1.0
    },
    setSimulationSettings: (settings) => set((state) => ({
        simulationSettings: { ...state.simulationSettings, ...settings }
    })),

    
    activeModelControls: [],
    setActiveModelControls: (controls) => set({ activeModelControls: controls }),
    updateModelControl: (controlId, value) => set((state) => {
        
        const newControls = state.activeModelControls.map(c => 
            c.id === controlId ? { ...c, current: value } : c
        );
        
        
        const { objects, constraints } = state;
        const [targetId, property] = controlId.split('.');

        const newObjects = objects.map(o => o.id === targetId ? { ...o, [property]: value } : o);
        const newConstraints = constraints.map(c => c.id === targetId ? { ...c, [property]: value } : c);

        return { 
            activeModelControls: newControls,
            objects: newObjects,
            constraints: newConstraints
        };
    }),

    
    simulationState: {
        time: 0,
        energy: { kinetic: 0, potential: 0, total: 0 },
        thermalAnalytics: { maxTemp: 20, avgTemp: 20, heatRisk: 'LOW' }
    },
    setSimulationState: (stateUpdate) => set(state => ({
        simulationState: { ...state.simulationState, ...stateUpdate }
    })),

    
    simulationFrames: [], 
    setSimulationFrames: (frames) => set({ simulationFrames: frames }),
    isPlaying: false,
    setIsPlaying: (playing) => {
        if (playing) useStore.temporal.getState().pause();
        else useStore.temporal.getState().resume();
        set({ isPlaying: playing });
    },
    currentFrameIndex: 0,
    setCurrentFrameIndex: (index) => set({ currentFrameIndex: index }),

    
    togglePlayback: () => set((state) => {
        const nextPlaying = !state.isPlaying;
        if (nextPlaying) useStore.temporal.getState().pause();
        else useStore.temporal.getState().resume();
        return { isPlaying: nextPlaying };
    }),
    resetPlayback: () => set({ currentFrameIndex: 0, isPlaying: false, simTime: 0 }),

    
    analysisSettings: {
        showVectors: false,
        showForces: false,
        showHeatmap: false,
        showJoints: false,
        showAnchors: false,
        isExplodedView: false,
        vectorScale: 2.0,
        colorTheme: 'thermal'
    },
    setAnalysisSettings: (settings) => set((state) => ({
        analysisSettings: { ...state.analysisSettings, ...settings }
    })),

    energyHistory: [], 
    addEnergySnapshot: (snapshot) => set((state) => {
        const nextHistory = [...state.energyHistory, snapshot];
        if (nextHistory.length > 200) nextHistory.shift();
        return { energyHistory: nextHistory };
    }),
    clearEnergyHistory: () => set({ energyHistory: [] }),

    
    aiMemory: [], 
    addAIMemory: (action) => set(state => {
        const memory = [...state.aiMemory, action];
        if (memory.length > 10) memory.shift();
        return { aiMemory: memory };
    }),

    
    isSketchImportOpen: false,
    toggleSketchImport: () => set(state => ({ isSketchImportOpen: !state.isSketchImportOpen })),
    setSketchImportOpen: (val) => set({ isSketchImportOpen: val }),
    sketchDraft: null, 
    setSketchDraft: (draft) => set({ sketchDraft: draft }),

    // ── Save/Load Persistence (Section 3.2 JSON round-trip) ──────────────
    exportSceneJSON: () => {
        const s = useStore.getState();
        return JSON.stringify({
            scene: {
                metadata: { version: '1.0', exportedAt: new Date().toISOString() },
                world: { gravity: s.simulationSettings.gravity, timestep: s.simulationSettings.timeStep, substeps: s.simulationSettings.subSteps, units: 'SI' },
                camera: s.camera,
                bodies: [...s.objects, ...s.shapes3D],
                materials: s.materials,
                constraints: s.constraints || [],
                forces: [],
                simulation: { time_scale: s.simulationSettings.timeScale, running: s.isPlaying, elapsed_time: s.simulationState?.time || 0 }
            }
        }, null, 2);
    },
    importSceneJSON: (jsonStr) => {
        try {
            const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
            const scene = data.scene || data;
            const state = useStore.getState();
            state.clearDesign();
            if (scene.world) {
                state.setSimulationSettings({
                    gravity: scene.world.gravity || { x: 0, y: 9.81, z: 0 },
                    timeStep: scene.world.timestep || 0.016,
                    subSteps: scene.world.substeps || 1
                });
            }
            if (scene.camera) state.setCamera(scene.camera);
            if (scene.bodies) {
                scene.bodies.forEach(b => {
                    if (b.position || b.type === 'sphere' || b.params) state.addShape3D(b);
                    else state.addCADObject(b);
                });
            }
            if (scene.constraints) scene.constraints.forEach(c => state.addConstraint(c));
            return true;
        } catch (e) {
            console.error('[importSceneJSON] Error:', e);
            return false;
        }
    }
}), {
    partialize: HISTORY_PARTIALIZE,
    equality: (past, current) => JSON.stringify(past) === JSON.stringify(current),
    limit: HISTORY_LIMIT
}))

export default useStore