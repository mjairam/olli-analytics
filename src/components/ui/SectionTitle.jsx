export function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--text-muted)',
      borderBottom: '1px solid var(--border)',
      paddingBottom: 8,
      marginBottom: 14,
      marginTop: 24,
      fontWeight: 500,
    }}>
      {children}
    </div>
  );
}
