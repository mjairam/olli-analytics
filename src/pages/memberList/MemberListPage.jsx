import { useState, useMemo, useCallback } from 'react';
import { useData } from '../../context/DataContext';
import { PageShell, FilterBar, Select, DatePicker, SectionTitle, DataTable, ExportButton } from '../../components/ui';
import { SearchInput } from '../../components/ui/FilterBar';
import { toCSV, downloadCSV } from '../../lib/parse';

function dedup(recs) {
  const map = {};
  recs.forEach(r => {
    if (!map[r.profileId] || r.enrollDate < map[r.profileId].enrollDate) {
      map[r.profileId] = r;
    }
  });
  return Object.values(map);
}

export default function MemberListPage() {
  const { data } = useData();

  const [primaryYear, setPrimaryYear] = useState('');
  const [compareYear, setCompareYear] = useState('');
  const [campus, setCampus] = useState('ALL');
  const [cutoffDate, setCutoffDate] = useState('');
  const [listType, setListType] = useState('All');
  const [search, setSearch] = useState('');
  const [loaded, setLoaded] = useState(false);

  const yearOptions = useMemo(() => {
    if (!data) return [{ value: '', label: '— Select —' }];
    return [{ value: '', label: '— Select —' }, ...data.memYears.map(y => ({ value: y, label: y }))];
  }, [data]);

  const campusOptions = useMemo(() => {
    if (!data) return [{ value: 'ALL', label: 'All Campuses' }];
    const campusSet = new Set(data.memRecs.map(r => r.campus).filter(Boolean));
    return [{ value: 'ALL', label: 'All Campuses' }, ...[...campusSet].sort().map(c => ({ value: c, label: c }))];
  }, [data]);

  const listRows = useMemo(() => {
    if (!data || !primaryYear) return [];

    const primaryRecs = dedup(data.memRecs.filter(r => {
      if (r.year !== primaryYear) return false;
      if (campus !== 'ALL' && r.campus !== campus) return false;
      if (cutoffDate && r.enrollDate > cutoffDate) return false;
      return true;
    }));

    const compareRecs = compareYear
      ? dedup(data.memRecs.filter(r => r.year === compareYear && (campus === 'ALL' || r.campus === campus)))
      : [];

    const compareIds = new Set(compareRecs.map(r => r.profileId));
    const primaryIds = new Set(primaryRecs.map(r => r.profileId));

    let rows = primaryRecs.map(r => ({
      ...r,
      status: compareIds.has(r.profileId) ? 'Returning' : 'New',
    }));

    // Also include lapsed if requested
    if (listType === 'Lapsed') {
      rows = compareRecs
        .filter(r => !primaryIds.has(r.profileId))
        .map(r => ({ ...r, status: 'Lapsed' }));
    } else if (listType === 'New') {
      rows = rows.filter(r => r.status === 'New');
    } else if (listType === 'Returning') {
      rows = rows.filter(r => r.status === 'Returning');
    }

    return rows;
  }, [data, primaryYear, compareYear, campus, cutoffDate, listType]);

  const filteredRows = useMemo(() => {
    if (!search) return listRows;
    const q = search.toLowerCase();
    return listRows.filter(r =>
      r.firstName?.toLowerCase().includes(q) ||
      r.lastName?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      String(r.profileId || '').includes(q)
    );
  }, [listRows, search]);

  const handleLoad = useCallback(() => setLoaded(true), []);

  const handleExport = () => {
    const cols = [
      { key: 'profileId', label: 'ProfileId' },
      { key: 'firstName', label: 'First Name' },
      { key: 'lastName', label: 'Last Name' },
      { key: 'email', label: 'Email' },
      { key: 'campus', label: 'Campus' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'zip', label: 'Zip' },
      { key: 'county', label: 'County' },
      { key: 'enrollDate', label: 'Enroll Date' },
      { key: 'sku', label: 'SKU' },
      { key: 'status', label: 'Status' },
    ];
    downloadCSV(toCSV(filteredRows, cols), `member_list_${primaryYear}_${listType}.csv`);
  };

  const cols = [
    { key: 'profileId', label: 'ID', headerStyle: { minWidth: 80 } },
    { key: 'firstName', label: 'First' },
    { key: 'lastName', label: 'Last' },
    { key: 'email', label: 'Email' },
    { key: 'campus', label: 'Campus' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'enrollDate', label: 'Enroll Date', align: 'right' },
    {
      key: 'status', label: 'Status', align: 'center',
      color: (v) => v === 'New' ? 'var(--accent-green)' : v === 'Lapsed' ? 'var(--accent-red)' : 'var(--accent-blue)',
    },
  ];

  return (
    <PageShell title="Member List">
      {data && (
        <>
          <FilterBar>
            <Select label="Primary Year" value={primaryYear} onChange={v => { setPrimaryYear(v); setLoaded(false); }} options={yearOptions} />
            <Select label="Compare Year" value={compareYear} onChange={v => { setCompareYear(v); setLoaded(false); }} options={[{ value: '', label: 'None' }, ...data.memYears.map(y => ({ value: y, label: y }))]} />
            <Select label="Campus" value={campus} onChange={v => { setCampus(v); setLoaded(false); }} options={campusOptions} />
            <DatePicker label="Cutoff Date" value={cutoffDate} onChange={v => { setCutoffDate(v); setLoaded(false); }} />
            <Select
              label="List Type"
              value={listType}
              onChange={v => { setListType(v); setLoaded(false); }}
              options={['All', 'New', 'Returning', 'Lapsed'].map(v => ({ value: v, label: v }))}
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
                <ExportButton onClick={handleExport} disabled={filteredRows.length === 0} />
              </div>
            )}
          </FilterBar>

          {!primaryYear ? (
            <div style={{ color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>
              Select a membership year and click Load List.
            </div>
          ) : loaded ? (
            <>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Search name, email, or ID…"
                  style={{ flex: 1, maxWidth: 400 }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {filteredRows.length.toLocaleString()} of {listRows.length.toLocaleString()} records
                </span>
              </div>
              <DataTable cols={cols} rows={filteredRows} compact stickyHeader emptyMsg="No members match the selected filters." />
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>
              Set filters and click <strong style={{ color: 'var(--accent-blue)' }}>Load List</strong> to view members.
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
