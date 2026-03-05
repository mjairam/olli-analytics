import { DropZone } from './DropZone';
import { useData } from '../../context/DataContext';

export function PageShell({ title, children, noDataNeeded = false }) {
  const { data } = useData();

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <h1 className="serif" style={{
        fontSize: 24,
        fontWeight: 400,
        color: 'var(--text-primary)',
        marginBottom: 24,
        marginTop: 0,
      }}>
        {title}
      </h1>
      {!noDataNeeded && !data ? (
        <DropZone />
      ) : (
        children
      )}
    </div>
  );
}
