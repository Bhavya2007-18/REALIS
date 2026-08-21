import { create } from 'zustand'
import { temporal } from 'zundo'
import { createDefaultScene } from '../types/scene'
import { sanitizeShape3DTransform, map3DTransformTo2DObject } from '../scene/transform'
import { nextEntityName, cloneEntity, pruneConstraints, newEntityId, reserveEntityIds, withEntityIdentity } from '../scene/entity'
import { buildCanonicalScene } from '../scene/buildCanonicalScene'
import { validateScene } from '../scene/validateScene'
import { serializeScene, deserializeScene } from '../scene/serialization'
import { formatDiagnostic, diagnostic, Severity, Category } from '../scene/diagnostics'
import { geometryFromDraft, geometryFromShape3D } from '../scene/geometry'
import {
    MATERIAL_LIBRARY, MATERIAL_KEYS, massFromDensity,
    bodyPhysicsForMaterial, bodyAppearanceForMaterial
} from '../scene/materials'
import { gravityToLegacyStore } from '../scene/units'

// Scene fields tracked by the undo/redo history.
//
// `objects` + `shapes3D` are the ONE authoritative mutable source for geometry;
// the canonical scene is derived from them on demand via buildCanonicalScene.
// The old partialize also snapshotted `scene.objects` / `scene.materials`, but
// nothing ever wrote to those, so every undo entry carried a duplicate empty
// list — cost without meaning, and a second apparent source of truth. Only
// `scene.metadata` is real state, so only that is tracked.
const HISTORY_PARTIALIZE = (s) => ({
    objects: s.objects,
    shapes3D: s.shapes3D,
    constraints: s.constraints || [],
    layers: s.layers,
    activeLayerId: s.activeLayerId,
    materials: s.materials,
    scene: { metadata: s.scene.metadata }
});

const HISTORY_LIMIT = 50;

// `withEntityIdentity` (id / name / visibility / physics defaults) lives in
// src/scene/entity.js so the non-store creation paths — the drafting canvas, the
// command line, the sketch importer — mint identity the same single way.

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
        return { shapes3D: [...state.shapes3D, withEntityIdentity(shape, state.shapes3D)] };
    }),
    addShapes3D: (newShapes) => set((state) => {
        state.saveHistorySnapshot();
        // Accumulate as we go so deterministic names stay unique within the batch.
        const acc = [...state.shapes3D];
        newShapes.forEach(s => { acc.push(withEntityIdentity(s, acc)); });
        return { shapes3D: acc };
    }),

    // ── Canonical transform actions (Phase 3) ───────────────────────────
    // Single mutation boundary for transforms committed from the 3D gizmo.
    // Callers pass PLAIN numeric data extracted at the rendering boundary —
    // never THREE.js objects — so the store stays free of rendering handles.
    // Values are sanitized (NaN/Infinity/zero-scale guarded) before commit.
    setShape3DTransform: (id, transform) => set((state) => ({
        shapes3D: state.shapes3D.map(s =>
            s.id === id ? { ...s, ...sanitizeShape3DTransform(transform, s) } : s
        )
    })),
    setObject2DTransformFrom3D: (id, transform, mode) => set((state) => ({
        objects: state.objects.map(o =>
            o.id === id ? { ...o, ...map3DTransformTo2DObject(o, transform, mode) } : o
        )
    })),

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
            scene: createDefaultScene(),
            history: [],
            historyIndex: -1,
            selectedIds: [],
            selected3DIds: []
        });
    },


    setObjects: (objs) => set({ objects: typeof objs === 'function' ? objs(useStore.getState().objects) : objs }),
    addCADObject: (obj) => set((state) => {
        state.saveHistorySnapshot();
        return { objects: [...state.objects, withEntityIdentity(obj, state.objects)] };
    }),


    layers: [
        { id: 'default', name: 'Layer 0', color: '#3b82f6', visible: true, locked: false },
        { id: 'layer1', name: 'Layer 1', color: '#10b981', visible: true, locked: false },
        { id: 'layer2', name: 'Dimensions', color: '#f59e0b', visible: true, locked: false },
    ],
    activeLayerId: 'default',


    // ── Materials (§3.2) ────────────────────────────────────────────────
    // Seeded from the ONE canonical library in src/scene/materials.js. The store
    // used to define its own map while PropertiesPanel defined a second, and the
    // two disagreed on restitution and friction for the same named material —
    // "Steel" meant e=0.20 through one path and e=0.30 through the other. Held in
    // state (not imported at each read site) because it is undoable and a custom
    // material the user edits has to live somewhere mutable.
    materials: { ...MATERIAL_LIBRARY },

    /**
     * Assign a material to one body: physics, appearance, and derived mass.
     *
     * Mass comes from m = ρV using the body's canonical geometry, so picking
     * "Steel" on a 0.1 m cube yields 7.85 kg rather than leaving the default
     * 1 kg — density that never reaches mass is a number with no effect (§1.5).
     * When the volume is not derivable (imported mesh, extruded profile,
     * zero-thickness plane) the user's own mass is kept and a WARNING is
     * published rather than a fabricated figure being written (§1.4).
     */
    applyMaterial: (objectId, materialKey) => set((state) => {
        const mat = state.materials[materialKey];
        if (!mat) {
            const d = diagnostic({
                severity: Severity.ERROR,
                category: Category.SCENE,
                code: 'MATERIAL_UNKNOWN',
                message: `No material "${materialKey}" in the library; nothing was applied.`,
                objectId,
                metadata: { actual: materialKey, expected: MATERIAL_KEYS }
            });
            console.error(`[applyMaterial] ${formatDiagnostic(d)}`);
            return { sceneDiagnostics: [...(state.sceneDiagnostics || []), d] };
        }
        state.saveHistorySnapshot();

        const physics = bodyPhysicsForMaterial(materialKey);
        const notes = [];

        const apply = (list, is3D) => list.map(o => {
            if (o.id !== objectId) return o;
            const geometry = is3D
                ? geometryFromShape3D(o)
                : geometryFromDraft(o, state.simulationSettings?.pixelsPerMetre);
            const derived = massFromDensity(geometry, mat.density);
            if (derived == null && !o.isStatic) {
                notes.push(diagnostic({
                    severity: Severity.WARNING,
                    category: Category.SCENE,
                    code: 'MATERIAL_MASS_NOT_DERIVABLE',
                    message: `Applied ${mat.name} to "${o.name || o.id}", but its ${geometry.kind} geometry has no derivable volume — mass was left at ${o.mass ?? 1} kg.`,
                    objectId,
                    metadata: { kind: geometry.kind, density: mat.density }
                }));
            }
            return {
                ...o,
                ...physics,
                ...bodyAppearanceForMaterial(materialKey, is3D),
                // Static bodies have infinite inertia, so a derived mass would be
                // meaningless; leave whatever is there untouched.
                ...(derived != null && !o.isStatic ? { mass: derived } : {})
            };
        });

        const next = {
            objects: apply(state.objects, false),
            shapes3D: apply(state.shapes3D, true)
        };
        for (const n of notes) console.warn(`[applyMaterial] ${formatDiagnostic(n)}`);
        if (notes.length) next.sceneDiagnostics = [...(state.sceneDiagnostics || []), ...notes];
        return next;
    }),

    /**
     * Recompute mass from the assigned material's density. Called after geometry
     * changes: resizing a steel cube has to change its mass, or the material
     * assignment silently stops being true. Bodies with no material_id, or whose
     * volume is not derivable, are left alone.
     */
    recomputeMassFromMaterial: (ids) => set((state) => {
        const targets = new Set(Array.isArray(ids) ? ids : [ids]);
        const apply = (list, is3D) => list.map(o => {
            if (!targets.has(o.id) || !o.material_id || o.isStatic) return o;
            const mat = state.materials[o.material_id];
            if (!mat) return o;
            const geometry = is3D
                ? geometryFromShape3D(o)
                : geometryFromDraft(o, state.simulationSettings?.pixelsPerMetre);
            const derived = massFromDensity(geometry, mat.density);
            return derived == null ? o : { ...o, mass: derived };
        });
        return {
            objects: apply(state.objects, false),
            shapes3D: apply(state.shapes3D, true)
        };
    }),

    /**
     * Create or update a custom material. Physics values are clamped to
     * physically meaningful ranges — a negative density or a restitution above 1
     * makes a solver inject energy, which reads as an engine bug much later and
     * far from the panel where it was typed (§1.4).
     */
    upsertMaterial: (key, props) => set((state) => {
        if (!key) return state;
        const prev = state.materials[key] || MATERIAL_LIBRARY.custom;
        const notes = [];

        // A value OUTSIDE the physical range is clamped to the nearest valid
        // bound; a value with the wrong SIGN is rejected back to the previous
        // one. The difference matters: clamping a restitution of 5 to 1 is a
        // magnitude correction the user will recognise, but clamping a density of
        // -3 to 0.01 kg/m³ would produce an almost massless body — a plausible
        // number standing in for a typo (§1.4). Either way a diagnostic says what
        // happened, so the panel is never silently showing something else.
        const bounded = (field, v, lo, hi) => {
            if (!Number.isFinite(v)) return prev[field];
            if (v < 0 && lo >= 0) {
                notes.push(diagnostic({
                    severity: Severity.WARNING,
                    category: Category.SCENE,
                    code: 'MATERIAL_VALUE_REJECTED',
                    message: `${field} cannot be negative; kept ${prev[field]} for material "${key}".`,
                    metadata: { field, actual: v, kept: prev[field] }
                }));
                return prev[field];
            }
            const c = Math.min(hi, Math.max(lo, v));
            if (c !== v) {
                notes.push(diagnostic({
                    severity: Severity.WARNING,
                    category: Category.SCENE,
                    code: 'MATERIAL_VALUE_CLAMPED',
                    message: `${field} ${v} is outside the physical range [${lo}, ${hi}]; clamped to ${c} for material "${key}".`,
                    metadata: { field, actual: v, clamped: c }
                }));
            }
            return c;
        };

        const next = {
            ...prev,
            ...props,
            name: props.name || prev.name || key,
            density: bounded('density', props.density, 0.01, 25000),
            restitution: bounded('restitution', props.restitution, 0, 1),
            static_friction: bounded('static_friction', props.static_friction, 0, 2),
            dynamic_friction: bounded('dynamic_friction', props.dynamic_friction, 0, 2)
        };
        for (const n of notes) console.warn(`[upsertMaterial] ${formatDiagnostic(n)}`);
        return {
            materials: { ...state.materials, [key]: next },
            ...(notes.length ? { sceneDiagnostics: [...(state.sceneDiagnostics || []), ...notes] } : {})
        };
    }),

    setLayers: (layers) => set({ layers: typeof layers === 'function' ? layers(useStore.getState().layers) : layers }),
    /**
     * Add a layer, guaranteeing its identity here rather than at each call site
     * (the layer panel and the command line each minted their own random id).
     * A layer with a duplicate id would silently capture the other's objects.
     */
    addLayer: (layer) => set((state) => {
        const LAYER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
        const taken = new Set(state.layers.map(l => l.id));
        let id = layer?.id;
        if (!id || taken.has(id)) id = newEntityId('layer_');
        return {
            layers: [...state.layers, {
                name: `Layer ${state.layers.length}`,
                color: LAYER_COLORS[state.layers.length % LAYER_COLORS.length],
                visible: true,
                locked: false,
                ...layer,
                id
            }]
        };
    }),
    /**
     * Remove a layer. Objects on it are re-homed onto the active layer rather
     * than deleted — a layer is a view grouping, not an owner, so dropping it
     * must not destroy geometry. Refuses to remove the last remaining layer.
     */
    removeLayer: (id) => set((state) => {
        if (state.layers.length <= 1) return state;
        const remaining = state.layers.filter(l => l.id !== id);
        const fallback = (state.activeLayerId !== id ? state.activeLayerId : remaining[0].id);
        const rehome = (list) => list.map(o => (o.layerId === id ? { ...o, layerId: fallback } : o));
        return {
            layers: remaining,
            activeLayerId: fallback,
            objects: rehome(state.objects),
            shapes3D: rehome(state.shapes3D)
        };
    }),
    renameLayer: (id, name) => set((state) => ({
        layers: state.layers.map(l => (l.id === id && name ? { ...l, name } : l))
    })),
    setActiveLayerId: (id) => set({ activeLayerId: id }),


    // ── Object lifecycle (Phase 4) ──────────────────────────────────────
    // Single delete path for BOTH 2D drafts and 3D shapes. Also prunes any
    // constraint that referenced a removed entity (no dangling refs) and drops
    // the removed ids from every selection pointer.
    deleteEntities: (ids) => set((state) => {
        if (!ids || ids.length === 0) return state;
        const idSet = new Set(ids);
        state.saveHistorySnapshot();
        return {
            objects: state.objects.filter(o => !idSet.has(o.id)),
            shapes3D: state.shapes3D.filter(s => !idSet.has(s.id)),
            constraints: pruneConstraints(state.constraints, idSet),
            selectedIds: state.selectedIds.filter(id => !idSet.has(id)),
            selected3DIds: state.selected3DIds.filter(id => !idSet.has(id)),
            activeFileId: idSet.has(state.activeFileId) ? null : state.activeFileId
        };
    }),

    // Selection-driven delete (Delete key / toolbar). Delegates to the single
    // deleteEntities path above so the removal logic lives in exactly one place.
    deleteObjects: () => {
        const s = useStore.getState();
        s.deleteEntities([...s.selectedIds, ...s.selected3DIds]);
    },

    // Duplicate the current selection — 2D drafts AND 3D shapes — each getting a
    // fresh stable id, a fresh deterministic name, and a small offset. Selection
    // moves to the new copies.
    duplicateObjects: () => set((state) => {
        const { selectedIds, selected3DIds, objects, shapes3D } = state;
        if (selectedIds.length === 0 && selected3DIds.length === 0) return state;
        state.saveHistorySnapshot();
        const objAcc = [...objects];
        const objClones = objects.filter(o => selectedIds.includes(o.id)).map(o => {
            const c = cloneEntity(o, objAcc);
            objAcc.push(c);
            return c;
        });
        const shapeAcc = [...shapes3D];
        const shapeClones = shapes3D.filter(s => selected3DIds.includes(s.id)).map(s => {
            const c = cloneEntity(s, shapeAcc);
            shapeAcc.push(c);
            return c;
        });
        return {
            objects: [...objects, ...objClones],
            shapes3D: [...shapes3D, ...shapeClones],
            selectedIds: objClones.map(c => c.id),
            selected3DIds: shapeClones.map(c => c.id)
        };
    }),

    // ── Clipboard (Phase 4) ─────────────────────────────────────────────
    // Editor-only state: plain scene-data copies of entities, decoupled from the
    // live objects so later edits never mutate the clipboard. Deliberately NOT
    // part of the undo history.
    clipboard: [],
    copySelection: () => set((state) => {
        const { selectedIds, selected3DIds, objects, shapes3D } = state;
        const picked = [
            ...objects.filter(o => selectedIds.includes(o.id)),
            ...shapes3D.filter(s => selected3DIds.includes(s.id))
        ];
        if (picked.length === 0) return state;
        return { clipboard: picked.map(e => JSON.parse(JSON.stringify(e))) };
    }),
    pasteClipboard: () => set((state) => {
        const { clipboard } = state;
        if (!clipboard || clipboard.length === 0) return state;
        state.saveHistorySnapshot();
        const objAcc = [...state.objects];
        const shapeAcc = [...state.shapes3D];
        const newObjs = [];
        const newShapes = [];
        clipboard.forEach(e => {
            if (Array.isArray(e.position)) {
                const c = cloneEntity(e, shapeAcc);
                shapeAcc.push(c);
                newShapes.push(c);
            } else {
                const c = cloneEntity(e, objAcc);
                objAcc.push(c);
                newObjs.push(c);
            }
        });
        return {
            objects: [...state.objects, ...newObjs],
            shapes3D: [...state.shapes3D, ...newShapes],
            selectedIds: newObjs.map(c => c.id),
            selected3DIds: newShapes.map(c => c.id)
        };
    }),

    // ── Selection helpers (Phase 4) ─────────────────────────────────────
    selectAll: () => set((state) => ({
        selectedIds: state.objects.map(o => o.id),
        selected3DIds: state.shapes3D.map(s => s.id),
        activeFileId: state.shapes3D[state.shapes3D.length - 1]?.id
            ?? state.objects[state.objects.length - 1]?.id
            ?? null
    })),
    deselectAll: () => set({ selectedIds: [], selected3DIds: [], activeFileId: null }),

    /**
     * The ONE selection path. Every surface calls this — the hierarchy, the 2D
     * canvas, the 3D viewport — so an entity selected in one place is selected
     * everywhere: properties panel, transform gizmo, delete, duplicate, copy.
     *
     * There are two entity arrays but selection is one concept (§1.3), so the
     * routing between `selectedIds` and `selected3DIds` happens here, once, by
     * looking the id up. Call sites used to each decide, and each maintained
     * `activeFileId` differently: the hierarchy highlighted 2D drafts by
     * `activeFileId` while the viewport tracked them in `selectedIds`, so a
     * shift-multi-select in the viewport highlighted only one row in the tree.
     *
     * `activeFileId` is the PRIMARY selection — the entity whose properties are
     * shown — and it is maintained here rather than by each caller.
     *
     * @param {string|string[]} ids
     * @param {{additive?:boolean, toggle?:boolean}} [opts]
     */
    selectEntities: (ids, opts = {}) => set((state) => {
        const { additive = false, toggle = false } = opts;
        const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
        const shapeIds = new Set(state.shapes3D.map(s => s.id));
        const draftIds = new Set(state.objects.map(o => o.id));

        // Ignore ids that name nothing. A selection pointer at a deleted body is
        // a dangling reference, and it makes the properties panel blank with no
        // explanation of why (§1.4).
        const known = list.filter(id => shapeIds.has(id) || draftIds.has(id));
        if (known.length === 0) return { selectedIds: [], selected3DIds: [], activeFileId: null };

        // Re-clicking the only selected entity clears the selection — the
        // behaviour both the hierarchy and the viewport already had.
        const wasSelected = (id) => state.selectedIds.includes(id) || state.selected3DIds.includes(id);
        if (toggle && !additive && known.length === 1 && wasSelected(known[0])) {
            return { selectedIds: [], selected3DIds: [], activeFileId: null };
        }

        const next2D = additive ? state.selectedIds.filter(id => draftIds.has(id)) : [];
        const next3D = additive ? state.selected3DIds.filter(id => shapeIds.has(id)) : [];
        let primary = state.activeFileId;
        for (const id of known) {
            const target = shapeIds.has(id) ? next3D : next2D;
            const at = target.indexOf(id);
            if (at >= 0) {
                if (toggle) { target.splice(at, 1); continue; }
            } else {
                target.push(id);
            }
            primary = id;
        }

        const primaryStillSelected = next2D.includes(primary) || next3D.includes(primary);
        return {
            selectedIds: next2D,
            selected3DIds: next3D,
            // Fall back to whatever is still selected so a multi-select never
            // leaves the properties panel showing nothing.
            activeFileId: primaryStillSelected
                ? primary
                : (next3D[next3D.length - 1] ?? next2D[next2D.length - 1] ?? null)
        };
    }),

    // ── Per-object visibility & rename (Phase 4) ────────────────────────
    // Visibility lives on the entity (scene data → undoable, and the rendering
    // layer derives what to draw from it). Default is visible; toggling flips.
    toggleVisibility: (id) => set((state) => ({
        objects: state.objects.map(o => o.id === id ? { ...o, visible: o.visible === false } : o),
        shapes3D: state.shapes3D.map(s => s.id === id ? { ...s, visible: s.visible === false } : s)
    })),
    renameEntity: (id, name) => set((state) => ({
        objects: state.objects.map(o => o.id === id ? { ...o, name } : o),
        shapes3D: state.shapes3D.map(s => s.id === id ? { ...s, name } : s)
    })),


    mirrorObjects: (axis) => set((state) => {
        const { selectedIds, objects } = state;
        if (selectedIds.length === 0) return state;
        state.saveHistorySnapshot();
        // Accumulate so each mirrored copy gets its own id AND its own
        // deterministic name; `{...obj, id}` alone produced N bodies all called
        // "Rect 3", indistinguishable in the hierarchy and in diagnostics.
        const acc = [...objects];
        const clones = objects.filter(o => selectedIds.includes(o.id)).map(obj => {
            const clone = { ...obj, id: newEntityId(obj.type ? `${obj.type}_` : ''), name: nextEntityName(acc, obj.type) };
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
            acc.push(clone);
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
        const acc = [...objects];
        const clones = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (r === 0 && c === 0) continue;
                selected.forEach(obj => {
                    const clone = { ...obj, id: newEntityId(obj.type ? `${obj.type}_` : ''), name: nextEntityName(acc, obj.type) };
                    const dx = c * spacingX, dy = r * spacingY;
                    if (clone.type === 'rect') { clone.x += dx; clone.y += dy; }
                    else if (clone.type === 'circle') { clone.cx += dx; clone.cy += dy; }
                    else if (clone.type === 'path' && clone.points) { clone.points = clone.points.map(p => ({ ...p, x: p.x + dx, y: p.y + dy })); }
                    acc.push(clone);
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
        // newEntityId is a monotonic counter, so ids are reproducible for a given
        // sequence of operations (§1.9); the old Math.random ids were not.
        const id = constraint?.id || newEntityId('con_');
        return { constraints: [...state.constraints, { ...motorDefaults, ...constraint, id }] };
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

        const groupId = newEntityId('grp_');
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
    scene: createDefaultScene(),
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
        // Pause undo tracking DURING playback so per-frame physics mutations don't flood the
        // 50-entry history ring; resume when stopped so design edits stay undoable.
        if (playing) useStore.temporal.getState().pause();
        else useStore.temporal.getState().resume();
        set({ isPlaying: playing });
    },
    currentFrameIndex: 0,
    setCurrentFrameIndex: (index) => set({ currentFrameIndex: index }),


    togglePlayback: () => set((state) => {
        const nextPlaying = !state.isPlaying;
        // See setIsPlaying: pause undo tracking during playback, resume when stopped.
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
    //
    // Both of these used to be broken in ways that silently destroyed user work:
    //   • export read `s.scene.objects`, which nothing ever wrote, so every save
    //     emitted `objects: []`;
    //   • export wrote `scene.simulation` but import read `scene.world`, so
    //     gravity and timestep were dropped on every round trip;
    //   • import routed everything through addCADObject, so 3D shapes came back
    //     as 2D drafts;
    //   • import called clearDesign() *before* parsing, so a malformed file
    //     wiped the scene and left nothing to restore.
    //
    // They now delegate to the canonical scene modules, which are covered by
    // src/scene/__tests__/scene.test.js (Scene → JSON → Scene round trip).
    exportSceneJSON: () => serializeScene(useStore.getState(), { now: new Date().toISOString() }),

    /**
     * Import a scene JSON string.
     *
     * Validates before applying and applies atomically: an unreadable or invalid
     * file leaves the current scene completely untouched (§1.4 no silent
     * failures — the diagnostics say exactly which entity failed and why).
     *
     * @param {string|object} jsonStr
     * @returns {{ok:boolean, diagnostics:Array}}
     */
    importSceneJSON: (jsonStr) => {
        const result = deserializeScene(jsonStr);
        if (!result.ok) {
            for (const d of result.diagnostics) {
                console.error(`[importSceneJSON] ${formatDiagnostic(d)}`);
            }
            useStore.setState({ sceneDiagnostics: result.diagnostics });
            return { ok: false, diagnostics: result.diagnostics };
        }

        const state = useStore.getState();
        const { applied, scene } = result;

        // Reserve every imported id before anything new can be created, so a body
        // added after an import can never be handed an id the import already used.
        reserveEntityIds([
            ...applied.objects.map((o) => o.id),
            ...applied.shapes3D.map((s) => s.id),
            ...applied.constraints.map((c) => c.id)
        ]);

        // Clear only once the payload is known good, and only the history — the
        // arrays below are replaced wholesale in the same set() so there is no
        // window where the editor shows a half-imported scene.
        useStore.temporal.getState().clear();
        useStore.setState({
            objects: applied.objects,
            shapes3D: applied.shapes3D,
            constraints: applied.constraints,
            layers: applied.layers.length ? applied.layers : state.layers,
            activeLayerId: applied.activeLayerId ?? state.activeLayerId,
            scene: { ...state.scene, metadata: scene.metadata },
            selectedIds: [],
            selected3DIds: [],
            activeFileId: null,
            history: [],
            historyIndex: -1,
            sceneDiagnostics: result.diagnostics
        });

        if (scene.environment?.gravity || scene.simulationSettings) {
            const sim = scene.simulationSettings || {};
            state.setSimulationSettings({
                // Canonical gravity is up-positive; the live store is down-positive.
                ...(scene.environment?.gravity
                    ? { gravity: gravityToLegacyStore(scene.environment.gravity) }
                    : {}),
                ...(Number.isFinite(sim.dt) ? { timeStep: sim.dt } : {}),
                ...(Number.isFinite(sim.subSteps) ? { subSteps: sim.subSteps } : {}),
                ...(Number.isFinite(sim.constraintIterations) ? { solverIterations: sim.constraintIterations } : {})
            });
        }

        return { ok: true, diagnostics: result.diagnostics };
    },

    // ── Scene validation (master spec §4.6) ──────────────────────────────
    // Diagnostics from the last import or explicit validation run. UI surfaces
    // read this; nothing else writes it.
    sceneDiagnostics: [],
    clearSceneDiagnostics: () => set({ sceneDiagnostics: [] }),

    /**
     * Validate the current scene and publish the diagnostics.
     * @returns {{valid:boolean, errors:Array, warnings:Array, diagnostics:Array}}
     */
    validateCurrentScene: () => {
        const result = validateScene(buildCanonicalScene(useStore.getState()));
        useStore.setState({ sceneDiagnostics: result.diagnostics });
        return result;
    },

    /** The canonical scene projected from current state (derived, not stored). */
    getCanonicalScene: (opts) => buildCanonicalScene(useStore.getState(), opts)
}), {
    partialize: HISTORY_PARTIALIZE,
    equality: (past, current) => JSON.stringify(past) === JSON.stringify(current),
    limit: HISTORY_LIMIT
}))

export default useStore