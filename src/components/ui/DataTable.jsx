export function DataTable({ cols, rows, compact = false, emptyMsg = 'No data', stickyHeader = false, onRowClick }) {
  const cellPad = compact ? '6px 10px' : '10px 14px';
  const fontSize = compact ? 12 : 13;

  if (!rows || rows.length === 0) {
    return (
      <div style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        fontSize: 13,
      }}>
        {emptyMsg}
      </div>
    );
  }

  return (
    <div style={{
      overflowX: 'auto',
      border: '1px solid var(--border)',
      borderRadius: 8,
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize }}>
        <thead style={{ position: stickyHeader ? 'sticky' : undefined, top: stickyHeader ? 0 : undefined, zIndex: stickyHeader ? 1 : undefined }}>
          <tr>
            {cols.map(col => (
              <th key={col.key} style={{
                padding: cellPad,
                textAlign: col.align || 'left',
                background: 'var(--bg-surface)',
                color: 'var(--text-muted)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 500,
                borderBottom: '1px solid var(--border)',
                whiteSpace: 'nowrap',
                ...col.headerStyle,
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            row._separator
              ? (
                <tr key={i}>
                  <td colSpan={cols.length} style={{ padding: 0, height: 1, background: 'var(--border)' }} />
                </tr>
              )
              : (
                <tr
                  key={row._key ?? i}
                  onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                  style={{
                    background: row._highlight
                      ? 'rgba(74,158,255,0.08)'
                      : i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-surface)',
                    cursor: onRowClick ? 'pointer' : undefined,
                    ...row._rowStyle,
                  }}
                  onMouseEnter={onRowClick ? e => { e.currentTarget.style.background = 'rgba(74,158,255,0.12)'; } : undefined}
                  onMouseLeave={onRowClick ? e => {
                    e.currentTarget.style.background = row._highlight
                      ? 'rgba(74,158,255,0.08)'
                      : i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-surface)';
                  } : undefined}
                >
                  {cols.map(col => {
                    const val = row[col.key];
                    return (
                      <td key={col.key} style={{
                        padding: cellPad,
                        textAlign: col.align || 'left',
                        color: col.color ? col.color(val, row) : (row._muted ? 'var(--text-muted)' : 'var(--text-primary)'),
                        borderBottom: '1px solid var(--border)',
                        whiteSpace: col.wrap ? 'normal' : 'nowrap',
                        fontWeight: row._bold ? 600 : undefined,
                        ...col.cellStyle,
                      }}>
                        {col.render ? col.render(val, row) : val}
                      </td>
                    );
                  })}
                </tr>
              )
          ))}
        </tbody>
      </table>
    </div>
  );
}
