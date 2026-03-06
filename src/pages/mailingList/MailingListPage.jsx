import { useState, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { SectionHeader } from '../../components/SectionHeader';

// ── Helpers ───────────────────────────────────────────────────────────────────

function readExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Case-insensitive key lookup helper
function findCol(row, patterns) {
  if (!row) return null;
  const keys = Object.keys(row);
  for (const pat of patterns) {
    const found = keys.find(k => pat.test(k));
    if (found) return found;
  }
  return null;
}

const PROFILE_PATTERNS  = [/^profile.?id$/i, /^profileid$/i, /^customer.?no$/i, /^id$/i, /^member.?id$/i];
const FNAME_PATTERNS    = [/^first.?name$/i, /^fname$/i, /^first$/i];
const LNAME_PATTERNS    = [/^last.?name$/i, /^lname$/i, /^last$/i];
const EMAIL_PATTERNS    = [/^email/i, /^e.mail/i];
const SEASONAL_PATTERNS = [/^seasonal$/i, /^is.?seasonal$/i, /^seasonal.?address$/i];

// Address patterns — primary
const ADDR1_PATTERNS  = [/^address1?$/i, /^addr1?$/i, /^street$/i, /^home.?addr/i];
const CITY_PATTERNS   = [/^city$/i, /^home.?city$/i];
const STATE_PATTERNS  = [/^state$/i, /^home.?state$/i];
const ZIP_PATTERNS    = [/^zip$/i, /^postal/i, /^home.?zip$/i];

// Address patterns — seasonal / away
const SADDR1_PATTERNS = [/^seasonal.?addr/i, /^away.?addr/i, /^alt.?addr/i, /^address2/i, /^addr2/i];
const SCITY_PATTERNS  = [/^seasonal.?city/i, /^away.?city/i, /^alt.?city/i, /^city2/i];
const SSTATE_PATTERNS = [/^seasonal.?state/i, /^away.?state/i, /^alt.?state/i, /^state2/i];
const SZIP_PATTERNS   = [/^seasonal.?zip/i, /^away.?zip/i, /^alt.?zip/i, /^zip2/i];

function detectCols(row) {
  return {
    profileId: findCol(row, PROFILE_PATTERNS),
    firstName: findCol(row, FNAME_PATTERNS),
    lastName:  findCol(row, LNAME_PATTERNS),
    email:     findCol(row, EMAIL_PATTERNS),
    seasonal:  findCol(row, SEASONAL_PATTERNS),
    addr1:     findCol(row, ADDR1_PATTERNS),
    city:      findCol(row, CITY_PATTERNS),
    state:     findCol(row, STATE_PATTERNS),
    zip:       findCol(row, ZIP_PATTERNS),
    sAddr1:    findCol(row, SADDR1_PATTERNS),
    sCity:     findCol(row, SCITY_PATTERNS),
    sState:    findCol(row, SSTATE_PATTERNS),
    sZip:      findCol(row, SZIP_PATTERNS),
  };
}

function isSeasonal(val) {
  if (!val) return false;
  return /^y(es)?$/i.test(String(val).trim());
}

// ── File Upload Widget ────────────────────────────────────────────────────────

function FileUploadCard({ icon, title, description, color, colorBg, colorBorder, onLoad, fileName, rowCount }) {
  const [loading, setLoading] = useState(false);

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const rows = await readExcel(file);
      onLoad(rows, file.name);
    } catch {
      alert('Failed to read file. Make sure it is a valid .xlsx file.');
    }
    setLoading(false);
    e.target.value = '';
  };

  return (
    <div style={{
      border: `1px solid ${fileName ? colorBorder : 'var(--border)'}`,
      borderRadius: 12,
      padding: '24px',
      background: fileName ? colorBg : 'var(--bg-surface)',
      flex: 1,
      minWidth: 0,
      transition: 'border-color 0.2s',
    }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
      <div className="serif" style={{ fontSize: 16, color: 'var(--text-primary)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>{description}</div>

      {fileName ? (
        <div>
          <div style={{ fontSize: 11, color: color, marginBottom: 8 }}>
            ● {fileName} &mdash; {rowCount.toLocaleString()} rows
          </div>
          <label style={{ fontSize: 11, color: 'var(--accent-blue)', cursor: 'pointer', textDecoration: 'underline' }}>
            Replace file
            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleChange} />
          </label>
        </div>
      ) : (
        <label style={{
          display: 'inline-block',
          background: color,
          border: 'none',
          borderRadius: 7,
          color: '#fff',
          padding: '8px 18px',
          fontSize: 12,
          cursor: loading ? 'wait' : 'pointer',
          fontFamily: 'inherit',
        }}>
          {loading ? 'Loading…' : 'Upload .xlsx'}
          <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleChange} disabled={loading} />
        </label>
      )}
    </div>
  );
}

// ── Column Mapping UI ─────────────────────────────────────────────────────────

function ColSelect({ label, value, options, onChange, optional }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        {label}{optional && <span style={{ color: 'var(--border)', marginLeft: 4 }}>(optional)</span>}
      </label>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value || null)}
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          padding: '6px 10px',
          fontSize: 12,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        <option value="">— not mapped —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MailingListPage() {
  const [regRows, setRegRows] = useState(null);
  const [regFile, setRegFile] = useState('');
  const [cfRows, setCfRows] = useState(null);
  const [cfFile, setCfFile] = useState('');

  // Column mappings (auto-detected then user-adjustable)
  const [regCols, setRegCols] = useState({});
  const [cfCols, setCfCols] = useState({});
  const [showColMap, setShowColMap] = useState(false);

  // Mailing options
  const [seasonalChoice, setSeasonalChoice] = useState('fl'); // 'fl' = use FL/primary addr, 'away' = use seasonal/away addr
  const [campus, setCampus] = useState('all'); // 'all', 'boca', 'jupiter'

  const [result, setResult] = useState(null);

  const handleRegLoad = (rows, name) => {
    setRegRows(rows);
    setRegFile(name);
    setResult(null);
    if (rows.length > 0) {
      const detected = detectCols(rows[0]);
      setRegCols(detected);
    }
  };

  const handleCfLoad = (rows, name) => {
    setCfRows(rows);
    setCfFile(name);
    setResult(null);
    if (rows.length > 0) {
      const detected = detectCols(rows[0]);
      setCfCols(detected);
    }
  };

  const regColumns = useMemo(() => (regRows && regRows[0] ? Object.keys(regRows[0]) : []), [regRows]);
  const cfColumns  = useMemo(() => (cfRows  && cfRows[0]  ? Object.keys(cfRows[0])  : []), [cfRows]);

  const bothLoaded = regRows && cfRows;

  const buildMailingList = useCallback(() => {
    if (!regRows || !cfRows) return;

    // Build a map from profileId → custom fields row
    const cfMap = {};
    const cfId = cfCols.profileId;
    if (!cfId) { alert('Could not find Profile ID column in Custom Fields file. Please map it manually.'); return; }
    cfRows.forEach(row => {
      const id = String(row[cfId] ?? '').trim();
      if (id) cfMap[id] = row;
    });

    // Unique members from registrations
    const seen = new Set();
    const regId = regCols.profileId;
    if (!regId) { alert('Could not find Profile ID column in Registrations file. Please map it manually.'); return; }

    const members = [];
    regRows.forEach(row => {
      const id = String(row[regId] ?? '').trim();
      if (!id || seen.has(id)) return;
      seen.add(id);
      const cf = cfMap[id] || {};

      const seasonal = isSeasonal(cf[cfCols.seasonal]);

      // Decide which address to use
      let useAway = seasonal && seasonalChoice === 'away';

      const addr1  = useAway ? (cf[cfCols.sAddr1] || '') : (cf[cfCols.addr1] || row[regCols.addr1] || '');
      const city   = useAway ? (cf[cfCols.sCity]  || '') : (cf[cfCols.city]  || row[regCols.city]  || '');
      const state  = useAway ? (cf[cfCols.sState] || '') : (cf[cfCols.state] || row[regCols.state] || '');
      const zip    = useAway ? (cf[cfCols.sZip]   || '') : (cf[cfCols.zip]   || row[regCols.zip]   || '');

      // Campus filter by state
      if (campus === 'boca' && state.trim().toUpperCase() !== 'FL') return;
      if (campus === 'jupiter' && state.trim().toUpperCase() === 'FL') return;

      members.push({
        ProfileID:    id,
        FirstName:    row[regCols.firstName] || cf[cfCols.firstName] || '',
        LastName:     row[regCols.lastName]  || cf[cfCols.lastName]  || '',
        Email:        row[regCols.email]     || cf[cfCols.email]     || '',
        Seasonal:     seasonal ? 'Yes' : 'No',
        AddressUsed:  useAway ? 'Away/Seasonal' : 'Primary',
        Address:      addr1,
        City:         city,
        State:        state,
        Zip:          zip,
      });
    });

    setResult(members);
  }, [regRows, cfRows, regCols, cfCols, seasonalChoice, campus]);

  const handleExport = useCallback(() => {
    if (!result) return;
    const ws = XLSX.utils.json_to_sheet(result);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mailing List');
    const label = campus !== 'all' ? `_${campus}` : '';
    const addr  = seasonalChoice === 'away' ? '_away-addr' : '_fl-addr';
    XLSX.writeFile(wb, `mailing_list${label}${addr}.xlsx`);
  }, [result, campus, seasonalChoice]);

  const seasonalCount  = result ? result.filter(r => r.Seasonal === 'Yes').length : 0;
  const standardCount  = result ? result.filter(r => r.Seasonal === 'No').length  : 0;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SectionHeader
        title="Mailing List Creation"
        subtitle="Combine registrations + custom fields to build targeted mailing lists"
      />

      <div style={{ padding: '32px', maxWidth: 960, width: '100%' }}>

        {/* Step 1: Upload files */}
        <div style={{ marginBottom: 32 }}>
          <StepLabel n={1} label="Upload your two spreadsheets" />
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <FileUploadCard
              icon="📋"
              title="Registrations"
              description="Your main registrations export. Used to determine current members (unique by Profile ID)."
              color="var(--accent-blue)"
              colorBg="rgba(74,158,255,0.07)"
              colorBorder="rgba(74,158,255,0.3)"
              onLoad={handleRegLoad}
              fileName={regFile}
              rowCount={regRows?.length ?? 0}
            />
            <FileUploadCard
              icon="🏷️"
              title="Custom Fields"
              description="Custom fields export with Profile ID, Seasonal (Yes/No), and address fields."
              color="var(--accent-green)"
              colorBg="rgba(63,185,80,0.07)"
              colorBorder="rgba(63,185,80,0.3)"
              onLoad={handleCfLoad}
              fileName={cfFile}
              rowCount={cfRows?.length ?? 0}
            />
          </div>
        </div>

        {/* Step 2: Column mapping (collapsible) */}
        {bothLoaded && (
          <div style={{ marginBottom: 32 }}>
            <StepLabel n={2} label="Verify column mapping" />
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              overflow: 'hidden',
            }}>
              <button
                onClick={() => setShowColMap(v => !v)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  padding: '14px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              >
                <span>
                  Auto-detected columns &mdash;{' '}
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    Reg: Profile ID = <code style={{ color: 'var(--accent-blue)' }}>{regCols.profileId || '?'}</code>
                    &nbsp;&nbsp;CF: Profile ID = <code style={{ color: 'var(--accent-green)' }}>{cfCols.profileId || '?'}</code>
                    &nbsp;&nbsp;Seasonal = <code style={{ color: 'var(--accent-green)' }}>{cfCols.seasonal || '?'}</code>
                  </span>
                </span>
                <span style={{ color: 'var(--text-muted)' }}>{showColMap ? '▲' : '▼'} Edit</span>
              </button>

              {showColMap && (
                <div style={{ padding: '16px 18px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    {/* Registrations columns */}
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                        Registrations file
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <ColSelect label="Profile ID *" value={regCols.profileId} options={regColumns} onChange={v => setRegCols(p => ({...p, profileId: v}))} />
                        <ColSelect label="First Name" value={regCols.firstName} options={regColumns} onChange={v => setRegCols(p => ({...p, firstName: v}))} optional />
                        <ColSelect label="Last Name"  value={regCols.lastName}  options={regColumns} onChange={v => setRegCols(p => ({...p, lastName: v}))}  optional />
                        <ColSelect label="Email"      value={regCols.email}     options={regColumns} onChange={v => setRegCols(p => ({...p, email: v}))}     optional />
                      </div>
                    </div>
                    {/* Custom Fields columns */}
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                        Custom Fields file
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <ColSelect label="Profile ID *"    value={cfCols.profileId} options={cfColumns} onChange={v => setCfCols(p => ({...p, profileId: v}))} />
                        <ColSelect label="Seasonal (Y/N)"  value={cfCols.seasonal}  options={cfColumns} onChange={v => setCfCols(p => ({...p, seasonal: v}))}  optional />
                        <ColSelect label="Home Address"    value={cfCols.addr1}     options={cfColumns} onChange={v => setCfCols(p => ({...p, addr1: v}))}     optional />
                        <ColSelect label="Home City"       value={cfCols.city}      options={cfColumns} onChange={v => setCfCols(p => ({...p, city: v}))}      optional />
                        <ColSelect label="Home State"      value={cfCols.state}     options={cfColumns} onChange={v => setCfCols(p => ({...p, state: v}))}     optional />
                        <ColSelect label="Home ZIP"        value={cfCols.zip}       options={cfColumns} onChange={v => setCfCols(p => ({...p, zip: v}))}       optional />
                        <ColSelect label="Away Address"    value={cfCols.sAddr1}    options={cfColumns} onChange={v => setCfCols(p => ({...p, sAddr1: v}))}    optional />
                        <ColSelect label="Away City"       value={cfCols.sCity}     options={cfColumns} onChange={v => setCfCols(p => ({...p, sCity: v}))}     optional />
                        <ColSelect label="Away State"      value={cfCols.sState}    options={cfColumns} onChange={v => setCfCols(p => ({...p, sState: v}))}    optional />
                        <ColSelect label="Away ZIP"        value={cfCols.sZip}      options={cfColumns} onChange={v => setCfCols(p => ({...p, sZip: v}))}      optional />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Mailing options */}
        {bothLoaded && (
          <div style={{ marginBottom: 32 }}>
            <StepLabel n={3} label="Configure this mailing" />
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>

              {/* Seasonal address toggle */}
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '18px 20px',
                flex: 1,
                minWidth: 240,
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                  For seasonal members, use their…
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { val: 'fl',   label: 'Florida / Primary address', sub: 'They are currently in FL (Boca/Jupiter mailing)' },
                    { val: 'away', label: 'Away / Seasonal address',    sub: 'They are up north — mail to their other address' },
                  ].map(opt => (
                    <label key={opt.val} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      cursor: 'pointer',
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: seasonalChoice === opt.val ? 'rgba(74,158,255,0.1)' : 'transparent',
                      border: `1px solid ${seasonalChoice === opt.val ? 'rgba(74,158,255,0.4)' : 'var(--border)'}`,
                      transition: 'all 0.1s',
                    }}>
                      <input
                        type="radio"
                        name="seasonal"
                        value={opt.val}
                        checked={seasonalChoice === opt.val}
                        onChange={() => { setSeasonalChoice(opt.val); setResult(null); }}
                        style={{ marginTop: 2, accentColor: 'var(--accent-blue)' }}
                      />
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{opt.sub}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Campus / location filter */}
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '18px 20px',
                flex: 1,
                minWidth: 240,
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Which catalog are you preparing?
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { val: 'all',    label: 'All members',            sub: 'Include everyone regardless of address' },
                    { val: 'boca',   label: 'Boca catalog (FL only)', sub: 'Only members with a Florida address' },
                    { val: 'jupiter',label: 'Jupiter catalog (out-of-state)', sub: 'Members with a non-FL address' },
                  ].map(opt => (
                    <label key={opt.val} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      cursor: 'pointer',
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: campus === opt.val ? 'rgba(63,185,80,0.1)' : 'transparent',
                      border: `1px solid ${campus === opt.val ? 'rgba(63,185,80,0.4)' : 'var(--border)'}`,
                      transition: 'all 0.1s',
                    }}>
                      <input
                        type="radio"
                        name="campus"
                        value={opt.val}
                        checked={campus === opt.val}
                        onChange={() => { setCampus(opt.val); setResult(null); }}
                        style={{ marginTop: 2, accentColor: 'var(--accent-green)' }}
                      />
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{opt.sub}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Build + Export */}
        {bothLoaded && (
          <div style={{ marginBottom: 32 }}>
            <StepLabel n={4} label="Build mailing list" />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={buildMailingList} style={{
                background: 'var(--accent-blue)', border: 'none', borderRadius: 8,
                color: '#fff', padding: '11px 28px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Build List →
              </button>
              {result && (
                <button onClick={handleExport} style={{
                  background: 'var(--accent-green)', border: 'none', borderRadius: 8,
                  color: '#fff', padding: '11px 28px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  ↓ Export Excel ({result.length.toLocaleString()} rows)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Results preview */}
        {result && (
          <div>
            {/* Summary stats */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              {[
                { label: 'Total members',   value: result.length,    color: 'var(--accent-blue)' },
                { label: 'Seasonal',        value: seasonalCount,    color: 'var(--accent-yellow)' },
                { label: 'Non-seasonal',    value: standardCount,    color: 'var(--text-muted)' },
              ].map(s => (
                <div key={s.label} style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '12px 18px',
                  textAlign: 'center',
                  minWidth: 120,
                }}>
                  <div style={{ fontSize: 22, color: s.color, fontVariantNumeric: 'tabular-nums' }}>
                    {s.value.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Table preview (first 50) */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '10px 16px',
                borderBottom: '1px solid var(--border)',
                fontSize: 11,
                color: 'var(--text-muted)',
              }}>
                Preview — first {Math.min(50, result.length)} of {result.length.toLocaleString()} records
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-primary)' }}>
                      {Object.keys(result[0] || {}).map(col => (
                        <th key={col} style={{
                          padding: '8px 12px',
                          textAlign: 'left',
                          color: 'var(--text-muted)',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          borderBottom: '1px solid var(--border)',
                        }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.slice(0, 50).map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {Object.values(row).map((val, j) => (
                          <td key={j} style={{
                            padding: '7px 12px',
                            color: j === 4 /* Seasonal */ && val === 'Yes' ? 'var(--accent-yellow)' : 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepLabel({ n, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <div style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: 'var(--accent-blue)',
        color: '#fff',
        fontSize: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        flexShrink: 0,
      }}>
        {n}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{label}</div>
    </div>
  );
}
