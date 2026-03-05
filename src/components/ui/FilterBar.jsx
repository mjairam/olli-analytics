export function FilterBar({ children }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '14px 20px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: 16,
      alignItems: 'flex-end',
      marginBottom: 20,
    }}>
      {children}
    </div>
  );
}

export function Select({ label, value, onChange, options, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      {label && (
        <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          color: 'var(--text-primary)',
          padding: '6px 10px',
          fontSize: 13,
          minWidth: 140,
          cursor: 'pointer',
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function DatePicker({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </label>
      )}
      <input
        type="date"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          color: 'var(--text-primary)',
          padding: '6px 10px',
          fontSize: 13,
          minWidth: 140,
        }}
      />
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', onSearch, style }) {
  return (
    <div style={{ display: 'flex', gap: 8, ...style }}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onSearch ? (e => e.key === 'Enter' && onSearch()) : undefined}
        placeholder={placeholder}
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          color: 'var(--text-primary)',
          padding: '6px 10px',
          fontSize: 13,
          flex: 1,
        }}
      />
      {onSearch && (
        <button onClick={onSearch} style={{
          background: 'var(--accent-blue)',
          border: 'none',
          borderRadius: 6,
          color: '#fff',
          padding: '6px 16px',
          fontSize: 13,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}>
          Search
        </button>
      )}
    </div>
  );
}
