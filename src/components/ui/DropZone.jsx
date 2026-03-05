import { useCallback, useState } from 'react';
import { useData } from '../../context/DataContext';

export function DropZone({ compact = false }) {
  const { loadFile, loading, error, fileName } = useData();
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const handleChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) loadFile(file);
  }, [loadFile]);

  if (compact && fileName) return null;

  return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: compact ? 'auto' : '60vh' }}>
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent-blue)' : 'var(--border)'}`,
          borderRadius: 12,
          padding: compact ? '24px 40px' : '64px 80px',
          background: dragging ? 'rgba(74,158,255,0.06)' : 'var(--bg-surface)',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s',
          minWidth: 320,
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
        <p style={{ color: 'var(--text-primary)', fontSize: 15, marginBottom: 8, fontWeight: 500 }}>
          {loading ? 'Loading…' : 'Drop your Excel file here'}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 16 }}>
          RefreshableMembership_and_Registrations.xlsx
        </p>
        <label style={{
          display: 'inline-block',
          padding: '8px 20px',
          background: 'transparent',
          border: '1px solid var(--accent-blue)',
          color: 'var(--accent-blue)',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 13,
        }}>
          Browse file
          <input
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleChange}
          />
        </label>
        {error && (
          <p style={{ color: 'var(--accent-red)', fontSize: 12, marginTop: 12 }}>{error}</p>
        )}
      </div>
    </div>
  );
}
