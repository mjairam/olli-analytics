import { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { PageShell, FilterBar, Select, DatePicker, ExportButton, SectionTitle, DataTable } from '../../components/ui';
import { filterClassRecs, sortedTerms, toCSV, downloadCSV, fmtPct } from '../../lib/parse';

// ─── Metric Definitions ───────────────────────────────────────────────────────

const METRICS = [
  { key: 'totalReg',             label: 'Total Registration',                bold: true },
  { key: 'num1day',              label: '# of 1-Day Lectures' },
  { key: 'reg1day',              label: '1-Day Registration' },
  { key: 'totalRegExcSS',        label: 'Total Registration Excluding SS',   bold: true },
  { key: 'pct1dayOfTotalExcSS',  label: '1 Day Reg % of Total (Exc SS)',     pct: true },
  { key: 'numSS',                label: 'Number of Special Speakers' },
  { key: 'regSS',                label: 'Special Speaker Registrations' },
  { key: 'num4wk',               label: '# of 4-Week Courses' },
  { key: 'reg4wk',               label: '4-Week Registrations' },
  { key: 'num6wk',               label: '# of 6-Week Courses' },
  { key: 'reg6wk',               label: '6-Week Registrations' },
  { key: 'num7wk',               label: '# of 7-Week Courses' },
  { key: 'reg7wk',               label: '7-Week Registrations' },
  { key: 'num8wk',               label: '# of 8-Week Courses' },
  { key: 'reg8wk',               label: '8-Week Registrations' },
  { key: 'num9wk',               label: '# of 9-Week Courses' },
  { key: 'reg9wk',               label: '9-Week Registrations' },
  { key: '_sep1',                sep: true },
  { key: 'numStudents',          label: '# of Students' },
  { key: 'avgClasses',           label: 'Avg Classes/Student',               decimal: true },
];

// ─── Compute metrics for a set of filtered class records ─────────────────────

function computeMetrics(recs, ssClassIds) {
  if (!recs || recs.length === 0) return {};

  const totalReg = recs.length;
  const ssSet = ssClassIds || new Set();

  const byWG = (wgKey) => recs.filter(r => r.weekGroup === wgKey);
  const classCount = (wgRecs) => new Set(wgRecs.map(r => r.classId).filter(Boolean)).size;

  const all1dayRecs = byWG('1day');
  const ssRecs = recs.filter(r => ssSet.has(r.classId));
  const reg1dayRecs = all1dayRecs.filter(r => !ssSet.has(r.classId));

  const reg1day = reg1dayRecs.length;
  const regSS = ssRecs.length;
  const numSS = classCount(ssRecs);
  const num1day = classCount(reg1dayRecs);
  const totalRegExcSS = totalReg - regSS;

  const profileIds = recs.map(r => r.profileId).filter(Boolean);
  const numStudents = new Set(profileIds).size;
  const avgClasses = numStudents > 0 ? totalReg / numStudents : 0;

  return {
    totalReg,
    num1day,
    reg1day,
    totalRegExcSS,
    pct1dayOfTotalExcSS: totalRegExcSS > 0 ? reg1day / totalRegExcSS : 0,
    numSS,
    regSS,
    num4wk: classCount(byWG('4wk')), reg4wk: byWG('4wk').length,
    num6wk: classCount(byWG('6wk')), reg6wk: byWG('6wk').length,
    num7wk: classCount(byWG('7wk')), reg7wk: byWG('7wk').length,
    num8wk: classCount(byWG('8wk')), reg8wk: byWG('8wk').length,
    num9wk: classCount(byWG('9wk')), reg9wk: byWG('9wk').length,
    numStudents,
    avgClasses,
  };
}

// ─── Format a metric value ────────────────────────────────────────────────────

function fmtVal(m, val) {
  if (val == null || val === '') return '—';
  if (m.pct) return fmtPct(val);
  if (m.decimal) return Number(val).toFixed(2);
  return Number.isInteger(val) ? val.toLocaleString() : Number(val).toFixed(2);
}

// ─── Special Speaker Selector Panel ──────────────────────────────────────────

const inlineSelectStyle = {
  padding: '5px 8px',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  fontSize: 12,
};

function SpecialSpeakerPanel({ courses, terms, campuses, selectedIds, onToggle, onClear }) {
  const [search, setSearch] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterCampus, setFilterCampus] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return courses.filter(c => {
      if (filterTerm && c.term !== filterTerm) return false;
      if (filterCampus && c.campus !== filterCampus) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !c.title.toLowerCase().includes(q) &&
          !c.term.toLowerCase().includes(q) &&
          !c.campus.toLowerCase().includes(q) &&
          !String(c.classId).toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [courses, search, filterTerm, filterCampus]);

  const selectedCount = selectedIds.size;

  return (
    <div style={{ marginBottom: 16, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'var(--surface-2)',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text)',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <span>
          Special Speaker Courses
          {selectedCount > 0 && (
            <span style={{
              marginLeft: 8,
              background: 'var(--accent-blue)',
              color: '#fff',
              borderRadius: 10,
              padding: '1px 8px',
              fontSize: 11,
              fontWeight: 700,
            }}>
              {selectedCount} selected
            </span>
          )}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{open ? '▲ collapse' : '▼ expand'}</span>
      </button>

      {open && (
        <div style={{ padding: 14, background: 'var(--surface)' }}>
          <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--text-muted)' }}>
            Select which 1-day courses are Special Speaker events. They will be broken out separately and excluded from the 1-Day Registration count.
          </div>

          {/* Filters row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)} style={inlineSelectStyle}>
              <option value="">All Terms</option>
              {terms.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterCampus} onChange={e => setFilterCampus(e.target.value)} style={inlineSelectStyle}>
              <option value="">All Campuses</option>
              {campuses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="text"
              placeholder="Search title or course ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inlineSelectStyle, flex: 1, minWidth: 180 }}
            />
            {selectedCount > 0 && (
              <button
                onClick={onClear}
                style={{
                  padding: '5px 12px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                }}
              >
                Clear all
              </button>
            )}
          </div>

          {courses.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '8px 0' }}>
              No 1-day courses found in loaded data.
            </div>
          ) : (
            <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filtered.map(c => (
                <label
                  key={c.classId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '5px 8px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    background: selectedIds.has(c.classId) ? 'rgba(74,158,255,0.1)' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.classId)}
                    onChange={() => onToggle(c.classId)}
                    style={{ accentColor: 'var(--accent-blue)', width: 14, height: 14, flexShrink: 0 }}
                  />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{c.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--accent-blue)', whiteSpace: 'nowrap', fontWeight: 500 }}>{c.campus}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{c.term}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                    #{c.classId}
                  </span>
                </label>
              ))}
              {filtered.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '8px 0' }}>No matches.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SummaryPage() {
  const { data } = useData();

  const [campus, setCampus] = useState('ALL');
  const [currentTerm, setCurrentTerm] = useState('');
  const [cutoffDate, setCutoffDate] = useState('');
  const [ssClassIds, setSsClassIds] = useState(new Set());

  const campusOptions = useMemo(() => {
    if (!data) return [{ value: 'ALL', label: 'All Campuses' }];
    return [
      { value: 'ALL', label: 'All Campuses' },
      ...data.campuses.map(c => ({ value: c, label: c })),
    ];
  }, [data]);

  const termOptions = useMemo(() => {
    if (!data) return [];
    return data.terms.map(t => ({ value: t, label: t }));
  }, [data]);

  // All unique 1-day courses for the SS selector
  const oneDayCourses = useMemo(() => {
    if (!data) return [];
    const seen = new Set();
    const result = [];
    data.classRecs
      .filter(r => r.weekGroup === '1day' && r.classId)
      .forEach(r => {
        if (!seen.has(r.classId)) {
          seen.add(r.classId);
          result.push({ classId: r.classId, title: r.title || '(no title)', term: r.term || '', campus: r.buildingCity || '' });
        }
      });
    // Sort by term then title
    result.sort((a, b) => a.term.localeCompare(b.term) || a.title.localeCompare(b.title));
    return result;
  }, [data]);

  const handleToggleSS = (classId) => {
    setSsClassIds(prev => {
      const next = new Set(prev);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      return next;
    });
  };

  const handleClearSS = () => setSsClassIds(new Set());

  const allTerms = data?.terms ?? [];

  // Compute metrics per term
  const termMetrics = useMemo(() => {
    if (!data) return {};
    const result = {};
    allTerms.forEach(term => {
      const isCurrent = term === currentTerm;
      const recs = filterClassRecs(data.classRecs, {
        term,
        campus: campus === 'ALL' ? null : campus,
        cutoffDate: isCurrent && cutoffDate ? cutoffDate : null,
      });
      result[term] = computeMetrics(recs, ssClassIds);
    });
    return result;
  }, [data, allTerms, campus, currentTerm, cutoffDate, ssClassIds]);

  // Build table rows
  const tableRows = useMemo(() => {
    return METRICS.map(m => {
      if (m.sep) return { _separator: true, _key: m.key };
      const row = { _key: m.key, metric: m.label, _bold: m.bold };
      allTerms.forEach(term => {
        row[term] = termMetrics[term]?.[m.key];
      });
      return row;
    });
  }, [allTerms, termMetrics]);

  // Build columns
  const cols = useMemo(() => {
    const metricCol = {
      key: 'metric',
      label: 'Metric',
      headerStyle: { minWidth: 260 },
    };
    const termCols = allTerms.map(term => ({
      key: term,
      label: term,
      align: 'right',
      headerStyle: {
        background: term === currentTerm ? 'rgba(74,158,255,0.15)' : undefined,
        color: term === currentTerm ? 'var(--accent-blue)' : undefined,
      },
      cellStyle: {
        background: term === currentTerm ? 'rgba(74,158,255,0.05)' : undefined,
        color: term === currentTerm ? 'var(--accent-blue)' : undefined,
      },
      render: (val, row) => {
        const m = METRICS.find(x => x.label === row.metric);
        if (!m || row._separator) return null;
        return fmtVal(m, val);
      },
    }));
    return [metricCol, ...termCols];
  }, [allTerms, currentTerm]);

  // CSV Export
  const handleExport = () => {
    const csvRows = METRICS.filter(m => !m.sep).map(m => {
      const row = { Metric: m.label };
      allTerms.forEach(term => {
        row[term] = fmtVal(m, termMetrics[term]?.[m.key]);
      });
      return row;
    });
    const csvCols = [{ key: 'Metric', label: 'Metric' }, ...allTerms.map(t => ({ key: t, label: t }))];
    downloadCSV(toCSV(csvRows, csvCols), 'summary_export.csv');
  };

  return (
    <PageShell title="Summary Export">
      {data && (
        <>
          <FilterBar>
            <Select
              label="Campus"
              value={campus}
              onChange={setCampus}
              options={campusOptions}
            />
            <Select
              label="Current Term"
              value={currentTerm}
              onChange={setCurrentTerm}
              options={[{ value: '', label: '— Select —' }, ...termOptions]}
            />
            <DatePicker
              label="Cutoff Date (current term)"
              value={cutoffDate}
              onChange={setCutoffDate}
            />
            <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
              <ExportButton onClick={handleExport} />
            </div>
          </FilterBar>

          <SpecialSpeakerPanel
            courses={oneDayCourses}
            terms={allTerms}
            campuses={data.campuses}
            selectedIds={ssClassIds}
            onToggle={handleToggleSS}
            onClear={handleClearSS}
          />

          {allTerms.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', padding: 20 }}>No class records found in file.</div>
          ) : (
            <>
              <SectionTitle>Registration Summary — All Terms</SectionTitle>
              {currentTerm && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Current term: <span style={{ color: 'var(--accent-blue)' }}>{currentTerm}</span>
                  {cutoffDate && <> · Cutoff: <span style={{ color: 'var(--accent-yellow)' }}>{cutoffDate}</span></>}
                  {ssClassIds.size > 0 && (
                    <> · Special speakers: <span style={{ color: 'var(--accent-blue)' }}>{ssClassIds.size} course{ssClassIds.size !== 1 ? 's' : ''}</span></>
                  )}
                </div>
              )}
              <DataTable
                cols={cols}
                rows={tableRows}
                stickyHeader
                emptyMsg="No data"
              />
            </>
          )}
        </>
      )}
    </PageShell>
  );
}
