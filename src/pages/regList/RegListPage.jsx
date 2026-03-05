import { useState, useMemo, useCallback } from 'react';
import { useData } from '../../context/DataContext';
import { PageShell, FilterBar, Select, DatePicker, DataTable, ExportButton } from '../../components/ui';
import { SearchInput } from '../../components/ui/FilterBar';
import { getMemberSet, filterClassRecs, toCSV, downloadCSV } from '../../lib/parse';

export default function RegListPage() {
  const { data } = useData();

  // Membership definition
  const [memYear, setMemYear] = useState('');
  const [memCampus, setMemCampus] = useState('ALL');

  // Registration filters
  const [term, setTerm] = useState('ALL');
  const [regCampus, setRegCampus] = useState('ALL');
  const [lectureType, setLectureType] = useState('ALL');
  const [cutoffDate, setCutoffDate] = useState('');
  const [showFilter, setShowFilter] = useState('All');

  const [search, setSearch] = useState('');
  const [loaded, setLoaded] = useState(false);

  const memYearOptions = useMemo(() => {
    if (!data) return [{ value: '', label: 'None' }];
    return [{ value: '', label: 'None (no mem. filter)' }, ...data.memYears.map(y => ({ value: y, label: y }))];
  }, [data]);

  const campusOptions = useMemo(() => {
    if (!data) return [{ value: 'ALL', label: 'All Campuses' }];
    return [{ value: 'ALL', label: 'All Campuses' }, ...data.campuses.map(c => ({ value: c, label: c }))];
  }, [data]);

  const memCampusOptions = useMemo(() => {
    if (!data) return [{ value: 'ALL', label: 'All Campuses' }];
    const cs = new Set(data.memRecs.map(r => r.campus).filter(Boolean));
    return [{ value: 'ALL', label: 'All Campuses' }, ...[...cs].sort().map(c => ({ value: c, label: c }))];
  }, [data]);

  const termOptions = useMemo(() => {
    if (!data) return [];
    return [{ value: 'ALL', label: 'All Terms' }, ...data.terms.map(t => ({ value: t, label: t }))];
  }, [data]);

  const ltOptions = useMemo(() => {
    if (!data) return [{ value: 'ALL', label: 'All Types' }];
    const ls = new Set(data.classRecs.map(r => r.lectureType).filter(Boolean));
    return [{ value: 'ALL', label: 'All Types' }, ...[...ls].sort().map(lt => ({ value: lt, label: lt }))];
  }, [data]);

  const memberSet = useMemo(() => {
    if (!data || !memYear) return new Set();
    return getMemberSet(data.memRecs, memYear, memCampus === 'ALL' ? null : memCampus);
  }, [data, memYear, memCampus]);

  const allRecs = useMemo(() => {
    if (!data) return [];
    return filterClassRecs(data.classRecs, {
      term: term === 'ALL' ? null : term,
      campus: regCampus === 'ALL' ? null : regCampus,
      lectureType: lectureType === 'ALL' ? null : lectureType,
      cutoffDate: cutoffDate || null,
    }).map(r => ({
      ...r,
      isMember: memberSet.has(String(r.profileId)),
    }));
  }, [data, term, regCampus, lectureType, cutoffDate, memberSet]);

  const listRecs = useMemo(() => {
    let recs = allRecs;
    if (showFilter === 'Members') recs = recs.filter(r => r.isMember);
    else if (showFilter === 'NonMembers') recs = recs.filter(r => !r.isMember);
    if (search) {
      const q = search.toLowerCase();
      recs = recs.filter(r =>
        r.firstName?.toLowerCase().includes(q) ||
        r.lastName?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        String(r.profileId || '').includes(q) ||
        r.title?.toLowerCase().includes(q)
      );
    }
    return recs;
  }, [allRecs, showFilter, search]);

  const handleLoad = useCallback(() => setLoaded(true), []);

  const handleExport = () => {
    const cols = [
      { key: 'profileId', label: 'ProfileId' },
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'term', label: 'Term' },
      { key: 'buildingCity', label: 'Campus' },
      { key: 'title', label: 'Class Title' },
      { key: 'lectureType', label: 'Lecture Type' },
      { key: 'classId', label: 'Class ID' },
      { key: 'netAmount', label: 'Net Amount' },
      { key: 'enrollDate', label: 'Enroll Date' },
      { key: 'isMember', label: 'Member' },
    ];
    downloadCSV(toCSV(listRecs, cols), 'registration_list.csv');
  };

  const cols = [
    { key: 'profileId', label: 'ID' },
    { key: 'firstName', label: 'First' },
    { key: 'lastName', label: 'Last' },
    { key: 'email', label: 'Email' },
    { key: 'term', label: 'Term' },
    { key: 'buildingCity', label: 'Campus' },
    { key: 'title', label: 'Class Title', wrap: true, headerStyle: { minWidth: 200 } },
    { key: 'lectureType', label: 'LT', align: 'center' },
    { key: 'netAmount', label: 'Revenue', align: 'right', render: v => `$${Number(v || 0).toFixed(2)}` },
    { key: 'enrollDate', label: 'Enroll Date', align: 'right' },
    {
      key: 'isMember', label: 'Mbr', align: 'center',
      render: v => v ? <span style={{ color: 'var(--accent-green)' }}>✓</span> : '',
    },
  ];

  return (
    <PageShell title="Registration List">
      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 4 }}>
            <FilterBar>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '100%', marginBottom: 4 }}>
                Membership Definition
              </div>
              <Select label="Membership Year" value={memYear} onChange={v => { setMemYear(v); setLoaded(false); }} options={memYearOptions} />
              <Select label="Campus" value={memCampus} onChange={v => { setMemCampus(v); setLoaded(false); }} options={memCampusOptions} />
            </FilterBar>
            <FilterBar>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', width: '100%', marginBottom: 4 }}>
                Registration Filters
              </div>
              <Select label="Term" value={term} onChange={v => { setTerm(v); setLoaded(false); }} options={termOptions} />
              <Select label="Campus" value={regCampus} onChange={v => { setRegCampus(v); setLoaded(false); }} options={campusOptions} />
              <Select label="Lecture Type" value={lectureType} onChange={v => { setLectureType(v); setLoaded(false); }} options={ltOptions} />
              <DatePicker label="Cutoff Date" value={cutoffDate} onChange={v => { setCutoffDate(v); setLoaded(false); }} />
            </FilterBar>
          </div>

          <FilterBar>
            <Select
              label="Show"
              value={showFilter}
              onChange={v => { setShowFilter(v); setLoaded(false); }}
              options={['All', 'Members', 'NonMembers'].map(v => ({ value: v, label: v }))}
            />
            <div style={{ alignSelf: 'flex-end' }}>
              <button onClick={handleLoad} style={{
                background: 'var(--accent-blue)', border: 'none', borderRadius: 6,
                color: '#fff', padding: '7px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Load List
              </button>
            </div>
            {loaded && (
              <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
                <ExportButton onClick={handleExport} disabled={listRecs.length === 0} />
              </div>
            )}
          </FilterBar>

          {loaded ? (
            <>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Search name, email, class title…"
                  style={{ flex: 1, maxWidth: 480 }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {listRecs.length.toLocaleString()} records
                </span>
              </div>
              <DataTable cols={cols} rows={listRecs} compact stickyHeader emptyMsg="No registrations match the selected filters." />
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>
              Set filters and click <strong style={{ color: 'var(--accent-blue)' }}>Load List</strong> to view registrations.
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
