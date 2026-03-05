const ACCENT_COLORS = {
  blue: 'var(--accent-blue)',
  green: 'var(--accent-green)',
  yellow: 'var(--accent-yellow)',
  red: 'var(--accent-red)',
  purple: 'var(--accent-purple)',
  muted: 'var(--text-muted)',
};

export function KPICard({ label, value, sub, accent = 'blue', bar }) {
  const color = ACCENT_COLORS[accent] || accent;
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderTop: `3px solid ${color}`,
      borderRadius: 8,
      padding: '16px 20px',
      minWidth: 160,
      flex: 1,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1 }}>
        {value ?? '—'}
      </div>
      {sub != null && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
          {sub}
        </div>
      )}
      {bar != null && (
        <div style={{ marginTop: 10, height: 4, background: 'var(--border)', borderRadius: 2 }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, Math.max(0, bar * 100))}%`,
            background: color,
            borderRadius: 2,
            transition: 'width 0.3s',
          }} />
        </div>
      )}
    </div>
  );
}

export function KPIRow({ children }) {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
      {children}
    </div>
  );
}
