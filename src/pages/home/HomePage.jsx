import { useNavigate } from 'react-router-dom';

const SECTIONS = [
  {
    path: '/summary',
    icon: '📊',
    title: 'Membership & Analytics',
    description: 'Upload your registrations export to explore membership trends, class analysis, member lists, and generate summary reports.',
    color: 'var(--accent-blue)',
    colorBg: 'rgba(74,158,255,0.08)',
    colorBorder: 'rgba(74,158,255,0.25)',
    tags: ['Summary', 'Membership', 'Class Analysis', 'Member List'],
  },
  {
    path: '/catalog-cleaner',
    icon: '✂️',
    title: 'Catalog Cleaner',
    description: 'Upload a catalog spreadsheet to strip HTML tags from the WebDescr field and export a clean, print-ready version.',
    color: 'var(--accent-purple)',
    colorBg: 'rgba(188,140,255,0.08)',
    colorBorder: 'rgba(188,140,255,0.25)',
    tags: ['Excel Upload', 'HTML Stripping', 'Export'],
  },
  {
    path: '/mailing-list',
    icon: '✉️',
    title: 'Mailing List Creation',
    description: 'Combine registrations and custom fields to build targeted mailing lists. Route seasonal members to the right address for each campus mailing.',
    color: 'var(--accent-green)',
    colorBg: 'rgba(63,185,80,0.08)',
    colorBorder: 'rgba(63,185,80,0.25)',
    tags: ['Registrations', 'Custom Fields', 'Seasonal Routing', 'Export'],
  },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 24px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <div style={{
          display: 'inline-block',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 999,
          padding: '6px 18px',
          fontSize: 11,
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 24,
        }}>
          OLLI at Florida Atlantic University
        </div>

        <h1 className="serif" style={{
          fontSize: 'clamp(36px, 5vw, 56px)',
          color: 'var(--text-primary)',
          margin: '0 0 16px',
          lineHeight: 1.1,
          fontWeight: 400,
        }}>
          Welcome, Michael!
        </h1>

        <p style={{
          fontSize: 'clamp(14px, 1.8vw, 17px)',
          color: 'var(--text-muted)',
          margin: 0,
          letterSpacing: '0.01em',
        }}>
          Custom Analytics Dashboards &mdash; OLLI at Florida Atlantic
        </p>
      </div>

      {/* Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20,
        width: '100%',
        maxWidth: 960,
      }}>
        {SECTIONS.map((section) => (
          <button
            key={section.path}
            onClick={() => navigate(section.path)}
            style={{
              background: section.colorBg,
              border: `1px solid ${section.colorBorder}`,
              borderRadius: 14,
              padding: '28px 28px 24px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
              fontFamily: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.4)`;
              e.currentTarget.style.borderColor = section.color;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = section.colorBorder;
            }}
          >
            {/* Icon */}
            <div style={{ fontSize: 32, marginBottom: 16, lineHeight: 1 }}>
              {section.icon}
            </div>

            {/* Title + arrow */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h2 className="serif" style={{
                fontSize: 20,
                color: 'var(--text-primary)',
                margin: 0,
                fontWeight: 400,
              }}>
                {section.title}
              </h2>
              <span style={{ color: section.color, fontSize: 20, lineHeight: 1 }}>→</span>
            </div>

            {/* Description */}
            <p style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              margin: '0 0 18px',
              lineHeight: 1.65,
            }}>
              {section.description}
            </p>

            {/* Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {section.tags.map(tag => (
                <span key={tag} style={{
                  fontSize: 10,
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Footer note */}
      <p style={{
        marginTop: 48,
        fontSize: 11,
        color: 'var(--text-muted)',
        opacity: 0.6,
        letterSpacing: '0.03em',
      }}>
        All data is processed locally in your browser &mdash; nothing is uploaded to any server.
      </p>
    </div>
  );
}
