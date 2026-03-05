import { NavLink } from 'react-router-dom';
import { useData } from '../context/DataContext';

const NAV_ITEMS = [
  { path: '/summary',        icon: '📋', label: 'Summary Export' },
  { path: '/membership',     icon: '🎓', label: 'Membership' },
  { path: '/member-vs-non',  icon: '⚖️',  label: 'Member vs Non' },
  { path: '/member-list',    icon: '👥', label: 'Member List' },
  { path: '/reg-list',       icon: '📝', label: 'Registrations' },
  { path: '/class-analysis', icon: '🔍', label: 'Class Analysis' },
  { path: '/catalog-cleaner',icon: '✂️',  label: 'Catalog Cleaner' },
];

export function Sidebar() {
  const { data, fileName, clearData, loadFile, loading } = useData();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) loadFile(file);
    e.target.value = '';
  };

  return (
    <div style={{
      width: 220,
      minWidth: 220,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="serif" style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          OLLI at FAU
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
          Analytics Dashboard
        </div>
      </div>

      {/* Data status */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-primary)',
      }}>
        {data ? (
          <div>
            <div style={{ fontSize: 11, color: 'var(--accent-green)', marginBottom: 4 }}>
              ● Data loaded
            </div>
            <div style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: 8,
            }} title={fileName}>
              {fileName}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <label style={{
                fontSize: 11,
                color: 'var(--accent-blue)',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}>
                Replace
                <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />
              </label>
              <span style={{ color: 'var(--border)' }}>|</span>
              <button onClick={clearData} style={{
                background: 'none',
                border: 'none',
                fontSize: 11,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 0,
                fontFamily: 'inherit',
              }}>
                Clear
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
              {loading ? '⏳ Loading…' : '○ No data loaded'}
            </div>
            <label style={{
              fontSize: 11,
              color: 'var(--accent-blue)',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}>
              Load Excel file
              <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />
            </label>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 16px',
              color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)',
              background: isActive ? 'rgba(74,158,255,0.1)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
              textDecoration: 'none',
              fontSize: 13,
              transition: 'all 0.1s',
            })}
            onMouseEnter={e => {
              if (!e.currentTarget.style.borderLeftColor.includes('74')) {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }
            }}
            onMouseLeave={e => {
              // NavLink handles active state via style prop
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        fontSize: 10,
        color: 'var(--text-muted)',
      }}>
        All data stays in your browser
      </div>
    </div>
  );
}
