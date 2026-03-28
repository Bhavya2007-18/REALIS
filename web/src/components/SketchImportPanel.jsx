import { useState, useRef, useCallback } from 'react';
import {
  Upload, X, Check, Loader2, Sparkles, Wand2,
  ChevronRight, AlertTriangle, Info, RotateCcw, ImageIcon
} from 'lucide-react';
import useStore from '../store/useStore';


const PHASES = [
  { id: 2, label: 'Edge Detection'   },
  { id: 3, label: 'Object Labelling' },
  { id: 4, label: 'Relationships'    },
  { id: 5, label: 'Hypotheses'       },
  { id: 6, label: 'Intent Fusion'    },
  { id: 7, label: 'Scene Graph'      },
];

function PhaseProgress({ active }) {
  return (
    <div className="flex items-center gap-1 px-1">
      {PHASES.map((p, i) => (
        <div key={p.id} className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
            active ? 'bg-indigo-400 animate-pulse' : 'bg-gray-700'
          }`} />
          {i < PHASES.length - 1 && (
            <div className={`h-px w-3 transition-colors ${active ? 'bg-indigo-800' : 'bg-gray-800'}`} />
          )}
        </div>
      ))}
    </div>
  );
}


function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100);
  const color = pct >= 75 ? '#22c55e' : pct >= 50 ? '#eab308' : '#f97316';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full confidence-fill"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{pct}%</span>
    </div>
  );
}


function HypothesisRow({ hyp, isTop }) {
  const pct = Math.round(hyp.confidence * 100);
  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${isTop ? 'bg-indigo-500/10 border border-indigo-500/20' : ''}`}>
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isTop ? 'bg-indigo-400' : 'bg-gray-600'}`} />
      <span className={`flex-1 text-xs capitalize ${isTop ? 'text-indigo-200 font-medium' : 'text-gray-500'}`}>
        {hyp.system_type.replace(/_/g, ' ')}
      </span>
      <span className={`text-xs font-mono tabular-nums ${isTop ? 'text-indigo-300' : 'text-gray-600'}`}>{pct}%</span>
    </div>
  );
}


export default function SketchImportPanel() {
  const isSketchImportOpen   = useStore(s => s.isSketchImportOpen);
  const setSketchImportOpen  = useStore(s => s.setSketchImportOpen);
  const setSketchDraft       = useStore(s => s.setSketchDraft);
  const sketchDraft          = useStore(s => s.sketchDraft);

  const [preview,    setPreview]    = useState(null);
  const [prompt,     setPrompt]     = useState('');
  const [loading,    setLoading]    = useState(false);
  const [loadPhase,  setLoadPhase]  = useState(0);   
  const [error,      setError]      = useState(null);
  const [dragging,   setDragging]   = useState(false);
  const [showHyps,   setShowHyps]   = useState(false);
  const [showAssume, setShowAssume] = useState(false);

  const fileInputRef = useRef(null);
  const phaseTimer   = useRef(null);

  
  const loadFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
    setSketchDraft(null);
    setError(null);
  }, [setSketchDraft]);

  const handleFileInput  = (e) => loadFile(e.target.files[0]);
  const handleDrop       = (e) => { e.preventDefault(); setDragging(false); loadFile(e.dataTransfer.files[0]); };
  const handleDragOver   = (e) => { e.preventDefault(); setDragging(true);  };
  const handleDragLeave  = ()  => setDragging(false);

  
  const handleProcess = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    setLoadPhase(0);

    
    let step = 0;
    phaseTimer.current = setInterval(() => {
      step = Math.min(step + 1, PHASES.length - 1);
      setLoadPhase(step);
    }, 380);

    try {
      const res = await fetch('/api/sketch/process', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ session_id: '', image: preview, user_prompt: prompt }),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail?.detail || `Server error ${res.status}`);
      }

      const data = await res.json();
      setSketchDraft(data);
      setShowHyps(true);
    } catch (err) {
      setError(err.message);
    } finally {
      clearInterval(phaseTimer.current);
      setLoadPhase(PHASES.length);
      setLoading(false);
    }
  };

  const handleClear = () => {
    setPreview(null);
    setPrompt('');
    setSketchDraft(null);
    setError(null);
    setShowHyps(false);
    setShowAssume(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirm = () => setSketchImportOpen(false);

  if (!isSketchImportOpen) return null;

  
  const draft      = sketchDraft;
  const sg         = draft?.scene?.scene_graph;
  const validation = draft?.scene?.validation;
  const nNodes     = sg?.nodes?.length ?? 0;
  const nEdges     = sg?.edges?.length ?? 0;
  const nWarnings  = validation?.warnings?.length ?? 0;
  const rawGeo     = draft?.raw_geometry;
  const nLines     = rawGeo?.lines?.length ?? 0;
  const nCircles   = rawGeo?.circles?.length ?? 0;
  const nPolys     = rawGeo?.polygons?.length ?? 0;

  
  
  const hypotheses = draft ? [...(draft.scene?.scene_graph?.nodes ?? [])].slice(0, 0) : [];

  return (
    <div
      className="sketch-panel-enter absolute left-1/2 top-1/2 z-50 w-[440px] max-h-[90vh]
                 overflow-hidden flex flex-col
                 bg-[#0b0f1c] border border-white/8 rounded-2xl shadow-2xl
                 shadow-indigo-950/60 text-gray-100"
      style={{ boxShadow: '0 0 60px rgba(79,70,229,0.12), 0 24px 48px rgba(0,0,0,0.6)' }}
    >
      {}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/6 bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-none">Sketch → Simulation</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">Local OpenCV · Zero APIs</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {draft && (
            <button
              onClick={handleClear}
              title="Start over"
              className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-gray-500 hover:text-gray-300"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setSketchImportOpen(false)}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-gray-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-4">

        {}
        {!preview ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative h-36 rounded-xl border-2 border-dashed transition-all cursor-pointer
              flex flex-col items-center justify-center gap-3 select-none
              ${dragging
                ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
                : 'border-white/10 bg-white/[0.02] hover:border-indigo-500/40 hover:bg-indigo-500/5'
              }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors
              ${dragging ? 'bg-indigo-500/20' : 'bg-white/5'}`}>
              {dragging ? <ImageIcon className="w-5 h-5 text-indigo-400" /> : <Upload className="w-5 h-5 text-gray-400" />}
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-gray-300">{dragging ? 'Drop it!' : 'Upload or drag a sketch'}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">PNG, JPG, BMP, WebP</p>
            </div>
          </div>
        ) : (
          
          <div className="relative rounded-xl overflow-hidden border border-white/8 bg-black/40 group">
            {}
            {loading && (
              <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
                <div className="scan-bar absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
              </div>
            )}
            <img
              src={preview}
              alt="Uploaded sketch"
              className={`w-full max-h-48 object-contain transition-all ${loading ? 'opacity-50 blur-[1px]' : 'opacity-90'}`}
            />
            {!loading && (
              <button
                onClick={handleClear}
                className="absolute top-2 right-2 p-1.5 bg-black/70 border border-white/10 rounded-full
                           opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        <input
          type="file" className="hidden" ref={fileInputRef}
          accept="image}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
            Describe the mechanism <span className="text-gray-700 normal-case">(optional — helps heuristics)</span>
          </label>
          <input
            type="text"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && preview && handleProcess()}
            placeholder="e.g. A double pendulum, a car with two wheels…"
            className="w-full bg-white/[0.04] border border-white/8 rounded-lg px-3 py-2 text-sm text-white
                       placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60
                       focus:bg-indigo-500/5 transition-all"
          />
        </div>

        {}
        {loading && (
          <div className="flex flex-col gap-2 bg-white/[0.02] border border-white/6 rounded-xl p-3">
            <div className="flex items-center gap-2 text-xs text-indigo-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="font-medium">Running pipeline…</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PHASES.map((p, i) => (
                <div key={p.id} className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-all
                  ${i <= loadPhase ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/3 text-gray-600 border border-white/5'}`}>
                  {i < loadPhase && <Check className="w-2.5 h-2.5" />}
                  {i === loadPhase && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                  {p.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {}
        {error && (
          <div className="flex gap-2 bg-red-500/8 border border-red-500/20 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-red-300">Pipeline Error</p>
              <p className="text-xs text-red-500 mt-0.5">{error}</p>
              <p className="text-[10px] text-gray-600 mt-1">Make sure the Python server is running on port 8000.</p>
            </div>
          </div>
        )}

        {}
        {draft && !loading && (
          <div className="flex flex-col gap-3 bg-white/[0.025] border border-white/8 rounded-xl p-4">

            {}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider mb-0.5">System Detected</p>
                <p className="text-base font-bold capitalize text-white">
                  {draft.system_type.replace(/_/g, ' ')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500 mb-0.5">Match</p>
                <p className="text-xl font-black tabular-nums text-indigo-300">
                  {Math.round(draft.confidence * 100)}<span className="text-sm">%</span>
                </p>
              </div>
            </div>
            <ConfidenceBar value={draft.confidence} />

            {}
            <div className="grid grid-cols-5 gap-1.5 text-center">
              {[
                { label: 'Lines',    val: nLines   },
                { label: 'Circles',  val: nCircles },
                { label: 'Polygons', val: nPolys   },
                { label: 'Nodes',    val: nNodes   },
                { label: 'Joints',   val: nEdges   },
              ].map(s => (
                <div key={s.label} className="bg-white/[0.03] border border-white/6 rounded-lg py-2">
                  <p className="text-sm font-bold text-white">{s.val}</p>
                  <p className="text-[9px] text-gray-600 leading-none mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {}
            <button
              onClick={() => setShowHyps(v => !v)}
              className="flex items-center justify-between w-full text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <span>Top Hypotheses</span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showHyps ? 'rotate-90' : ''}`} />
            </button>
            {showHyps && (
              <div className="flex flex-col gap-1">
                {(draft.scene?.scene_graph?.nodes?.length === 0) ? (
                  <p className="text-xs text-gray-600 italic">No hypothesis data returned.</p>
                ) : (
                  
                  <>
                    <HypothesisRow hyp={{ system_type: draft.system_type, confidence: draft.confidence }} isTop={true} />
                    <p className="text-[10px] text-gray-700 px-1">Other candidates hidden (low confidence)</p>
                  </>
                )}
              </div>
            )}

            {}
            <button
              onClick={() => setShowAssume(v => !v)}
              className="flex items-center justify-between w-full text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <span>Assumptions & Flags</span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showAssume ? 'rotate-90' : ''}`} />
            </button>
            {showAssume && (
              <div className="flex flex-col gap-1">
                {}
                {validation?.warnings?.map((w, i) => (
                  <div key={i} className="flex gap-1.5 text-xs text-amber-400 bg-amber-400/8 border border-amber-400/20 rounded-lg p-2">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
                {}
                {validation?.auto_fixes?.map((f, i) => (
                  <div key={i} className="flex gap-1.5 text-xs text-green-400 bg-green-400/8 border border-green-400/20 rounded-lg p-2">
                    <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>Auto-fixed: {f}</span>
                  </div>
                ))}
                {nWarnings === 0 && (
                  <div className="flex gap-1.5 text-xs text-gray-500 p-1">
                    <Info className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>No physics violations detected.</span>
                  </div>
                )}
              </div>
            )}

            <p className="text-[10px] text-gray-600 leading-relaxed border-t border-white/5 pt-2 mt-1">
              The scene graph overlay is visible behind this panel in your workspace.
              Confirm to close this panel and use the floating bar to inject into the engine.
            </p>
          </div>
        )}
      </div>

      {}
      <div className="px-5 py-3.5 border-t border-white/6 bg-white/[0.01] flex gap-2">
        {!draft ? (
          <button
            onClick={handleProcess}
            disabled={!preview || loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]
                       disabled:opacity-40 disabled:cursor-not-allowed
                       text-white text-sm font-semibold py-2.5 rounded-xl
                       transition-all flex items-center justify-center gap-2
                       shadow-[0_0_20px_rgba(79,70,229,0.3)]"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Running OpenCV Pipeline…</>
              : <><Wand2 className="w-4 h-4" />Interpret Sketch</>
            }
          </button>
        ) : (
          <>
            <button
              onClick={handleClear}
              className="px-4 py-2.5 border border-white/10 rounded-xl text-sm text-gray-400
                         hover:bg-white/5 hover:text-white transition-all"
            >
              Reset
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 bg-green-600 hover:bg-green-500 active:scale-[0.98]
                         text-white text-sm font-semibold py-2.5 rounded-xl
                         transition-all flex items-center justify-center gap-2
                         shadow-[0_0_20px_rgba(34,197,94,0.25)]"
            >
              <Check className="w-4 h-4" />
              Confirm &amp; Preview in Workspace
            </button>
          </>
        )}
      </div>
    </div>
  );
}