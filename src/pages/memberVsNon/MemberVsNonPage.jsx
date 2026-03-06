import { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { PageShell, FilterBar, Select, DatePicker, KPICard, KPIRow, SectionTitle, DataTable, ExportButton } from '../../components/ui';
import { getMemberSet, filterClassRecs, WEEK_GROUPS, fmtPct, toCSV, downloadCSV } from '../../lib/parse';

// ─── Drilldown Panel ──────────────────────────────────────────────────────────

function DrilldownPanel({ title, recs, accent, onClose }) {
  // Deduplicate by profileId, accumulate reg count
  const people = useMemo(() => {
    const map = {};
    recs.forEach(r => {
      const id = String(r.profileId);
      if (!map[id]) {
        map[id] = {
          name: [r.firstName, r.lastName].filter(Boolean).join(' ') || '—',
          email: r.email || '—',
          campus: r.buildingCity || '—',
          regs: 0,
        };
      }
      map[id].regs++;
    });
    return Object.values(map).sort((a, b) => b.regs - a.regs || a.name.localeCompare(b.name));
  }, [recs]);

  const accentColor = { blue: 'var(--accent-blue)', green: 'var(--accent-green)', red: 'var(--accent-red)' }[accent] || 'var(--accent-blue)';

  const cols = [
    { key: 'name',   label: 'Name' },
    { key: 'email',  label: 'Email' },
    { key: 'campus', label: 'Campus' },
    { key: 'regs',   label: '# Registrations', align: 'right' },
  ];

  const handleExport = () => {
    downloadCSV(toCSV(people, cols), `${title.replace(/\s+/g, '_').toLowerCase()}.csv`);
  };

  return (
    <div style={{
      border: `1px solid ${accentColor}`,
      borderRadius: 10,
      marginBottom: 24,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'var(--surface-2)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: accentColor }}>
          {title} — {people.length.toLocaleString()} unique people
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ExportButton onClick={handleExport} />
          <button onClick={onClose} style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px 10px',
            fontSize: 12,
            fontFamily: 'inherit',
          }}>✕ Close</button>
        </div>
      </div>
      <DataTable cols={cols} rows={people} compact emptyMsg="No records" />
    </div>
  );
}

// ─── Clickable KPI Card wrapper ───────────────────────────────────────────────

function ClickableKPICard({ onClick, active, ...props }) {
  return (
    <div
      onClick={onClick}
      title="Click to see who these people are"
      style={{
        flex: 1,
        cursor: 'pointer',
        outline: active ? `2px solid var(--accent-blue)` : '2px solid transparent',
        borderRadius: 10,
        transition: 'outline 0.15s, transform 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <KPICard {...props} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MemberVsNonPage() {
  const { data } = useData();

  const [memYear, setMemYear] = useState('');
  const [memCampus, setMemCampus] = useState('ALL');
  const [term, setTerm] = useState('ALL');
  const [regCampus, setRegCampus] = useState('ALL');
  const [lectureType, setLectureType] = useState('ALL');
  const [cutoffDate, setCutoffDate] = useState('');
  const [drilldown, setDrilldown] = useState(null); // 'total' | 'member' | 'nonMember'

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

  const memberRecs    = useMemo(() => filtered.filter(r => memberSet.has(String(r.profileId))), [filtered, memberSet]);
  const nonMemberRecs = useMemo(() => filtered.filter(r => !memberSet.has(String(r.profileId))), [filtered, memberSet]);

  const analysis = useMemo(() => {
    const total = filtered.length;
    const memberReg = memberRecs.length;
    const memberPct = total > 0 ? memberReg / total : 0;

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

    return { total, memberReg, nonMemberReg: total - memberReg, memberPct, byLength, byTerm, byCampus };
  }, [filtered, memberRecs, memberSet, term, regCampus]);

  const handleCardClick = (key) => setDrilldown(d => d === key ? null : key);

  const drilldownRecs = drilldown === 'total' ? filtered
    : drilldown === 'member' ? memberRecs
    : drilldown === 'nonMember' ? nonMemberRecs
    : [];
  const drilldownTitle = drilldown === 'total' ? 'All Registrants'
    : drilldown === 'member' ? 'Member Registrants'
    : 'Non-Member Registrants';
  const drilldownAccent = drilldown === 'total' ? 'blue'
    : drilldown === 'member' ? 'green'
    : 'red';

  const breakdownCols = (rowLabel) => [
    { key: rowLabel, label: rowLabel.charAt(0).toUpperCase() + rowLabel.slice(1) },
    { key: 'total', label: 'Total Regs', align: 'right' },
    { key: 'members', label: 'Members', align: 'right', color: () => 'var(--accent-blue)' },
    { key: 'nonMembers', label: 'Non-Members', align: 'right' },
    { key: 'pctMember', label: 'Member %', align: 'right', color: () => 'var(--accent-purple)' },
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

          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
            Click a card to see the people behind the number.
          </div>

          <KPIRow>
            <ClickableKPICard
              label="Total Registrations" value={analysis.total.toLocaleString()} accent="blue"
              onClick={() => handleCardClick('total')} active={drilldown === 'total'}
            />
            <ClickableKPICard
              label="Member Registrations" value={analysis.memberReg.toLocaleString()} accent="green" bar={analysis.memberPct}
              onClick={() => handleCardClick('member')} active={drilldown === 'member'}
            />
            <ClickableKPICard
              label="Non-Member Registrations" value={analysis.nonMemberReg.toLocaleString()} accent="red"
              onClick={() => handleCardClick('nonMember')} active={drilldown === 'nonMember'}
            />
            <KPICard label="Member %" value={fmtPct(analysis.memberPct)} accent="purple" />
          </KPIRow>

          {drilldown && (
            <DrilldownPanel
              title={drilldownTitle}
              recs={drilldownRecs}
              accent={drilldownAccent}
              onClose={() => setDrilldown(null)}
            />
          )}

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
