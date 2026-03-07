import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, FileBarChart, Loader2 } from 'lucide-react'
import useStore from '../store/useStore'

export default function AIChatBot() {
    const isAIPanelOpen = useStore((s) => s.isAIPanelOpen)
    const addCADObject = useStore((s) => s.addCADObject)

    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hello Alex. I've analyzed the current chassis structural integrity. Would you like to see the stress distribution report for the latest load test?" },
        { role: 'user', content: "Yes, please. Focus on the connection points near the control unit mounting." },
        {
            role: 'assistant',
            content: "Analysis complete. I've highlighted three potential points of failure under extreme thermal conditions.",
            attachment: { name: "Thermal_Stress_Map.pdf", type: "Simulation Data", size: "2.4 MB" }
        }
    ])
    const [inputValue, setInputValue] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    if (!isAIPanelOpen) return null

    const handleSend = async () => {
        if (!inputValue.trim() || isTyping) return

        const userMsg = { role: 'user', content: inputValue }
        setMessages(prev => [...prev, userMsg])
        setInputValue('')
        setIsTyping(true)

        try {
            const req = await fetch('http://localhost:8000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [...messages, userMsg] })
            })

            if (!req.ok) throw new Error("API Error")

            const res = await req.json()

            // Execute any CAD actions from the AI
            if (res.actions && res.actions.length > 0) {
                res.actions.forEach(action => {
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
                })
            }

            setMessages(prev => [...prev, { role: 'assistant', content: res.reply }])

        } catch (err) {
            console.error(err)
            setMessages(prev => [...prev, { role: 'assistant', content: "Connection to REALIS AI offline." }])
        } finally {
            setIsTyping(false)
        }
    }

    return (
        <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-background-light dark:bg-background-dark flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <div className="size-6 bg-primary rounded-md flex items-center justify-center">
                    <Sparkles size={14} className="text-white" />
                </div>
                <h3 className="font-bold text-sm">REALIS - AI</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`p-3 rounded-xl max-w-[90%] ${msg.role === 'user'
                                ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/20'
                                : 'bg-slate-100 dark:bg-slate-800 rounded-tl-none'
                            }`}>
                            <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                            {msg.attachment && (
                                <div className="mt-2 bg-white/5 dark:bg-black/20 rounded-lg p-2 flex items-center gap-3 cursor-pointer hover:bg-primary/20 transition-colors border border-white/10">
                                    <FileBarChart size={16} className={msg.role === 'user' ? 'text-white' : 'text-primary'} />
                                    <div>
                                        <p className="text-[10px] font-bold">{msg.attachment.name}</p>
                                        <p className="text-[8px] text-slate-500 opacity-80">{msg.attachment.size} • {msg.attachment.type}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <span className="text-[9px] text-slate-500 mx-1">{msg.role === 'user' ? 'You' : 'AI Assistant'}</span>
                    </div>
                ))}

                {isTyping && (
                    <div className="flex flex-col gap-2 items-start">
                        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl rounded-tl-none flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin text-primary" />
                            <span className="text-[10px] text-slate-500">Analyzing schema...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex flex-wrap gap-2 mb-3">
                    <button onClick={() => setInputValue("Draw a 100x100 cube")} className="px-2 py-1 text-[9px] bg-slate-200 dark:bg-slate-800 rounded-md hover:text-primary transition-colors cursor-pointer">Draw Cube</button>
                    <button onClick={() => setInputValue("Draw a circle")} className="px-2 py-1 text-[9px] bg-slate-200 dark:bg-slate-800 rounded-md hover:text-primary transition-colors cursor-pointer">Draw Circle</button>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pr-10 py-2.5 pl-3 text-xs focus:ring-1 focus:ring-primary outline-none"
                        placeholder="Ask AI..."
                    />
                    <button
                        onClick={handleSend}
                        disabled={isTyping}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:scale-110 transition-transform cursor-pointer disabled:opacity-50"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </aside>
    )
}
