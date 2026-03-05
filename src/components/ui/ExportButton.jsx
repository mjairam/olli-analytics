export function ExportButton({ onClick, label = 'Export CSV', disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'transparent',
        border: '1px solid var(--accent-green)',
        color: disabled ? 'var(--text-muted)' : 'var(--accent-green)',
        borderColor: disabled ? 'var(--border)' : 'var(--accent-green)',
        borderRadius: 6,
        padding: '7px 16px',
        fontSize: 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.background = 'rgba(63,185,80,0.1)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      ↓ {label}
    </button>
  );
}
