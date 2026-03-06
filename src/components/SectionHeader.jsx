import { useNavigate } from 'react-router-dom';

export function SectionHeader({ title, subtitle }) {
  const navigate = useNavigate();

  return (
    <div style={{
      padding: '16px 32px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-surface)',
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 8,
          color: 'var(--text-muted)',
          padding: '6px 14px',
          fontSize: 12,
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'color 0.1s, border-color 0.1s',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = 'var(--text-primary)';
          e.currentTarget.style.borderColor = 'var(--text-muted)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = 'var(--text-muted)';
          e.currentTarget.style.borderColor = 'var(--border)';
        }}
      >
        ← Home
      </button>
      <div>
        <div className="serif" style={{ fontSize: 18, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
    </div>
  );
}
