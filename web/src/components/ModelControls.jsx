import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import useStore from '../store/useStore';

export default function ModelControls() {
    const simulationPreset = useStore(state => state.simulationPreset);
    // Since models are usually dynamic loaded, we'd need a robust way to fetch the schema controls.
    // For this implementation, we will fetch the active preset's model object if we maintain a registry.
    // However, REALIS model loading updates `useStore.setState({ simulationPreset: model.id })`.
    // It's ideal to keep controls in `useStore` when a model is loaded. 
    // Let's assume the store has `activeModelControls` or we just rely on the fact that for prebuilt models we only alter global gravity/mass right now.
    // To implement perfectly per the schema, we need the `modelLoader` to drop `model.controls` into `useStore`. 

    const activeModelControls = useStore(state => state.activeModelControls) || [];
    const updateModelControl = useStore(state => state.updateModelControl);

    if (!activeModelControls || activeModelControls.length === 0) {
        return null;
    }

    return (
        <section className="pt-4 border-t border-white/10 space-y-4">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <SlidersHorizontal size={10} /> Model Parameters
            </label>
            <div className="space-y-3">
                {activeModelControls.map((control) => (
                    <div key={control.id} className="space-y-1">
                        <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                            <span>{control.name}</span>
                            <span className="text-emerald-400">{control.current}</span>
                        </div>
                        <input 
                            type="range" 
                            min={control.min} 
                            max={control.max} 
                            step={control.step}
                            value={control.current}
                            onChange={e => updateModelControl(control.id, parseFloat(e.target.value))}
                            className="w-full h-1 bg-white/10 rounded-full accent-emerald-500 outline-none cursor-pointer"
                        />
                    </div>
                ))}
            </div>
        </section>
    );
}
