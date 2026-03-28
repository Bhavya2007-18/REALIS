import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, FileBarChart, Loader2, Zap, Anchor, Weight, Layers, ChevronRight, X } from 'lucide-react'
import useStore from '../store/useStore'
import commandHandler from '../services/commandHandler'
import modelLoader from '../services/modelLoader'

export default function AIChatBot({ toggleAIPanel }) {
    const isAIPanelOpen = useStore((s) => s.isAIPanelOpen)
    const addCADObject = useStore((s) => s.addCADObject)
    const objects = useStore((s) => s.objects)
    const setObjects = useStore((s) => s.setObjects)
    const activeFileId = useStore((s) => s.activeFileId)
    const setConstraints = useStore((s) => s.setConstraints)
    const simulationType = useStore((s) => s.simulationType)
    const aiMemory = useStore((s) => s.aiMemory || [])
    const simulationState = useStore((s) => s.simulationState || {})

    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "👋 Hello! I'm your REALIS AI assistant.\n\nI can help you configure physics properties, create geometry, and add joints — all via natural language. Try one of the quick commands below, or ask me anything!"
        }
    ])
    const [inputValue, setInputValue] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => { scrollToBottom() }, [messages])

    if (!isAIPanelOpen) return null

    const handleSend = async (overrideMsg) => {
        const msg = overrideMsg ?? inputValue
        if (!msg.trim() || isTyping) return

        const userMsg = { role: 'user', content: msg }
        setMessages(prev => [...prev, userMsg])
        setInputValue('')
        setIsTyping(true)

        // ── 1. Check for local Command Handler (Demo Models & Sim Commands) ───────────────
        const localAction = commandHandler.handleCommand(msg)
        if (localAction) {
            // Update memory
            useStore.setState(s => ({ aiMemory: [msg, ...(s.aiMemory || [])].slice(0, 3) }));

            setTimeout(() => {
                let actionColor = 'CREATE_CAD';
                if (localAction.type === 'LOAD_MODEL') {
                    modelLoader.loadModel(localAction.model)
                } else if (localAction.type === 'TRIGGER_SIMULATION') {
                    useStore.setState({ isPlaying: true });
                    actionColor = 'SET_PHYSICS';
                } else if (localAction.type === 'AI_INSIGHT') {
                    actionColor = 'SET_PHYSICS';
                } else if (localAction.type === 'SET_MATERIAL') {
                    actionColor = 'SET_PHYSICS';
                    if (activeFileId) {
                        setObjects(prev => prev.map(o => 
                            o.id === activeFileId ? { ...o, material: localAction.material } : o
                        ));
                    }
                }

                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: localAction.reply,
                    actionType: actionColor
                }])
                setIsTyping(false)
            }, 800) // Small delay for "AI thinking" feel
            return
        }

        try {
            const req = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [...messages, userMsg] })
            })

            if (!req.ok) throw new Error("API Error")
            const res = await req.json()

            // ── Execute AI actions ─────────────────────────────────────────
            if (res.actions && res.actions.length > 0) {
                res.actions.forEach(action => {

                    // Create CAD geometry
                    if (action.type === 'CREATE_CAD') {
                        addCADObject({
                            id: Math.random().toString(36).substring(2, 9),
                            ...action.payload,
                            stroke: '#3b82f6',
                            fill: 'rgba(59, 130, 246, 0.2)',
                            strokeWidth: 2,
                            rotation: 0
                        })
                    }

                    // Set physics property on selected object
                    if (action.type === 'SET_PHYSICS' && activeFileId) {
                        const { field, value } = action.payload
                        setObjects(prev => prev.map(o =>
                            o.id === activeFileId ? { ...o, [field]: value } : o
                        ))
                    }

                    // Add a joint constraint
                    if (action.type === 'ADD_JOINT' && activeFileId) {
                        const { type } = action.payload
                        setConstraints(prev => [...prev, {
                            id: `joint_${Math.random().toString(36).substring(2, 7)}`,
                            type,
                            targetA: activeFileId,
                            targetB: null,
                            distance: 100,
                        }])
                    }
                })
            }

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: res.reply,
                actionType: res.actions?.[0]?.type // for color coding
            }])

        } catch (err) {
            console.error(err)
            setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ Could not connect to the REALIS AI server. Please ensure `python server.py` is running." }])
        } finally {
            setIsTyping(false)
        }
    }

    const quickPrompts = [
        { icon: <Zap size={10} />, label: 'Run Simulation', cmd: 'Run simulation', color: 'text-primary' },
        { icon: <Layers size={10} />, label: 'Thermal Prep', cmd: 'Load Thermal Stress Test', color: 'text-rose-400' },
        { icon: <Anchor size={10} />, label: 'Optimize Design', cmd: 'How do I increase efficiency?', color: 'text-teal-400' },
        { icon: <Weight size={10} />, label: 'Apply Steel', cmd: 'Make it steel', color: 'text-slate-400' },
        { icon: <Weight size={10} />, label: 'Mass = 5', cmd: 'Set mass to 5', color: 'text-amber-400' },
        { icon: <Anchor size={10} />, label: 'Pin to World', cmd: 'Pin it to world', color: 'text-violet-400' },
    ]

    const getActionBadge = (actionType) => {
        if (!actionType) return null
        const map = {
            SET_PHYSICS: { label: 'Physics', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
            ADD_JOINT: { label: 'Joint', cls: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
            CREATE_CAD: { label: 'CAD', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
        }
        const b = map[actionType]
        if (!b) return null
        return (
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border ${b.cls} mt-1`}>
                <Zap size={8} /> {b.label}
            </span>
        )
    }

    return (
        <aside className="w-80 border-l border-slate-800 bg-slate-950/80 backdrop-blur-xl flex flex-col shrink-0">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-gradient-to-r from-primary/10 to-violet-500/5">
                <div className="size-7 bg-gradient-to-br from-primary to-violet-500 rounded-lg flex items-center justify-center shadow-lg shadow-primary/30">
                    <Sparkles size={14} className="text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-sm text-white">REALIS AI</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                            {simulationType ? simulationType.toUpperCase() : 'RIGID'} SIM
                        </span>
                        <span className="text-[9px] text-slate-500">· {objects.length} Objects</span>
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[9px] text-green-400">Online</span>
                    <button onClick={toggleAIPanel} className="text-slate-500 hover:text-slate-300 transition-colors">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Insights & Memory */}
            <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/40 text-[10px] space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">AI Insights</span>
                    <span className="text-secondary font-mono">
                        {simulationType === 'thermal' ? 'Heat Risk: ' + (simulationState?.maxTemp > 500 ? 'High' : 'Normal') : 'Efficiency: 92%'}
                    </span>
                </div>
                {aiMemory.length > 0 && (
                    <div className="space-y-1">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Recent Actions</span>
                        {aiMemory.map((mem, i) => (
                            <div key={i} className="text-slate-400 truncate pr-2 opacity-80" title={mem}>
                                ▹ {mem}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`p-3 rounded-xl max-w-[92%] text-[11px] leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                            ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/20'
                            : 'bg-slate-800/80 border border-slate-700/50 rounded-tl-none text-slate-200'
                            }`}>
                            {msg.content}
                        </div>
                        {msg.role === 'assistant' && getActionBadge(msg.actionType)}
                        <span className="text-[9px] text-slate-600 mx-1">{msg.role === 'user' ? 'You' : 'AI Assistant'}</span>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex flex-col gap-2 items-start">
                        <div className="bg-slate-800/80 border border-slate-700/50 p-3 rounded-xl rounded-tl-none flex items-center gap-2">
                            <div className="flex gap-1 items-center">
                                <span className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="size-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-[10px] text-slate-500">Analyzing...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            <div className="px-4 pt-3 pb-2 border-t border-slate-800/60">
                <p className="text-[9px] text-slate-600 uppercase tracking-wider font-bold mb-2">Quick Commands</p>
                <div className="grid grid-cols-2 gap-1.5">
                    {quickPrompts.map((p, i) => (
                        <button
                            key={i}
                            onClick={() => handleSend(p.cmd)}
                            className={`flex items-center gap-1.5 px-2 py-1.5 text-[9px] font-medium bg-slate-800/60 border border-slate-700/50 rounded-lg hover:border-slate-600 hover:bg-slate-800 transition-all cursor-pointer text-left ${p.color}`}
                        >
                            {p.icon}
                            {p.label}
                            <ChevronRight size={8} className="ml-auto opacity-50" />
                        </button>
                    ))}
                </div>
            </div>

            {/* Input */}
            <div className="p-4 bg-slate-900/50 border-t border-slate-800">
                {activeFileId && (
                    <div className="text-[9px] text-slate-500 mb-2 flex items-center gap-1.5 px-1">
                        <span className="size-1.5 rounded-full bg-primary/60" />
                        Target: <span className="text-primary font-mono">{activeFileId.substring(0, 8)}…</span>
                    </div>
                )}
                <div className="relative">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 py-2.5 pl-3 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none text-slate-200 placeholder-slate-600 transition-colors"
                        placeholder="e.g. set mass to 5..."
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={isTyping || !inputValue.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:scale-110 transition-transform cursor-pointer disabled:opacity-30"
                    >
                        <Send size={15} />
                    </button>
                </div>
            </div>
        </aside>
    )
}
