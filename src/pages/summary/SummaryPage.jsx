import { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { PageShell, FilterBar, Select, DatePicker, ExportButton, SectionTitle, DataTable } from '../../components/ui';
import {
  filterClassRecs, getFiscalYear, fmtPct,
  getMemberSet,
  consolidateTerm, getFiscalYearSummary, termSortKeySummary, priorYearDate,
} from '../../lib/parse';
import { exportSummaryXLSX } from '../../lib/summaryExport';

// ─── Metric Definitions (web table) ──────────────────────────────────────────

const METRICS = [
  { key: 'totalReg',             label: 'Total Registration',               bold: true },
  { key: 'num1day',              label: '# of 1-Day Lectures' },
  { key: 'reg1day',              label: '1-Day Registration' },
  { key: 'totalRegExcSS',        label: 'Total Registration Excluding SS',  bold: true },
  { key: 'pct1dayOfTotalExcSS',  label: '1 Day Reg % of Total (Exc SS)',    pct: true },
  { key: 'numSS',                label: 'Number of Special Speakers' },
  { key: 'regSS',                label: 'Special Speaker Registrations' },
  { key: 'num4wk',               label: '# of 4-Week Courses' },
  { key: 'reg4wk',               label: '4-Week Registrations' },
  { key: 'num5wk',               label: '# of 5-Week Courses' },
  { key: 'reg5wk',               label: '5-Week Registrations' },
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
  { key: 'avgClasses',           label: 'Avg Classes/Student', decimal: true },
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
    num1day, reg1day,
    totalRegExcSS,
    pct1dayOfTotalExcSS: totalRegExcSS > 0 ? reg1day / totalRegExcSS : 0,
    numSS, regSS,
    num4wk: classCount(byWG('4wk')), reg4wk: byWG('4wk').length,
    num5wk: classCount(byWG('5wk')), reg5wk: byWG('5wk').length,
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
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', background: 'var(--surface-2)', border: 'none',
          cursor: 'pointer', color: 'var(--text)', fontSize: 13, fontWeight: 600,
        }}
      >
        <span>
          Special Speaker Courses
          {selectedCount > 0 && (
            <span style={{
              marginLeft: 8, background: 'var(--accent-blue)', color: '#fff',
              borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 700,
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
                  padding: '5px 12px', background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
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
                    display: 'flex', alignItems: 'center', gap: 10, padding: '5px 8px',
                    borderRadius: 4, cursor: 'pointer',
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
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{c.consolidatedTerm || c.term}</span>
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
    return [{ value: 'ALL', label: 'All Campuses' }, ...data.campuses.map(c => ({ value: c, label: c }))];
  }, [data]);

  // Original (unconsolidated) terms — used for the SS panel dropdown
  const allOrigTerms = data?.terms ?? [];

  // ─── Consolidated term list (Summer A+B → Summer YY) ─────────────────────
  const consolidatedTermKeys = useMemo(() => {
    if (!data) return [];
    const seen = new Set();
    const result = [];
    data.terms.forEach(t => {
      const ct = consolidateTerm(t);
      if (!seen.has(ct)) { seen.add(ct); result.push(ct); }
    });
    return result.sort((a, b) => termSortKeySummary(a).localeCompare(termSortKeySummary(b)));
  }, [data]);

  // The consolidated key for the selected current term
  const currentTermConsolidated = currentTerm ? consolidateTerm(currentTerm) : '';

  // Term options show consolidated terms
  const termOptions = useMemo(() => {
    return consolidatedTermKeys.map(t => ({ value: t, label: t }));
  }, [consolidatedTermKeys]);

  // All unique 1-day courses for the SS selector (use original terms for display)
  const oneDayCourses = useMemo(() => {
    if (!data) return [];
    const seen = new Set();
    const result = [];
    data.classRecs
      .filter(r => r.weekGroup === '1day' && r.classId)
      .forEach(r => {
        if (!seen.has(r.classId)) {
          seen.add(r.classId);
          result.push({
            classId: r.classId,
            title: r.title || '(no title)',
            term: r.term || '',
            consolidatedTerm: consolidateTerm(r.term || ''),
            campus: r.buildingCity || '',
          });
        }
      });
    result.sort((a, b) => a.term.localeCompare(b.term) || a.title.localeCompare(b.title));
    return result;
  }, [data]);

  const handleToggleSS = (classId) => {
    setSsClassIds(prev => {
      const next = new Set(prev);
      if (next.has(classId)) next.delete(classId); else next.add(classId);
      return next;
    });
  };
  const handleClearSS = () => setSsClassIds(new Set());

  // ─── Metrics computation (consolidated terms) ─────────────────────────────
  // Returns metrics keyed by consolidated term, FY, and optionally YTD
  const { termMetrics, fyMetrics, ytdMetrics, ytdKey } = useMemo(() => {
    if (!data) return { termMetrics: {}, fyMetrics: {}, ytdMetrics: null, ytdKey: null };

    const termMetrics = {};
    const fyRecsMap = {};

    // Current FY (derived from current consolidated term)
    const currentFY = currentTermConsolidated ? getFiscalYearSummary(currentTermConsolidated) : null;
    const ytdRecs = [];

    consolidatedTermKeys.forEach(ctKey => {
      const isCurrent = ctKey === currentTermConsolidated;
      // Gather records from all original terms that consolidate to this key
      const recs = data.classRecs.filter(r => {
        if (consolidateTerm(r.term) !== ctKey) return false;
        if (campus !== 'ALL' && r.buildingCity !== campus) return false;
        if (r.title.toLowerCase().includes('explorer')) return false;
        if (isCurrent && cutoffDate && r.enrollDate > cutoffDate) return false;
        return true;
      });
      termMetrics[ctKey] = computeMetrics(recs, ssClassIds);

      const fy = getFiscalYearSummary(ctKey);
      if (fy) {
        if (!fyRecsMap[fy]) fyRecsMap[fy] = [];
        fyRecsMap[fy].push(...recs);
      }

      // Accumulate YTD for current FY
      if (currentFY && fy === currentFY) {
        ytdRecs.push(...recs);
      }
    });

    const fyMetrics = {};
    Object.entries(fyRecsMap).forEach(([fy, recs]) => {
      fyMetrics[fy] = computeMetrics(recs, ssClassIds);
      // numStudents/avgClasses not meaningful summed across FY
      fyMetrics[fy].numStudents = null;
      fyMetrics[fy].avgClasses = null;
    });

    let ytdMetrics = null;
    let ytdKey = null;
    if (currentFY && ytdRecs.length > 0) {
      ytdKey = `YTD ${currentFY.replace('FY ', '')}`;
      ytdMetrics = computeMetrics(ytdRecs, ssClassIds);
      ytdMetrics.numStudents = null;
      ytdMetrics.avgClasses = null;
    }

    return { termMetrics, fyMetrics, ytdMetrics, ytdKey };
  }, [data, consolidatedTermKeys, campus, currentTermConsolidated, cutoffDate, ssClassIds]);

  // ─── Interleaved column list ──────────────────────────────────────────────
  const interleavedCols = useMemo(() => {
    const result = [];
    const currentFY = currentTermConsolidated ? getFiscalYearSummary(currentTermConsolidated) : null;

    for (let i = 0; i < consolidatedTermKeys.length; i++) {
      const ctKey = consolidatedTermKeys[i];
      const isCurrent = ctKey === currentTermConsolidated;
      result.push({ type: 'term', key: ctKey, isCurrent });

      const thisFY = getFiscalYearSummary(ctKey);
      const nextFY = i < consolidatedTermKeys.length - 1
        ? getFiscalYearSummary(consolidatedTermKeys[i + 1])
        : null;

      // Insert FY column when we're at the last term of a completed fiscal year
      if (thisFY && nextFY !== thisFY && fyMetrics[thisFY]) {
        // Don't insert a regular FY column for the current FY — use YTD instead
        if (thisFY !== currentFY) {
          result.push({ type: 'fy', key: thisFY });
        }
      }
    }

    // Append YTD column after the current FY's last term
    if (ytdKey && ytdMetrics) {
      result.push({ type: 'ytd', key: ytdKey });
    }

    return result;
  }, [consolidatedTermKeys, fyMetrics, currentTermConsolidated, ytdKey, ytdMetrics]);

  // ─── Web table rows ───────────────────────────────────────────────────────
  const tableRows = useMemo(() => {
    return METRICS.map(m => {
      if (m.sep) return { _separator: true, _key: m.key };
      const row = { _key: m.key, metric: m.label, _bold: m.bold };
      interleavedCols.forEach(col => {
        const metrics = col.type === 'ytd' ? ytdMetrics
                      : col.type === 'fy'  ? fyMetrics[col.key]
                      :                      termMetrics[col.key];
        row[col.key] = metrics?.[m.key];
      });
      return row;
    });
  }, [interleavedCols, termMetrics, fyMetrics, ytdMetrics]);

  // ─── Web table columns ────────────────────────────────────────────────────
  const cols = useMemo(() => {
    const metricCol = { key: 'metric', label: 'Metric', headerStyle: { minWidth: 260 } };
    const dataCols = interleavedCols.map(item => {
      const isFY  = item.type === 'fy';
      const isYTD = item.type === 'ytd';
      const isCurr = item.isCurrent;
      return {
        key: item.key,
        label: item.key,
        align: 'right',
        headerStyle: {
          background: isFY  ? 'rgba(63,185,80,0.18)'
                    : isYTD ? 'rgba(74,158,255,0.18)'
                    : isCurr ? 'rgba(74,158,255,0.15)'
                    : undefined,
          color: isFY  ? 'var(--accent-green)'
               : isYTD ? 'var(--accent-blue)'
               : isCurr ? 'var(--accent-blue)'
               : undefined,
          fontWeight: isFY || isYTD ? 700 : undefined,
          borderLeft: isFY  ? '2px solid rgba(63,185,80,0.4)'
                    : isYTD ? '2px solid rgba(74,158,255,0.4)'
                    : undefined,
        },
        cellStyle: {
          background: isFY  ? 'rgba(63,185,80,0.06)'
                    : isYTD ? 'rgba(74,158,255,0.06)'
                    : isCurr ? 'rgba(74,158,255,0.05)'
                    : undefined,
          color: isFY  ? 'var(--accent-green)'
               : isYTD ? 'var(--accent-blue)'
               : isCurr ? 'var(--accent-blue)'
               : undefined,
          borderLeft: isFY  ? '2px solid rgba(63,185,80,0.2)'
                    : isYTD ? '2px solid rgba(74,158,255,0.2)'
                    : undefined,
          fontWeight: isFY || isYTD ? 600 : undefined,
        },
        render: (val, row) => {
          const m = METRICS.find(x => x.label === row.metric);
          if (!m || row._separator) return null;
          return fmtVal(m, val);
        },
      };
    });
    return [metricCol, ...dataCols];
  }, [interleavedCols]);

  // ─── Membership YoY computation ───────────────────────────────────────────
  const membershipData = useMemo(() => {
    if (!data || !currentTermConsolidated || !cutoffDate) return null;

    const currentFY = getFiscalYearSummary(currentTermConsolidated);
    if (!currentFY) return null;

    // FY "25/26" → mem year "25-26"
    const fyToMemYear = (fy) => fy.replace('FY ', '').replace('/', '-');
    const currentMemYear = fyToMemYear(currentFY);

    // Derive prior FY by decrementing both numbers
    const [s1, s2] = currentFY.replace('FY ', '').split('/').map(Number);
    const priorFY = `FY ${String(s1 - 1).padStart(2, '0')}/${String(s2 - 1).padStart(2, '0')}`;
    const priorMemYear = fyToMemYear(priorFY);

    const priorCutoff = priorYearDate(cutoffDate);

    const campusFilter = campus === 'ALL' ? null : campus;

    const currentMemSet = getMemberSet(data.memRecs, currentMemYear, campusFilter, cutoffDate);
    const priorMemSet   = getMemberSet(data.memRecs, priorMemYear,   campusFilter, priorCutoff);

    // Find first enrollment date for each FY (for the note)
    const firstEnroll = (year, cutoff) => {
      const dates = data.memRecs
        .filter(r => r.year === year && (!cutoff || r.enrollDate <= cutoff) && r.enrollDate)
        .map(r => r.enrollDate)
        .sort();
      return dates[0] || null;
    };

    return {
      currentFY,
      priorFY,
      currentMemCount: currentMemSet.size,
      priorMemCount:   priorMemSet.size,
      currentMemDate:  cutoffDate,
      priorMemDate:    priorCutoff,
      currentMemStart: firstEnroll(currentMemYear, cutoffDate),
      priorMemStart:   firstEnroll(priorMemYear, priorCutoff),
    };
  }, [data, currentTermConsolidated, cutoffDate, campus]);

  // ─── Spring Registration YoY computation ─────────────────────────────────
  const springRegData = useMemo(() => {
    if (!data || !currentTermConsolidated || !cutoffDate) return null;

    const currentFY = getFiscalYearSummary(currentTermConsolidated);
    if (!currentFY) return null;

    // Find the Spring term in the current FY
    const currentSpringKey = consolidatedTermKeys.find(t =>
      t.startsWith('Spring') && getFiscalYearSummary(t) === currentFY
    );
    if (!currentSpringKey) return null;

    // Derive prior spring: "Spring 26" → "Spring 25"
    const priorSpringKey = currentSpringKey.replace(/(\d{2})$/, (_, yr) =>
      String(parseInt(yr, 10) - 1).padStart(2, '0')
    );

    const priorCutoff = priorYearDate(cutoffDate);
    const campusFilter = campus === 'ALL' ? null : campus;

    const currentSpringRecs = data.classRecs.filter(r => {
      if (consolidateTerm(r.term) !== currentSpringKey) return false;
      if (campusFilter && r.buildingCity !== campusFilter) return false;
      if (r.title.toLowerCase().includes('explorer')) return false;
      if (r.enrollDate > cutoffDate) return false;
      return true;
    });

    const priorSpringRecs = data.classRecs.filter(r => {
      if (consolidateTerm(r.term) !== priorSpringKey) return false;
      if (campusFilter && r.buildingCity !== campusFilter) return false;
      if (r.title.toLowerCase().includes('explorer')) return false;
      if (priorCutoff && r.enrollDate > priorCutoff) return false;
      return true;
    });

    return {
      currentSpringReg:  currentSpringRecs.length,
      priorSpringReg:    priorSpringRecs.length,
      currentSpringDate: cutoffDate,
      priorSpringDate:   priorCutoff,
    };
  }, [data, consolidatedTermKeys, currentTermConsolidated, cutoffDate, campus]);

  // ─── XLSX Export ──────────────────────────────────────────────────────────
  const handleExport = () => {
    // Build label for each consolidated column
    const exportCols = interleavedCols.map(col => {
      if (col.type === 'fy') {
        const short = col.key.replace('FY ', '');
        return { ...col, label: `FY\n${short}` };
      }
      if (col.type === 'ytd') {
        const short = col.key.replace('YTD ', '');
        const dateStr = cutoffDate
          ? `${String(parseInt(cutoffDate.split('-')[1], 10)).padStart(2,'0')}/${cutoffDate.split('-')[2]}/${cutoffDate.split('-')[0].slice(2)}`
          : '';
        return { ...col, label: `YTD ${short}\n${dateStr}` };
      }
      // Term col: format "Season\nYYYY" or "Season YYYY\nas of MM/DD/YY"
      const [season, yr] = col.key.split(' ');
      const fullYear = yr ? `20${yr}` : '';
      if (col.isCurrent && cutoffDate) {
        const [y, m, d] = cutoffDate.split('-');
        return { ...col, label: `${season} ${fullYear}\nas of ${m}/${d}/${String(y).slice(2)}` };
      }
      return { ...col, label: `${season}\n${fullYear}` };
    });

    // Merge all metrics into a single lookup
    const allMetrics = { ...termMetrics, ...fyMetrics };
    if (ytdKey && ytdMetrics) allMetrics[ytdKey] = ytdMetrics;

    exportSummaryXLSX({
      consolidatedCols: exportCols,
      allMetrics,
      cutoffDate,
      currentFY:         membershipData?.currentFY    ?? null,
      priorFY:           membershipData?.priorFY       ?? null,
      currentMemCount:   membershipData?.currentMemCount ?? null,
      priorMemCount:     membershipData?.priorMemCount   ?? null,
      currentMemDate:    membershipData?.currentMemDate  ?? null,
      priorMemDate:      membershipData?.priorMemDate    ?? null,
      currentMemStart:   membershipData?.currentMemStart ?? null,
      priorMemStart:     membershipData?.priorMemStart   ?? null,
      currentSpringReg:  springRegData?.currentSpringReg  ?? null,
      priorSpringReg:    springRegData?.priorSpringReg    ?? null,
      currentSpringDate: springRegData?.currentSpringDate ?? null,
      priorSpringDate:   springRegData?.priorSpringDate   ?? null,
    });
  };

  return (
    <PageShell title="Summary Export">
      {data && (
        <>
          <FilterBar>
            <Select label="Campus" value={campus} onChange={setCampus} options={campusOptions} />
            <Select
              label="Current Term"
              value={currentTermConsolidated}
              onChange={setCurrentTerm}
              options={[{ value: '', label: '— Select —' }, ...termOptions]}
            />
            <DatePicker label="Cutoff Date (current term)" value={cutoffDate} onChange={setCutoffDate} />
            <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
              <ExportButton onClick={handleExport} label="Export XLSX" />
            </div>
          </FilterBar>

          <SpecialSpeakerPanel
            courses={oneDayCourses}
            terms={allOrigTerms}
            campuses={data.campuses}
            selectedIds={ssClassIds}
            onToggle={handleToggleSS}
            onClear={handleClearSS}
          />

          {consolidatedTermKeys.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', padding: 20 }}>No class records found in file.</div>
          ) : (
            <>
              <SectionTitle>Registration Summary — All Terms</SectionTitle>
              {currentTermConsolidated && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Current term: <span style={{ color: 'var(--accent-blue)' }}>{currentTermConsolidated}</span>
                  {cutoffDate && <> · Cutoff: <span style={{ color: 'var(--accent-yellow)' }}>{cutoffDate}</span></>}
                  {ssClassIds.size > 0 && (
                    <> · Special speakers: <span style={{ color: 'var(--accent-blue)' }}>{ssClassIds.size} course{ssClassIds.size !== 1 ? 's' : ''}</span></>
                  )}
                </div>
              )}
              <DataTable cols={cols} rows={tableRows} stickyHeader emptyMsg="No data" />
            </>
          )}
        </>
      )}
    </PageShell>
  );
}
