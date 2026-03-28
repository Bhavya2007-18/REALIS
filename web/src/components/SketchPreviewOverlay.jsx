import { useRef, useEffect, useCallback } from 'react';
import { Play, Trash2, Info, AlertTriangle } from 'lucide-react';
import useStore from '../store/useStore';




const WORLD_TO_PX = 10;


const OFFSET_X = 0;
const OFFSET_Y = 0;

function toCanvas(worldCoord) {
  return worldCoord * WORLD_TO_PX;
}


const COLORS = {
  static:           { fill: 'rgba(71,85,105,0.6)',    stroke: '#94a3b8' },
  rigid_body:       { fill: 'rgba(79,70,229,0.35)',   stroke: '#818cf8' },
  circle_dynamic:   { fill: 'rgba(99,102,241,0.45)',  stroke: '#a5b4fc' },
  hinge_joint:      '#818cf8',
  distance_joint:   '#34d399',
  fixed_joint:      '#f59e0b',
  contact:          '#fb7185',
  raw_line:         'rgba(251,207,232,0.15)',
  raw_circle:       'rgba(165,180,252,0.12)',
  raw_polygon:      'rgba(134,239,172,0.10)',
  label_bg:         'rgba(9,13,22,0.85)',
};


function drawGrid(ctx, w, h) {
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth   = 1;
  const step = 40;
  for (let x = 0; x <= w; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
}

function drawLabel(ctx, text, x, y) {
  ctx.font      = '9px Inter, sans-serif';
  const tw      = ctx.measureText(text).width;
  ctx.fillStyle = COLORS.label_bg;
  ctx.fillRect(x - tw / 2 - 3, y - 9, tw + 6, 13);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(text, x - tw / 2, y);
}


export default function SketchPreviewOverlay() {
  const sketchDraft    = useStore(s => s.sketchDraft);
  const setSketchDraft = useStore(s => s.setSketchDraft);
  const setShapes3D    = useStore(s => s.setShapes3D);
  const shapes3D       = useStore(s => s.shapes3D);
  const addConstraint  = useStore(s => s.addConstraint);
  const setObjects     = useStore(s => s.setObjects);
  const objects        = useStore(s => s.objects);

  const canvasRef      = useRef(null);
  const animFrameRef   = useRef(null);
  const dashOffset     = useRef(0);

  
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const draft  = sketchDraft;
    if (!canvas || !draft) return;

    const W = canvas.width;
    const H = canvas.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    drawGrid(ctx, W, H);

    const { nodes = [], edges = [] } = draft.scene?.scene_graph ?? {};
    const raw = draft.raw_geometry ?? {};

    
    
    
    
    
    const scaleRaw = Math.min(W / 800, H / 600);
    const offX = (W - 800 * scaleRaw) / 2;
    const offY = (H - 600 * scaleRaw) / 2;

    function rX(x) { return x * scaleRaw + offX; }
    function rY(y) { return y * scaleRaw + offY; }

    ctx.setLineDash([]);
    for (const l of (raw.lines ?? [])) {
      ctx.strokeStyle = COLORS.raw_line; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(rX(l.x1), rY(l.y1)); ctx.lineTo(rX(l.x2), rY(l.y2)); ctx.stroke();
    }
    for (const c of (raw.circles ?? [])) {
      ctx.strokeStyle = COLORS.raw_circle; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(rX(c.cx), rY(c.cy), c.r * scaleRaw, 0, Math.PI * 2); ctx.stroke();
    }
    for (const p of (raw.polygons ?? [])) {
      if (!p.points?.length) continue;
      ctx.strokeStyle = COLORS.raw_polygon; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rX(p.points[0][0]), rY(p.points[0][1]));
      for (let i = 1; i < p.points.length; i++) ctx.lineTo(rX(p.points[i][0]), rY(p.points[i][1]));
      ctx.closePath(); ctx.stroke();
    }

    
    dashOffset.current -= 0.4;
    for (const e of edges) {
      const nA = nodes.find(n => n.id === e.a);
      const nB = nodes.find(n => n.id === e.b);
      if (!nA || !nB) continue;
      const ax = toCanvas(nA.position[0]) + OFFSET_X;
      const ay = toCanvas(nA.position[1]) + OFFSET_Y;
      const bx = toCanvas(nB.position[0]) + OFFSET_X;
      const by = toCanvas(nB.position[1]) + OFFSET_Y;

      const color = COLORS[e.type] ?? COLORS.distance_joint;
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2.5;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = dashOffset.current;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.setLineDash([]);

      
      const ancX = toCanvas(e.anchor[0]) + OFFSET_X;
      const ancY = toCanvas(e.anchor[1]) + OFFSET_Y;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(ancX, ancY, 4, 0, Math.PI * 2); ctx.fill();

      
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2 - 10;
      drawLabel(ctx, e.type.replace('_', ' '), mx, my);
    }

    
    for (const node of nodes) {
      const px = toCanvas(node.position[0]) + OFFSET_X;
      const py = toCanvas(node.position[1]) + OFFSET_Y;
      const col = node.type === 'static' ? COLORS.static : COLORS.rigid_body;

      ctx.setLineDash([]);

      if (node.shape === 'circle') {
        const r = toCanvas(node.dimensions[0] ?? 0.5);
        
        const grd = ctx.createRadialGradient(px, py, 0, px, py, r + 6);
        grd.addColorStop(0, 'rgba(99,102,241,0.3)');
        grd.addColorStop(1, 'rgba(99,102,241,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(px, py, r + 6, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle   = col.fill;
        ctx.strokeStyle = col.stroke;
        ctx.lineWidth   = 2;
        ctx.beginPath(); ctx.arc(px, py, Math.max(r, 4), 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        
        if (r > 8) drawLabel(ctx, `${node.mass}kg`, px, py + 1);
      } else {
        const w = toCanvas(node.dimensions[0] ?? 1);
        const h = toCanvas(node.dimensions[1] ?? 0.5);
        const hw = Math.max(w / 2, 4);
        const hh = Math.max(h / 2, 4);

        
        ctx.shadowColor = 'rgba(99,102,241,0.4)';
        ctx.shadowBlur  = 10;
        ctx.fillStyle   = col.fill;
        ctx.strokeStyle = col.stroke;
        ctx.lineWidth   = 1.5;

        ctx.beginPath();
        ctx.roundRect(px - hw, py - hh, hw * 2, hh * 2, 4);
        ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;

        drawLabel(ctx, `${node.mass}kg`, px, py + 1);
      }

      
      const badge = node.type === 'static' ? '⚓' : '⬡';
      ctx.font      = '10px Inter';
      ctx.fillStyle = node.type === 'static' ? '#94a3b8' : '#818cf8';
      ctx.fillText(badge, px + (node.shape === 'circle' ? 0 : 0) - 5, py - 10);
    }

    animFrameRef.current = requestAnimationFrame(render);
  }, [sketchDraft]);

  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(() => {
      canvas.width  = parent.clientWidth;
      canvas.height = parent.clientHeight;
    });
    ro.observe(parent);
    canvas.width  = parent.clientWidth;
    canvas.height = parent.clientHeight;
    return () => ro.disconnect();
  }, []);

  
  useEffect(() => {
    if (sketchDraft) {
      animFrameRef.current = requestAnimationFrame(render);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [sketchDraft, render]);

  
  const handleInject = useCallback(() => {
    if (!sketchDraft) return;
    const { nodes = [], edges = [] } = sketchDraft.scene?.scene_graph ?? {};

    let newObjects = [...objects];
    let newShapes  = [...shapes3D];
    const uuidMap  = {};

    nodes.forEach(n => {
      const id      = Math.random().toString(36).substring(2, 9);
      uuidMap[n.id] = id;

      const isStatic = n.type === 'static';
      
      const px = toCanvas(n.position[0]);
      const py = toCanvas(n.position[1]);

      if (n.shape === 'circle') {
        const r = toCanvas(n.dimensions[0] ?? 0.5);
        newObjects.push({
          id, type: 'circle', cx: px, cy: py, r: Math.max(r, 5),
          mass: n.mass, restitution: n.properties?.restitution ?? 0.3,
          friction: n.properties?.friction ?? 0.4, isStatic, groupId: 'ai_sketch',
        });
        newShapes.push({
          id, type: 'sphere', label: `AI_${n.id}`,
          position: { x: px / 100, y: -(py / 100), z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          size: { x: Math.max(r / 50, 0.2), y: Math.max(r / 50, 0.2), z: Math.max(r / 50, 0.2) },
          mass: n.mass, isStatic,
          friction: n.properties?.friction ?? 0.4,
          restitution: n.properties?.restitution ?? 0.3,
        });
      } else {
        const w = toCanvas(n.dimensions[0] ?? 1);
        const h = toCanvas(n.dimensions[1] ?? 0.5);
        newObjects.push({
          id, type: 'rect',
          x: px - w / 2, y: py - h / 2, width: Math.max(w, 5), height: Math.max(h, 5),
          mass: n.mass, restitution: n.properties?.restitution ?? 0.2,
          friction: n.properties?.friction ?? 0.4, isStatic, groupId: 'ai_sketch',
        });
        newShapes.push({
          id, type: 'box', label: `AI_${n.id}`,
          position: { x: px / 100, y: -(py / 100), z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          size: { x: Math.max(w / 100, 0.1), y: Math.max(h / 100, 0.1), z: 0.2 },
          mass: n.mass, isStatic,
          friction: n.properties?.friction ?? 0.4,
          restitution: n.properties?.restitution ?? 0.2,
        });
      }
    });

    edges.forEach(e => {
      const ta = uuidMap[e.a];
      const tb = uuidMap[e.b];
      if (ta && tb) {
        addConstraint({ type: e.type, targetA: ta, targetB: tb });
      }
    });

    setObjects(newObjects);
    setShapes3D(newShapes);
    useStore.getState().addAIMemory('Injected AI sketch into workspace via OpenCV pipeline.');
    setSketchDraft(null);
  }, [sketchDraft, objects, shapes3D, setObjects, setShapes3D, addConstraint, setSketchDraft]);

  const handleDiscard = () => setSketchDraft(null);

  if (!sketchDraft) return null;

  const nNodes    = sketchDraft.scene?.scene_graph?.nodes?.length ?? 0;
  const nEdges    = sketchDraft.scene?.scene_graph?.edges?.length ?? 0;
  const nWarnings = sketchDraft.scene?.validation?.warnings?.length ?? 0;
  const sysType   = sketchDraft.system_type?.replace(/_/g, ' ') ?? 'unknown';

  return (
    <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">

      {}
      <div className="absolute inset-0 bg-indigo-950/[0.08]" />

      {}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {}
      <div className="absolute top-4 left-4 pointer-events-auto slide-up">
        <div className="flex items-center gap-2 bg-[#0b0f1c]/90 border border-indigo-500/30
                        rounded-xl px-3 py-2 backdrop-blur-sm shadow-[0_0_20px_rgba(79,70,229,0.2)]">
          <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Preview Mode</span>
          <span className="text-xs text-gray-500">·</span>
          <span className="text-xs text-white capitalize">{sysType}</span>
        </div>
      </div>

      {}
      {nWarnings > 0 && (
        <div className="absolute top-4 right-4 pointer-events-auto slide-up">
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30
                          rounded-xl px-3 py-2 backdrop-blur-sm">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-amber-300">{nWarnings} physics warning{nWarnings > 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {}
      <div className="absolute bottom-[90px] left-4 pointer-events-none slide-up">
        <div className="flex flex-col gap-1 bg-[#0b0f1c]/80 border border-white/8 rounded-xl p-2.5 backdrop-blur-sm text-[10px]">
          {[
            { color: '#818cf8', label: 'Hinge Joint',    dash: true  },
            { color: '#34d399', label: 'Distance Joint', dash: true  },
            { color: '#f59e0b', label: 'Fixed Joint',    dash: true  },
            { color: '#4f46e5', label: 'Rigid Body',     dash: false },
            { color: '#64748b', label: 'Static Body',    dash: false },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-6 h-px" style={{
                background: l.dash
                  ? `repeating-linear-gradient(to right, ${l.color} 0, ${l.color} 4px, transparent 4px, transparent 7px)`
                  : l.color
              }} />
              <span className="text-gray-500">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto slide-up">
        <div className="flex items-center gap-1.5 bg-[#0b0f1c]/95 border border-indigo-500/25
                        rounded-full px-4 py-2.5 shadow-[0_0_40px_rgba(79,70,229,0.25)]
                        backdrop-blur-md">

          {}
          <div className="flex items-center gap-3 px-3 border-r border-white/8 mr-1">
            <span className="text-xs text-gray-500"><span className="text-white font-bold">{nNodes}</span> nodes</span>
            <span className="text-xs text-gray-500"><span className="text-white font-bold">{nEdges}</span> joints</span>
            <span className="text-xs text-indigo-300 font-semibold capitalize">{sysType}</span>
          </div>

          <button
            onClick={handleDiscard}
            className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-full
                       transition-colors flex items-center gap-1.5 font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" /> Discard
          </button>

          <button
            onClick={handleInject}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.97]
                       text-white text-sm font-semibold rounded-full transition-all
                       flex items-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.6)]"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Inject to Engine
          </button>
        </div>
      </div>
    </div>
  );
}