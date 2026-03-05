import { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { PageShell, FilterBar, Select, DatePicker, KPICard, KPIRow, SectionTitle, DataTable, ExportButton } from '../../components/ui';
import { getMemberSet, toCSV, downloadCSV, fmtChange } from '../../lib/parse';

function getMemberRecs(memRecs, year, campus, cutoffDate) {
  return memRecs.filter(r => {
    if (year && r.year !== year) return false;
    if (campus && campus !== 'ALL' && r.campus !== campus) return false;
    if (cutoffDate && r.enrollDate > cutoffDate) return false;
    return true;
  });
}

// Deduplicate by profileId keeping earliest enrollDate
function dedup(recs) {
  const map = {};
  recs.forEach(r => {
    if (!map[r.profileId] || r.enrollDate < map[r.profileId].enrollDate) {
      map[r.profileId] = r;
    }
  });
  return Object.values(map);
}

export default function MembershipPage() {
  const { data } = useData();

  const [primaryYear, setPrimaryYear] = useState('');
  const [compareYear, setCompareYear] = useState('');
  const [campus, setCampus] = useState('ALL');
  const [cutoffDate, setCutoffDate] = useState('');

  const yearOptions = useMemo(() => {
    if (!data) return [];
    return [
      { value: '', label: '— Select —' },
      ...data.memYears.map(y => ({ value: y, label: y })),
    ];
  }, [data]);

  const campusOptions = useMemo(() => {
    if (!data) return [{ value: 'ALL', label: 'All Campuses' }];
    const campusSet = new Set(data.memRecs.map(r => r.campus).filter(Boolean));
    return [
      { value: 'ALL', label: 'All Campuses' },
      ...[...campusSet].sort().map(c => ({ value: c, label: c })),
    ];
  }, [data]);

  const analysis = useMemo(() => {
    if (!data || !primaryYear) return null;

    const primaryRecs = dedup(getMemberRecs(data.memRecs, primaryYear, campus, cutoffDate));
    const compareRecs = compareYear ? dedup(getMemberRecs(data.memRecs, compareYear, campus, null)) : [];

    const primaryIds = new Set(primaryRecs.map(r => r.profileId));
    const compareIds = new Set(compareRecs.map(r => r.profileId));

    const newMembers = primaryRecs.filter(r => !compareIds.has(r.profileId));
    const returning = primaryRecs.filter(r => compareIds.has(r.profileId));
    const lapsed = compareRecs.filter(r => !primaryIds.has(r.profileId));

    // Monthly breakdown for primary year
    const monthMap = {};
    const allCompareIds = new Set(compareRecs.map(r => r.profileId));
    primaryRecs.forEach(r => {
      if (!r.enrollDate) return;
      const month = r.enrollDate.slice(0, 7);
      if (!monthMap[month]) monthMap[month] = { enrolled: 0, newM: 0, returning: 0 };
      monthMap[month].enrolled++;
      if (allCompareIds.has(r.profileId)) monthMap[month].returning++;
      else monthMap[month].newM++;
    });
    const monthKeys = Object.keys(monthMap).sort();
    let cumTotal = 0, cumNew = 0, cumRet = 0;
    const monthRows = monthKeys.map(m => {
      const d = monthMap[m];
      cumTotal += d.enrolled;
      cumNew += d.newM;
      cumRet += d.returning;
      return {
        month: m,
        enrolled: d.enrolled,
        newM: d.newM,
        returning: d.returning,
        pctNew: d.enrolled > 0 ? ((d.newM / d.enrolled) * 100).toFixed(1) + '%' : '—',
        cumTotal, cumNew, cumRet,
      };
    });

    // By campus breakdown (when ALL selected)
    let campusRows = [];
    if (campus === 'ALL') {
      const campusMap = {};
      primaryRecs.forEach(r => {
        const c = r.campus || 'Unknown';
        if (!campusMap[c]) campusMap[c] = { primary: 0, newM: 0, returning: 0 };
        campusMap[c].primary++;
        if (allCompareIds.has(r.profileId)) campusMap[c].returning++;
        else campusMap[c].newM++;
      });
      campusRows = Object.entries(campusMap)
        .sort((a, b) => b[1].primary - a[1].primary)
        .map(([c, d]) => ({
          campus: c,
          primary: d.primary,
          newM: d.newM,
          returning: d.returning,
        }));
    }

    return {
      primaryCount: primaryRecs.length,
      compareCount: compareRecs.length,
      newCount: newMembers.length,
      returningCount: returning.length,
      lapsedCount: lapsed.length,
      monthRows,
      campusRows,
      primaryRecs,
    };
  }, [data, primaryYear, compareYear, campus, cutoffDate]);

  const yoyChange = analysis && analysis.compareCount > 0
    ? fmtChange(analysis.primaryCount, analysis.compareCount)
    : null;

  const handleExport = () => {
    if (!analysis) return;
    const cols = [
      { key: 'month', label: 'Month' },
      { key: 'enrolled', label: 'Enrolled' },
      { key: 'newM', label: 'New' },
      { key: 'returning', label: 'Returning' },
      { key: 'pctNew', label: '% New' },
      { key: 'cumTotal', label: 'Cum. Total' },
      { key: 'cumNew', label: 'Cum. New' },
      { key: 'cumRet', label: 'Cum. Returning' },
    ];
    downloadCSV(toCSV(analysis.monthRows, cols), `membership_${primaryYear}.csv`);
  };

  const monthCols = [
    { key: 'month', label: 'Month' },
    { key: 'enrolled', label: 'Enrolled', align: 'right' },
    { key: 'newM', label: 'New', align: 'right', color: () => 'var(--accent-green)' },
    { key: 'returning', label: 'Returning', align: 'right', color: () => 'var(--accent-blue)' },
    { key: 'pctNew', label: '% New', align: 'right' },
    { key: 'cumTotal', label: 'Cum. Total', align: 'right', _muted: true },
    { key: 'cumNew', label: 'Cum. New', align: 'right' },
    { key: 'cumRet', label: 'Cum. Returning', align: 'right' },
  ];

  const campusCols = [
    { key: 'campus', label: 'Campus' },
    { key: 'primary', label: primaryYear || 'Primary', align: 'right' },
    { key: 'newM', label: 'New', align: 'right', color: () => 'var(--accent-green)' },
    { key: 'returning', label: 'Returning', align: 'right', color: () => 'var(--accent-blue)' },
  ];

  return (
    <PageShell title="Membership Analytics">
      {data && (
        <>
          <FilterBar>
            <Select label="Primary Year" value={primaryYear} onChange={setPrimaryYear} options={yearOptions} />
            <Select label="Compare Year" value={compareYear} onChange={setCompareYear} options={[{ value: '', label: 'None' }, ...data.memYears.map(y => ({ value: y, label: y }))]} />
            <Select label="Campus" value={campus} onChange={setCampus} options={campusOptions} />
            <DatePicker label="Cutoff Date (primary)" value={cutoffDate} onChange={setCutoffDate} />
            <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
              <ExportButton onClick={handleExport} disabled={!analysis} />
            </div>
          </FilterBar>

          {!primaryYear ? (
            <div style={{ color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>
              Select a membership year to begin.
            </div>
          ) : analysis && (
            <>
              <KPIRow>
                <KPICard label={`${primaryYear} Members`} value={analysis.primaryCount.toLocaleString()} accent="blue" />
                {compareYear && (
                  <KPICard label={`${compareYear} Members`} value={analysis.compareCount.toLocaleString()} accent="purple" />
                )}
                {yoyChange && (
                  <KPICard
                    label="YoY Change"
                    value={yoyChange.text}
                    accent={yoyChange.color}
                  />
                )}
                <KPICard label="New Members" value={analysis.newCount.toLocaleString()} accent="green" />
                <KPICard label="Returning" value={analysis.returningCount.toLocaleString()} accent="blue" />
                {compareYear && (
                  <KPICard label="Lapsed" value={analysis.lapsedCount.toLocaleString()} accent="red" />
                )}
              </KPIRow>

              {campus === 'ALL' && analysis.campusRows.length > 0 && (
                <>
                  <SectionTitle>By Campus</SectionTitle>
                  <DataTable cols={campusCols} rows={analysis.campusRows} compact />
                </>
              )}

              <SectionTitle>Monthly Enrollment — {primaryYear}</SectionTitle>
              <DataTable cols={monthCols} rows={analysis.monthRows} compact emptyMsg="No enrollment data for selected filters." />
            </>
          )}
        </>
      )}
    </PageShell>
  );
}
