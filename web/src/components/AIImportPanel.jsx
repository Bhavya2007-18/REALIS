import React, { useState, useRef } from 'react';
import useStore from '../store/useStore';
import { Upload, X, Play, Image as ImageIcon, Loader2, CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIImportPanel() {
    const isAIImportOpen = useStore((s) => s.isAIImportOpen);
    const toggleAIImport = useStore((s) => s.toggleAIImport);
    const addShape3D = useStore((s) => s.addShape3D);
    const addConstraint = useStore((s) => s.addConstraint);

    const [imagePreview, setImagePreview] = useState(null);
    const [base64Image, setBase64Image] = useState(null);
    const [userPrompt, setUserPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    
    // For Multi-Hypothesis flow
    const [hypotheses, setHypotheses] = useState(null);
    const [selectedHypothesis, setSelectedHypothesis] = useState(null);
    
    // For Validation flow
    const [validationError, setValidationError] = useState('');
    
    const fileInputRef = useRef(null);

    if (!isAIImportOpen) return null;

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                setImagePreview(evt.target.result);
                // Strip the data:image prefix to send pure base64 to backend
                const base64Str = evt.target.result.split(',')[1];
                setBase64Image(base64Str);
                
                // Reset states
                setHypotheses(null);
                setSelectedHypothesis(null);
                setValidationError('');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleBuildSimulation = async (forcedHypothesis = null) => {
        if (!base64Image) return;

        setLoading(true);
        setValidationError('');

        try {
            const res = await fetch('/api/ai_import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: Date.now().toString(),
                    image: base64Image,
                    user_prompt: userPrompt + (forcedHypothesis ? ` [Force: ${forcedHypothesis}]` : '')
                })
            });

            const data = await res.json();
            
            if (data.status === 'requires_confirmation') {
                setHypotheses(data.hypotheses);
                setLoading(false);
                return;
            }

            if (data.status === 'validation_failed') {
                setValidationError(data.message + " - " + data.validation?.warnings?.join(', '));
                setLoading(false);
                return;
            }

            if (data.status === 'success' && data.payload) {
                // Compile Engine Payload into State
                data.payload.bodies.forEach(b => {
                    addShape3D({
                        id: b.id,
                        type: b.geometry.type === "box" ? "cube" : "sphere",
                        x: b.geometry.position.x,
                        y: b.geometry.position.y,
                        z: b.geometry.position.z,
                        width: b.geometry.dimensions.x,
                        height: b.geometry.dimensions.y,
                        depth: b.geometry.dimensions.z,
                        r: b.geometry.dimensions.x, // Mapping x to radius for spheres
                        mass: b.physics.mass,
                        isStatic: b.physics.is_static,
                        restitution: b.physics.restitution,
                        friction: b.physics.friction,
                        color: b.physics.is_static ? '#4B5563' : '#3B82F6' // Gray if static, Blue if dynamic
                    });
                });

                data.payload.constraints.forEach(c => {
                    addConstraint({
                        id: c.id,
                        type: c.type,
                        targetA: c.target_a,
                        targetB: c.target_b,
                        pivotA: c.pivot_a,
                        pivotB: c.pivot_b
                    });
                });

                // Close panel on success
                toggleAIImport();
            }
        } catch (err) {
            console.error('AI Import Error:', err);
            setValidationError('Failed to connect to AI Import pipeline.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="absolute left-16 top-20 z-50 w-[400px] bg-slate-900 border border-slate-700/50 shadow-2xl rounded-2xl overflow-hidden flex flex-col font-display"
        >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900/50">
                <div>
                    <h2 className="text-sm font-semibold text-slate-200">Sketch-to-Simulation AI</h2>
                    <p className="text-xs text-slate-500">REALIS Importer Pipeline</p>
                </div>
                <button onClick={toggleAIImport} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400">
                    <X size={16} />
                </button>
            </div>

            <div className="p-4 flex flex-col gap-5 overflow-y-auto max-h-[70vh]">
                
                {/* Error Banner */}
                <AnimatePresence>
                    {validationError && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-red-900/40 text-red-400 p-3 rounded-xl border border-red-900/50 text-xs flex items-start gap-2">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                            <span>{validationError}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Image Upload Area */}
                <div>
                    <label className="text-xs font-medium text-slate-400 mb-2 block p-1">1. Upload Image / Sketch</label>
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed ${imagePreview ? 'border-slate-700 bg-slate-800/50' : 'border-slate-700 hover:border-blue-500 hover:bg-slate-800 transition-colors'} rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer min-h-[140px] relative overflow-hidden group`}
                    >
                        {imagePreview ? (
                            <>
                                <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-contain opacity-40 group-hover:opacity-20 transition-opacity" />
                                <div className="relative z-10 flex flex-col items-center gap-2">
                                    <CheckCircle2 size={24} className="text-green-500" />
                                    <span className="text-xs font-medium text-white shadow-sm">Image Loaded</span>
                                    <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">Click to replace</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="bg-slate-800 p-3 rounded-full mb-3 text-slate-400 group-hover:text-blue-400 transition-colors">
                                    <Upload size={20} />
                                </div>
                                <span className="text-sm font-medium text-slate-300">Click to upload</span>
                                <span className="text-xs text-slate-500 mt-1 pb-1">PNG, JPG, SVG</span>
                            </>
                        )}
                        <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} />
                    </div>
                </div>

                {/* Text Description */}
                <div>
                    <label className="text-xs font-medium text-slate-400 mb-2 block p-1">2. Describe the System (Optional)</label>
                    <textarea 
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        placeholder="e.g. A pulley lifting a block, or a simple pendulum..."
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none h-24"
                    />
                </div>

                {/* Hypotheses Choice */}
                <AnimatePresence>
                    {hypotheses && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-col gap-2">
                            <label className="text-xs font-medium text-amber-500/90 mb-1 block p-1 flex items-center gap-2">
                                <AlertTriangle size={14} />
                                Ambiguity Detected
                            </label>
                            <p className="text-[11px] text-slate-400 px-1 mb-1">Please confirm the system type:</p>
                            
                            <div className="flex flex-col gap-2">
                                {hypotheses.map(hypo => (
                                    <button 
                                        key={hypo.system_type}
                                        onClick={() => setSelectedHypothesis(hypo.system_type)}
                                        className={`flex items-center justify-between p-3 rounded-xl border ${selectedHypothesis === hypo.system_type ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600'} transition-all`}
                                    >
                                        <div className="flex flex-col items-start gap-1">
                                            <span className="text-sm font-medium text-slate-200 capitalize">{hypo.system_type.replace('_', ' ')}</span>
                                            <span className="text-[10px] text-slate-500">Confidence: {(hypo.confidence * 100).toFixed(0)}%</span>
                                        </div>
                                        <ChevronRight size={16} className={selectedHypothesis === hypo.system_type ? 'text-blue-500' : 'text-slate-600'} />
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/80">
                <button 
                    disabled={!base64Image || loading}
                    onClick={() => handleBuildSimulation(selectedHypothesis)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-900/20"
                >
                    {loading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Processing Layers...</span>
                        </>
                    ) : (
                        <>
                            {hypotheses ? <Play size={16} /> : <ImageIcon size={16} />}
                            <span>{hypotheses ? "Force Compilation" : "Build Simulation"}</span>
                        </>
                    )}
                </button>
            </div>
        </motion.div>
    );
}
