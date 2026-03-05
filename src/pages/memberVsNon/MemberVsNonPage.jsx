import { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { PageShell, FilterBar, Select, DatePicker, KPICard, KPIRow, SectionTitle, DataTable } from '../../components/ui';
import { getMemberSet, filterClassRecs, WEEK_GROUPS, fmtPct } from '../../lib/parse';

export default function MemberVsNonPage() {
  const { data } = useData();

  // Membership definition
  const [memYear, setMemYear] = useState('');
  const [memCampus, setMemCampus] = useState('ALL');

  // Registration filters
  const [term, setTerm] = useState('ALL');
  const [regCampus, setRegCampus] = useState('ALL');
  const [lectureType, setLectureType] = useState('ALL');
  const [cutoffDate, setCutoffDate] = useState('');

  const memYearOptions = useMemo(() => {
    if (!data) return [];
    return [
      { value: '', label: 'None (all non-member)' },
      ...data.memYears.map(y => ({ value: y, label: y })),
    ];
  }, [data]);

  const campusOptions = useMemo(() => {
    if (!data) return [{ value: 'ALL', label: 'All Campuses' }];
    return [
      { value: 'ALL', label: 'All Campuses' },
      ...data.campuses.map(c => ({ value: c, label: c })),
    ];
  }, [data]);

  const memCampusOptions = useMemo(() => {
    if (!data) return [{ value: 'ALL', label: 'All Campuses' }];
    const campusSet = new Set(data.memRecs.map(r => r.campus).filter(Boolean));
    return [
      { value: 'ALL', label: 'All Campuses' },
      ...[...campusSet].sort().map(c => ({ value: c, label: c })),
    ];
  }, [data]);

  const termOptions = useMemo(() => {
    if (!data) return [];
    return [{ value: 'ALL', label: 'All Terms' }, ...data.terms.map(t => ({ value: t, label: t }))];
  }, [data]);

  const ltOptions = useMemo(() => {
    if (!data) return [{ value: 'ALL', label: 'All Types' }];
    const ltSet = new Set(data.classRecs.map(r => r.lectureType).filter(Boolean));
    return [{ value: 'ALL', label: 'All Types' }, ...[...ltSet].sort().map(lt => ({ value: lt, label: lt }))];
  }, [data]);

  const memberSet = useMemo(() => {
    if (!data || !memYear) return new Set();
    return getMemberSet(data.memRecs, memYear, memCampus === 'ALL' ? null : memCampus);
  }, [data, memYear, memCampus]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return filterClassRecs(data.classRecs, {
      term: term === 'ALL' ? null : term,
      campus: regCampus === 'ALL' ? null : regCampus,
      lectureType: lectureType === 'ALL' ? null : lectureType,
      cutoffDate: cutoffDate || null,
    });
  }, [data, term, regCampus, lectureType, cutoffDate]);

  const analysis = useMemo(() => {
    const total = filtered.length;
    const memberReg = filtered.filter(r => memberSet.has(String(r.profileId))).length;
    const nonMemberReg = total - memberReg;
    const memberPct = total > 0 ? memberReg / total : 0;

    // By course length
    const byLength = WEEK_GROUPS.map(wg => {
      const recs = filtered.filter(r => r.weekGroup === wg.key);
      if (recs.length === 0) return null;
      const mReg = recs.filter(r => memberSet.has(String(r.profileId))).length;
      return {
        length: wg.label,
        total: recs.length,
        members: mReg,
        nonMembers: recs.length - mReg,
        pctMember: recs.length > 0 ? fmtPct(mReg / recs.length) : '—',
      };
    }).filter(Boolean);

    // By term (if all terms)
    let byTerm = [];
    if (term === 'ALL') {
      const termMap = {};
      filtered.forEach(r => {
        if (!termMap[r.term]) termMap[r.term] = { total: 0, members: 0 };
        termMap[r.term].total++;
        if (memberSet.has(String(r.profileId))) termMap[r.term].members++;
      });
      byTerm = Object.entries(termMap).map(([t, d]) => ({
        term: t,
        total: d.total,
        members: d.members,
        nonMembers: d.total - d.members,
        pctMember: d.total > 0 ? fmtPct(d.members / d.total) : '—',
      })).sort((a, b) => b.total - a.total);
    }

    // By campus (if all campuses)
    let byCampus = [];
    if (regCampus === 'ALL') {
      const campusMap = {};
      filtered.forEach(r => {
        const c = r.buildingCity || 'Unknown';
        if (!campusMap[c]) campusMap[c] = { total: 0, members: 0 };
        campusMap[c].total++;
        if (memberSet.has(String(r.profileId))) campusMap[c].members++;
      });
      byCampus = Object.entries(campusMap).map(([c, d]) => ({
        campus: c,
        total: d.total,
        members: d.members,
        nonMembers: d.total - d.members,
        pctMember: d.total > 0 ? fmtPct(d.members / d.total) : '—',
      })).sort((a, b) => b.total - a.total);
    }

    return { total, memberReg, nonMemberReg, memberPct, byLength, byTerm, byCampus };
  }, [filtered, memberSet, term, regCampus]);

  const breakdownCols = (rowLabel) => [
    { key: rowLabel, label: rowLabel.charAt(0).toUpperCase() + rowLabel.slice(1) },
    { key: 'total', label: 'Total Regs', align: 'right' },
    { key: 'members', label: 'Members', align: 'right', color: () => 'var(--accent-blue)' },
    { key: 'nonMembers', label: 'Non-Members', align: 'right' },
    { key: 'pctMember', label: 'Member %', align: 'right', color: (v) => 'var(--accent-purple)' },
  ];

  return (
    <PageShell title="Member vs Non-Member">
      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <FilterBar>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '100%', marginBottom: 4 }}>
                Membership Definition
              </div>
              <Select label="Membership Year" value={memYear} onChange={setMemYear} options={memYearOptions} />
              <Select label="Campus" value={memCampus} onChange={setMemCampus} options={memCampusOptions} />
            </FilterBar>
            <FilterBar>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '100%', marginBottom: 4 }}>
                Registration Filters
              </div>
              <Select label="Term" value={term} onChange={setTerm} options={termOptions} />
              <Select label="Campus" value={regCampus} onChange={setRegCampus} options={campusOptions} />
              <Select label="Lecture Type" value={lectureType} onChange={setLectureType} options={ltOptions} />
              <DatePicker label="Cutoff Date" value={cutoffDate} onChange={setCutoffDate} />
            </FilterBar>
          </div>

          <KPIRow>
            <KPICard label="Total Registrations" value={analysis.total.toLocaleString()} accent="blue" />
            <KPICard label="Member Registrations" value={analysis.memberReg.toLocaleString()} accent="green" bar={analysis.memberPct} />
            <KPICard label="Non-Member Registrations" value={analysis.nonMemberReg.toLocaleString()} accent="red" />
            <KPICard label="Member %" value={fmtPct(analysis.memberPct)} accent="purple" />
          </KPIRow>

          <SectionTitle>By Course Length</SectionTitle>
          <DataTable cols={breakdownCols('length')} rows={analysis.byLength} compact emptyMsg="No data" />

          {analysis.byTerm.length > 0 && (
            <>
              <SectionTitle>By Term</SectionTitle>
              <DataTable cols={breakdownCols('term')} rows={analysis.byTerm} compact />
            </>
          )}

          {analysis.byCampus.length > 0 && (
            <>
              <SectionTitle>By Campus</SectionTitle>
              <DataTable cols={breakdownCols('campus')} rows={analysis.byCampus} compact />
            </>
          )}
        </>
      )}
    </PageShell>
  );
}
