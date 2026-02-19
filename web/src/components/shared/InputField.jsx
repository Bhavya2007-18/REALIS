export default function InputField({ label, placeholder, disabled, value, onChange }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
            <input
                type="text"
                placeholder={placeholder}
                disabled={disabled}
                value={value !== undefined ? value : undefined}
                onChange={onChange ? (e) => onChange(e.target.value) : undefined}
                className="w-full px-2.5 py-1.5 rounded text-xs outline-none transition-colors duration-150"
                style={{
                    backgroundColor: 'var(--color-bg-base)',
                    border: '1px solid var(--color-border)',
                    color: disabled ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--color-accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
            />
        </div>
    )
}
