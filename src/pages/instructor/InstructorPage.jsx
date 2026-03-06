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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InstructorPage() {
  const { data } = useData();
  const [selected, setSelected] = useState('');

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
        };
      }
      classMap[key].regs++;
      classMap[key].revenue += r.netAmount || 0;
    });
    const classes = Object.values(classMap).sort((a, b) => {
      // Sort by term order then title
      const ti = termOrder.indexOf(a.term);
      const tj = termOrder.indexOf(b.term);
      if (ti !== tj) return ti - tj;
      return a.title.localeCompare(b.title);
    });

    return { totalReg, totalRevenue, numCourses: uniqueClassIds.size, numTerms: uniqueTerms.size, byTerm, classes };
  }, [instructorRecs, data]);

  const handleExport = () => {
    if (!stats) return;
    const cols = [
      { key: 'classId', label: 'Class ID' },
      { key: 'title',   label: 'Course Title' },
      { key: 'term',    label: 'Term' },
      { key: 'campus',  label: 'Campus' },
      { key: 'regs',    label: 'Registrations' },
      { key: 'revenue', label: 'Revenue' },
    ];
    const rows = stats.classes.map(c => ({ ...c, revenue: c.revenue.toFixed(2) }));
    downloadCSV(toCSV(rows, cols), `instructor_${selected.replace(/[^a-z0-9]/gi, '_')}.csv`);
  };

  const classCols = [
    { key: 'classId', label: 'Class ID', headerStyle: { minWidth: 80 } },
    { key: 'title',   label: 'Course Title', headerStyle: { minWidth: 220 } },
    { key: 'term',    label: 'Term' },
    { key: 'campus',  label: 'Campus' },
    { key: 'regs',    label: 'Registrations', align: 'right' },
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
            <select
              value={selected}
              onChange={e => setSelected(e.target.value)}
              style={{
                padding: '9px 14px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: selected ? 'var(--text)' : 'var(--text-muted)',
                fontSize: 15,
                minWidth: 320,
                fontFamily: 'inherit',
              }}
            >
              <option value="">— Choose an instructor —</option>
              {instructors.map(inst => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
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
