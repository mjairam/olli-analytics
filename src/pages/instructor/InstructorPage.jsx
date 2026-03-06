import { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { PageShell, SectionTitle, DataTable, ExportButton, KPICard, KPIRow } from '../../components/ui';
import { toCSV, downloadCSV } from '../../lib/parse';

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({ data, color = 'var(--accent-blue)' }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, padding: '0 4px' }}>
        {data.map((d, i) => {
          const pct = d.value / max;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                {d.value.toLocaleString()}
              </div>
              <div style={{
                width: '100%',
                height: Math.max(4, pct * 100) + 'px',
                background: color,
                borderRadius: '3px 3px 0 0',
                opacity: 0.85,
                transition: 'height 0.3s',
                minHeight: 4,
              }} />
            </div>
          );
        })}
      </div>
      {/* X-axis labels */}
      <div style={{ display: 'flex', gap: 6, padding: '0 4px', borderTop: '1px solid var(--border)', marginTop: 0 }}>
        {data.map((d, i) => (
          <div key={i} style={{
            flex: 1,
            fontSize: 9,
            color: 'var(--text-muted)',
            textAlign: 'center',
            paddingTop: 4,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Searchable Instructor Combobox ──────────────────────────────────────────

function InstructorCombobox({ instructors, value, onChange }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return instructors;
    const q = query.toLowerCase();
    return instructors.filter(i => i.toLowerCase().includes(q));
  }, [instructors, query]);

  const handleSelect = (inst) => {
    onChange(inst);
    setQuery(inst);
    setOpen(false);
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    setOpen(true);
    if (!e.target.value) onChange('');
  };

  const handleBlur = () => {
    // Delay so click on option fires first
    setTimeout(() => setOpen(false), 150);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block', minWidth: 360 }}>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        placeholder="Type to search instructors…"
        style={{
          width: '100%',
          padding: '9px 14px',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          color: 'var(--text)',
          fontSize: 14,
          fontFamily: 'inherit',
          boxSizing: 'border-box',
        }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          marginTop: 4,
          maxHeight: 260,
          overflowY: 'auto',
          zIndex: 100,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {filtered.map(inst => (
            <div
              key={inst}
              onMouseDown={() => handleSelect(inst)}
              style={{
                padding: '8px 14px',
                cursor: 'pointer',
                fontSize: 13,
                color: inst === value ? 'var(--accent-blue)' : 'var(--text)',
                background: inst === value ? 'rgba(74,158,255,0.1)' : 'transparent',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = inst === value ? 'rgba(74,158,255,0.1)' : 'transparent'; }}
            >
              {inst}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InstructorPage() {
  const { data } = useData();
  const [selected, setSelected] = useState('');

  const handleSelect = (inst) => setSelected(inst);

  // All unique instructors
  const instructors = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.classRecs.map(r => r.instructor).filter(Boolean));
    return [...set].sort((a, b) => {
      // Sort by last name if in "Last, First" format
      const lastA = a.split(',')[0].trim();
      const lastB = b.split(',')[0].trim();
      return lastA.localeCompare(lastB);
    });
  }, [data]);

  // All registrations for this instructor
  const instructorRecs = useMemo(() => {
    if (!data || !selected) return [];
    return data.classRecs.filter(r => r.instructor === selected);
  }, [data, selected]);

  // Computed stats
  const stats = useMemo(() => {
    if (!instructorRecs.length) return null;

    const totalReg = instructorRecs.length;
    const totalRevenue = instructorRecs.reduce((s, r) => s + (r.netAmount || 0), 0);
    const uniqueClassIds = new Set(instructorRecs.map(r => r.classId).filter(Boolean));
    const uniqueTerms = new Set(instructorRecs.map(r => r.term).filter(Boolean));

    // By term — sorted chronologically (already sorted in data.terms)
    const termOrder = data.terms; // already sorted
    const termMap = {};
    instructorRecs.forEach(r => {
      if (!r.term) return;
      if (!termMap[r.term]) termMap[r.term] = { regs: 0, revenue: 0 };
      termMap[r.term].regs++;
      termMap[r.term].revenue += r.netAmount || 0;
    });
    const byTerm = termOrder
      .filter(t => termMap[t])
      .map(t => ({ term: t, regs: termMap[t].regs, revenue: termMap[t].revenue }));

    // By class section
    const classMap = {};
    instructorRecs.forEach(r => {
      const key = r.classId || `${r.title}|${r.term}`;
      if (!classMap[key]) {
        classMap[key] = {
          classId: r.classId || '—',
          title: r.title || '—',
          term: r.term || '—',
          campus: r.buildingCity || '—',
          regs: 0,
          revenue: 0,
          startDate: r.startDate || '',
          endDate: r.endDate || '',
        };
      }
      classMap[key].regs++;
      classMap[key].revenue += r.netAmount || 0;
      // Track earliest start and latest end across all enrollment rows for this section
      if (r.startDate && (!classMap[key].startDate || r.startDate < classMap[key].startDate))
        classMap[key].startDate = r.startDate;
      if (r.endDate && (!classMap[key].endDate || r.endDate > classMap[key].endDate))
        classMap[key].endDate = r.endDate;
    });
    const classes = Object.values(classMap).sort((a, b) => {
      // Most recent term first, then title
      const ti = termOrder.indexOf(a.term);
      const tj = termOrder.indexOf(b.term);
      if (ti !== tj) return tj - ti;
      return a.title.localeCompare(b.title);
    });

    return { totalReg, totalRevenue, numCourses: uniqueClassIds.size, numTerms: uniqueTerms.size, byTerm, classes };
  }, [instructorRecs, data]);

  const fmtDateRange = (startDate, endDate) => {
    const fmt = (d) => {
      if (!d) return null;
      const [y, m, day] = d.split('-');
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${months[parseInt(m,10)-1]} ${parseInt(day,10)}, 20${y.slice(-2)}`;
    };
    const s = fmt(startDate), e = fmt(endDate);
    if (s && e && s !== e) return `${s} – ${e}`;
    return s || e || '—';
  };

  const handleExport = () => {
    if (!stats) return;
    const exportCols = [
      { key: 'classId',   label: 'Class ID' },
      { key: 'title',     label: 'Course Title' },
      { key: 'term',      label: 'Term' },
      { key: 'campus',    label: 'Campus' },
      { key: 'dateRange', label: 'Date Range' },
      { key: 'regs',      label: 'Registrations' },
      { key: 'revenue',   label: 'Revenue' },
    ];
    const rows = stats.classes.map(c => ({
      ...c,
      dateRange: fmtDateRange(c.startDate, c.endDate),
      revenue: c.revenue.toFixed(2),
    }));
    downloadCSV(toCSV(rows, exportCols), `instructor_${selected.replace(/[^a-z0-9]/gi, '_')}.csv`);
  };

  const classCols = [
    { key: 'classId', label: 'Class ID', headerStyle: { minWidth: 80 } },
    { key: 'title',   label: 'Course Title', headerStyle: { minWidth: 220 } },
    { key: 'term',    label: 'Term' },
    { key: 'campus',  label: 'Campus' },
    {
      key: 'dateRange', label: 'Dates',
      render: (_, row) => fmtDateRange(row.startDate, row.endDate),
    },
    { key: 'regs', label: 'Registrations', align: 'right' },
    {
      key: 'revenue', label: 'Revenue', align: 'right',
      render: (v) => v != null ? '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—',
    },
  ];

  return (
    <PageShell title="Instructor Report">
      {!data ? null : (
        <>
          {/* Instructor selector */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Select Instructor
            </label>
            <InstructorCombobox
              instructors={instructors}
              value={selected}
              onChange={handleSelect}
            />
            {instructors.length === 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent-yellow)' }}>
                ⚠ No instructor names found in the loaded data. Check that your file includes an InstructorName column.
              </div>
            )}
          </div>

          {selected && stats && (
            <>
              {/* KPI row */}
              <KPIRow>
                <KPICard label="Total Registrations" value={stats.totalReg.toLocaleString()} accent="blue" />
                <KPICard
                  label="Total Revenue"
                  value={'$' + stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  accent="green"
                />
                <KPICard label="Course Sections" value={stats.numCourses.toLocaleString()} accent="purple" />
                <KPICard label="Terms Active" value={stats.numTerms.toLocaleString()} accent="yellow" />
              </KPIRow>

              {/* Bar chart */}
              {stats.byTerm.length > 1 && (
                <>
                  <SectionTitle>Registrations by Term</SectionTitle>
                  <div style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '20px 20px 12px',
                    marginBottom: 24,
                  }}>
                    <BarChart
                      data={stats.byTerm.map(d => ({ label: d.term, value: d.regs }))}
                      color="var(--accent-blue)"
                    />
                  </div>
                </>
              )}

              {/* Course detail table */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <SectionTitle style={{ margin: 0 }}>Course Detail</SectionTitle>
                <ExportButton onClick={handleExport} />
              </div>
              <DataTable cols={classCols} rows={stats.classes} emptyMsg="No course data" />
            </>
          )}

          {selected && !stats && (
            <div style={{ color: 'var(--text-muted)', padding: 20 }}>No records found for this instructor.</div>
          )}
        </>
      )}
    </PageShell>
  );
}
