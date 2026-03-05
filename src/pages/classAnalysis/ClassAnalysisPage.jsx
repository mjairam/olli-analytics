import { useState, useMemo, useCallback } from 'react';
import { useData } from '../../context/DataContext';
import { PageShell, FilterBar, Select, DatePicker, KPICard, KPIRow, SectionTitle, DataTable, ExportButton } from '../../components/ui';
import { SearchInput } from '../../components/ui/FilterBar';
import { getMemberSet, filterClassRecs, fmtPct, toCSV, downloadCSV } from '../../lib/parse';

const WEEK_GROUP_LABEL = {
  '1day': '1-Day', '3wk': '3-Week', '4wk': '4-Week', '6wk': '6-Week',
  '7wk': '7-Week', '8wk': '8-Week', '9wk': '9-Week', 'excur': 'Excursion', 'other': 'Other',
};

export default function ClassAnalysisPage() {
  const { data } = useData();

  const [term, setTerm] = useState('ALL');
  const [campus, setCampus] = useState('ALL');
  const [cutoffDate, setCutoffDate] = useState('');
  const [memYear, setMemYear] = useState('');
  const [searchText, setSearchText] = useState('');

  const [results, setResults] = useState(null);
  const [expandedClass, setExpandedClass] = useState(null);

  const termOptions = useMemo(() => {
    if (!data) return [];
    return [{ value: 'ALL', label: 'All Terms' }, ...data.terms.map(t => ({ value: t, label: t }))];
  }, [data]);

  const campusOptions = useMemo(() => {
    if (!data) return [];
    return [{ value: 'ALL', label: 'All Campuses' }, ...data.campuses.map(c => ({ value: c, label: c }))];
  }, [data]);

  const memYearOptions = useMemo(() => {
    if (!data) return [{ value: '', label: 'None' }];
    return [{ value: '', label: 'None' }, ...data.memYears.map(y => ({ value: y, label: y }))];
  }, [data]);

  const memberSet = useMemo(() => {
    if (!data || !memYear) return new Set();
    return getMemberSet(data.memRecs, memYear, campus === 'ALL' ? null : campus);
  }, [data, memYear, campus]);

  const handleSearch = useCallback(() => {
    if (!data) return;
    const filtered = filterClassRecs(data.classRecs, {
      term: term === 'ALL' ? null : term,
      campus: campus === 'ALL' ? null : campus,
      cutoffDate: cutoffDate || null,
    });

    // Group by class
    const classMap = {};
    filtered.forEach(r => {
      if (!r.classId) return;
      if (!classMap[r.classId]) {
        classMap[r.classId] = {
          classId: r.classId,
          title: r.title,
          term: r.term,
          campus: r.buildingCity,
          lectureType: r.lectureType,
          weekGroup: r.weekGroup,
          regs: [],
        };
      }
      classMap[r.classId].regs.push(r);
    });

    let classes = Object.values(classMap);

    // Apply title search filter
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      classes = classes.filter(c => c.title.toLowerCase().includes(q));
    }

    // Compute summary metrics per class
    const rows = classes.map(c => {
      const memberRegs = c.regs.filter(r => memberSet.has(String(r.profileId))).length;
      const revenue = c.regs.reduce((s, r) => s + (r.netAmount || 0), 0);
      return {
        classId: c.classId,
        title: c.title,
        term: c.term,
        campus: c.campus,
        length: WEEK_GROUP_LABEL[c.weekGroup] || c.lectureType || '—',
        regs: c.regs.length,
        revenue: revenue.toFixed(2),
        members: memberRegs,
        nonMembers: c.regs.length - memberRegs,
        pctMember: c.regs.length > 0 ? fmtPct(memberRegs / c.regs.length) : '—',
        _recs: c.regs,
      };
    }).sort((a, b) => b.regs - a.regs);

    setResults(rows);
    setExpandedClass(null);
  }, [data, term, campus, cutoffDate, searchText, memberSet]);

  const handleRowClick = useCallback((row) => {
    setExpandedClass(prev => prev?.classId === row.classId ? null : row);
  }, []);

  const handleExportList = () => {
    if (!results) return;
    const cols = [
      { key: 'classId', label: 'Class ID' },
      { key: 'title', label: 'Title' },
      { key: 'term', label: 'Term' },
      { key: 'campus', label: 'Campus' },
      { key: 'length', label: 'Length' },
      { key: 'regs', label: 'Registrations' },
      { key: 'revenue', label: 'Revenue' },
      { key: 'members', label: 'Members' },
      { key: 'nonMembers', label: 'Non-Members' },
      { key: 'pctMember', label: 'Member %' },
    ];
    downloadCSV(toCSV(results, cols), 'class_analysis.csv');
  };

  const handleExportRoster = () => {
    if (!expandedClass) return;
    const recs = expandedClass._recs;
    const cols = [
      { key: 'profileId', label: 'ProfileId' },
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'netAmount', label: 'Net Amount' },
      { key: 'enrollDate', label: 'Enroll Date' },
    ];
    downloadCSV(toCSV(recs, cols), `roster_${expandedClass.classId}.csv`);
  };

  const classCols = [
    { key: 'title', label: 'Class Title', wrap: true, headerStyle: { minWidth: 200 } },
    { key: 'term', label: 'Term' },
    { key: 'campus', label: 'Campus' },
    { key: 'length', label: 'Length' },
    { key: 'regs', label: 'Regs', align: 'right' },
    { key: 'revenue', label: 'Revenue', align: 'right', render: v => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
    { key: 'members', label: 'Members', align: 'right', color: () => 'var(--accent-blue)' },
    { key: 'nonMembers', label: 'Non-Mbr', align: 'right' },
    { key: 'pctMember', label: 'Mbr %', align: 'right', color: () => 'var(--accent-purple)' },
  ];

  const rosterCols = [
    { key: 'profileId', label: 'ID' },
    { key: 'firstName', label: 'First' },
    { key: 'lastName', label: 'Last' },
    { key: 'email', label: 'Email' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'netAmount', label: 'Revenue', align: 'right', render: v => `$${Number(v || 0).toFixed(2)}` },
    { key: 'enrollDate', label: 'Enroll Date', align: 'right' },
  ];

  return (
    <PageShell title="Class Analysis">
      {data && (
        <>
          <FilterBar>
            <Select label="Term" value={term} onChange={setTerm} options={termOptions} />
            <Select label="Campus" value={campus} onChange={setCampus} options={campusOptions} />
            <DatePicker label="Cutoff Date" value={cutoffDate} onChange={setCutoffDate} />
            <Select label="Membership Year" value={memYear} onChange={setMemYear} options={memYearOptions} />
            <SearchInput
              value={searchText}
              onChange={setSearchText}
              onSearch={handleSearch}
              placeholder="Search class title…"
              style={{ flex: 1, minWidth: 240 }}
            />
          </FilterBar>

          {results === null ? (
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              border: '1px dashed var(--border)',
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
              <p>Set your filters and click <strong style={{ color: 'var(--accent-blue)' }}>Search</strong> to find classes.</p>
              <p style={{ fontSize: 12 }}>Leave the search box empty to show all classes for the selected term/campus.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {results.length.toLocaleString()} class{results.length !== 1 ? 'es' : ''} found · Click a row to expand roster
                </span>
                <ExportButton onClick={handleExportList} label="Export Class List" disabled={results.length === 0} />
              </div>

              <DataTable
                cols={classCols}
                rows={results.map(r => ({ ...r, _highlight: expandedClass?.classId === r.classId }))}
                onRowClick={handleRowClick}
                emptyMsg="No classes found for these filters."
              />

              {expandedClass && (
                <div style={{
                  marginTop: 24,
                  border: '1px solid var(--accent-blue)',
                  borderRadius: 8,
                  padding: '20px 24px',
                  background: 'rgba(74,158,255,0.04)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <h2 className="serif" style={{ margin: 0, fontSize: 18, fontWeight: 400 }}>
                        {expandedClass.title}
                      </h2>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {expandedClass.term} · {expandedClass.campus} · {expandedClass.length} · ID: {expandedClass.classId}
                      </div>
                    </div>
                    <ExportButton onClick={handleExportRoster} label="Export Roster" />
                  </div>

                  <KPIRow>
                    <KPICard label="Registrations" value={expandedClass.regs} accent="blue" />
                    <KPICard label="Revenue" value={`$${Number(expandedClass.revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} accent="green" />
                    <KPICard label="Members" value={expandedClass.members} accent="blue" bar={expandedClass.regs > 0 ? expandedClass.members / expandedClass.regs : 0} />
                    <KPICard label="Non-Members" value={expandedClass.nonMembers} accent="red" />
                    <KPICard label="Member %" value={expandedClass.pctMember} accent="purple" />
                  </KPIRow>

                  <SectionTitle>Roster</SectionTitle>
                  <DataTable cols={rosterCols} rows={expandedClass._recs} compact emptyMsg="No registrations" />
                </div>
              )}
            </>
          )}
        </>
      )}
    </PageShell>
  );
}
