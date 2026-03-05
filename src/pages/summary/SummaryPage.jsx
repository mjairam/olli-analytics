import { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { PageShell, FilterBar, Select, DatePicker, ExportButton, SectionTitle, DataTable } from '../../components/ui';
import { getMemberSet, filterClassRecs, WEEK_GROUPS, priorSemester, sortedTerms, toCSV, downloadCSV, fmtPct } from '../../lib/parse';

// ─── Metric Definitions ───────────────────────────────────────────────────────

const METRICS = [
  { key: 'totalReg',       label: 'Total Registration',         bold: true },
  { key: 'num1day',        label: '# of 1-Day Lectures' },
  { key: 'reg1day',        label: '1-Day Registrations' },
  { key: 'totalRegIncExc', label: 'Total Reg (incl. Excursions)' },
  { key: 'pct1dayOfTotal', label: '1-Day Reg % of Total',       pct: true },
  { key: 'num4wk',         label: '# of 4-Week Courses' },
  { key: 'reg4wk',         label: '4-Week Registrations' },
  { key: 'num6wk',         label: '# of 6-Week Courses' },
  { key: 'reg6wk',         label: '6-Week Registrations' },
  { key: 'num7wk',         label: '# of 7-Week Courses' },
  { key: 'reg7wk',         label: '7-Week Registrations' },
  { key: 'num8wk',         label: '# of 8-Week Courses' },
  { key: 'reg8wk',         label: '8-Week Registrations' },
  { key: 'num9wk',         label: '# of 9-Week Courses' },
  { key: 'reg9wk',         label: '9-Week Registrations' },
  { key: 'numExcur',       label: '# of Excursions' },
  { key: 'regExcur',       label: 'Excursion Registrations' },
  { key: '_sep1',          sep: true },
  { key: 'memberReg',      label: 'Member Registrations' },
  { key: 'nonMemberReg',   label: 'Non-Member Registrations' },
  { key: 'memberPct',      label: 'Member %',                   pct: true },
  { key: '_sep2',          sep: true },
  { key: 'numStudents',    label: '# of Students' },
  { key: 'avgClasses',     label: 'Avg Classes/Student',        decimal: true },
];

// ─── Compute metrics for a set of filtered class records ─────────────────────

function computeMetrics(recs, memberSet) {
  if (!recs || recs.length === 0) return {};

  const totalReg = recs.length;

  const byWG = (wgKey) => recs.filter(r => r.weekGroup === wgKey);
  const classCount = (wgKey) => new Set(byWG(wgKey).map(r => r.classId).filter(Boolean)).size;

  const reg1day = byWG('1day').length;
  const regExcur = byWG('excur').length;
  const totalRegIncExc = totalReg; // already includes excursions

  const memberReg = memberSet ? recs.filter(r => memberSet.has(String(r.profileId))).length : 0;
  const nonMemberReg = totalReg - memberReg;

  const profileIds = recs.map(r => r.profileId).filter(Boolean);
  const uniqueStudents = new Set(profileIds);
  const numStudents = uniqueStudents.size;
  const avgClasses = numStudents > 0 ? totalReg / numStudents : 0;

  return {
    totalReg,
    num1day: classCount('1day'),
    reg1day,
    totalRegIncExc,
    pct1dayOfTotal: totalReg > 0 ? reg1day / totalReg : 0,
    num4wk: classCount('4wk'), reg4wk: byWG('4wk').length,
    num6wk: classCount('6wk'), reg6wk: byWG('6wk').length,
    num7wk: classCount('7wk'), reg7wk: byWG('7wk').length,
    num8wk: classCount('8wk'), reg8wk: byWG('8wk').length,
    num9wk: classCount('9wk'), reg9wk: byWG('9wk').length,
    numExcur: classCount('excur'), regExcur,
    memberReg, nonMemberReg,
    memberPct: totalReg > 0 ? memberReg / totalReg : 0,
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SummaryPage() {
  const { data } = useData();

  const [campus, setCampus] = useState('ALL');
  const [currentTerm, setCurrentTerm] = useState('');
  const [cutoffDate, setCutoffDate] = useState('');
  const [memYear, setMemYear] = useState('');

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

  const memYearOptions = useMemo(() => {
    if (!data) return [{ value: '', label: 'None' }];
    return [
      { value: '', label: 'None (no membership filter)' },
      ...data.memYears.map(y => ({ value: y, label: y })),
    ];
  }, [data]);

  // All unique terms for column headers
  const allTerms = data?.terms ?? [];

  // Member set for membership-based filtering
  const memberSet = useMemo(() => {
    if (!data || !memYear) return null;
    return getMemberSet(data.memRecs, memYear, campus === 'ALL' ? null : campus);
  }, [data, memYear, campus]);

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
      result[term] = computeMetrics(recs, memberSet);
    });
    return result;
  }, [data, allTerms, campus, currentTerm, cutoffDate, memberSet]);

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
  }, [METRICS, allTerms, termMetrics]);

  // Build columns
  const cols = useMemo(() => {
    const metricCol = {
      key: 'metric',
      label: 'Metric',
      headerStyle: { minWidth: 220 },
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
            <Select
              label="Membership Year"
              value={memYear}
              onChange={setMemYear}
              options={memYearOptions}
            />
            <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
              <ExportButton onClick={handleExport} />
            </div>
          </FilterBar>

          {allTerms.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', padding: 20 }}>No class records found in file.</div>
          ) : (
            <>
              <SectionTitle>Registration Summary — All Terms</SectionTitle>
              {currentTerm && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Current term: <span style={{ color: 'var(--accent-blue)' }}>{currentTerm}</span>
                  {cutoffDate && <> · Cutoff: <span style={{ color: 'var(--accent-yellow)' }}>{cutoffDate}</span></>}
                  {memYear && <> · Membership year: <span style={{ color: 'var(--accent-purple)' }}>{memYear}</span></>}
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
