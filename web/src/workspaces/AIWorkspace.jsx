export default function AIWorkspace() {
    return (
        <main className="flex-1 relative overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--color-bg-base)' }}>

            <div className="flex items-center px-4 h-8 shrink-0 border-b"
                style={{ backgroundColor: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}>
                <span className="text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: 'var(--color-text-muted)' }}>
                    AI Assistant
                </span>
                <span className="ml-auto text-[10px]"
                    style={{ color: 'var(--color-border-strong)' }}>
                    Local Model
                </span>
            </div>

            <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto px-4 py-4 flex items-end">
                    <div className="w-full flex flex-col gap-3">
                        <ChatBubble role="system" text="Ready. Describe a physics scenario or ask a question." />
                    </div>
                </div>

                <div className="shrink-0 px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Describe a scenario…"
                            className="flex-1 px-3 py-2 rounded text-xs outline-none transition-colors duration-150"
                            style={{
                                backgroundColor: 'var(--color-bg-panel)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-primary)',
                            }}
                            onFocus={(e) => (e.target.style.borderColor = 'var(--color-accent)')}
                            onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
                        />
                        <button
                            className="px-4 py-2 rounded text-[10px] font-semibold transition-colors duration-150 cursor-pointer"
                            style={{
                                backgroundColor: 'var(--color-accent)',
                                color: '#fff',
                                border: '1px solid var(--color-accent)',
                            }}>
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </main>
    )
}

function ChatBubble({ role, text }) {
    return (
        <div className="flex gap-2">
            <span className="text-[10px] font-semibold uppercase shrink-0 pt-0.5 w-12"
                style={{ color: role === 'system' ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                {role}
            </span>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                {text}
            </p>
        </div>
    )
}
